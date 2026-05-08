"""Playwright scraper cho Review 360° /my-work.

Pure logic — không import Flask. Caller cấp `profile_dir`.

Dùng **persistent Chromium context** thay vì storage_state file vì Firebase Auth
lưu token trong IndexedDB (Playwright storage_state không capture IndexedDB).

Flow:
    login_persist()  → mở Chromium headed với profile_dir, user login tay,
                       đóng tab → profile tự lưu cookies + localStorage + IndexedDB.
    scrape_my_work() → headless reuse profile_dir, evaluate JS extract task list.
    dump_html()      → debug — lưu raw DOM để inspect selector.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import (
    BrowserContext,
    Playwright,
    TimeoutError as PWTimeout,
    sync_playwright,
)

from ..bridge_config import (
    DEFAULT_UA,
    LOGIN_DONE_URL_FRAGMENT,
    LOGIN_TIMEOUT_MS,
    MY_WORK_URL,
    REVIEW_360_URL,
    SCRAPE_TIMEOUT_MS,
)

logger = logging.getLogger(__name__)


# ── Extract JS ────────────────────────────────────────────────────────────────
# Heuristic: tìm card / row có chứa text giống task. DOM Review 360° có thể đổi,
# JS này tách rời để dễ tinh chỉnh không cần restart Flask (chỉ trong --dev).
_EXTRACT_BODY = r"""
  // Review 360° dùng MUI grid: header cells có [draggable="true"],
  // data rows là siblings của header row trong cùng grid container.

  const norm = s => (s || '').toString().trim();

  const headerCells = Array.from(root.querySelectorAll('[draggable="true"]'));
  if (headerCells.length === 0) {
    return {
      url: location.href, title: document.title,
      extractedAt: new Date().toISOString(),
      error: 'no header cells [draggable=true] found',
      count: 0, tasks: [],
    };
  }

  const headerRow = headerCells[0].parentElement;
  const headers = headerCells.map(c => norm(c.textContent));
  const N = headers.length;

  const all = Array.from(root.querySelectorAll('*'));
  const childCounts = {};
  for (const el of all) {
    const n = el.children.length;
    if (n >= 3 && n <= 30) childCounts[n] = (childCounts[n] || 0) + 1;
  }

  let bestWidth = N, bestCount = 0;
  for (let w = N; w <= N + 4; w++) {
    if ((childCounts[w] || 0) > bestCount) {
      bestCount = childCounts[w]; bestWidth = w;
    }
  }

  const dataRows = all.filter(el => {
    if (el === headerRow) return false;
    if (headerRow.contains(el)) return false;
    if (el.contains(headerRow)) return false;
    if (el.children.length !== bestWidth) return false;
    if (el.querySelectorAll('[draggable="true"]').length > 0) return false;
    return true;
  });

  let offset = Math.max(0, bestWidth - N);
  if (dataRows.length > 2) {
    const offsets = dataRows.slice(0, Math.min(20, dataRows.length)).map(row => {
      const cs = Array.from(row.children).map(c => norm(c.textContent));
      let i = 0;
      while (i < cs.length && /^\d+$/.test(cs[i])) i++;
      return i;
    });
    const tally = {};
    offsets.forEach(o => { tally[o] = (tally[o] || 0) + 1; });
    let best = 0, bestN = 0;
    for (const [o, n] of Object.entries(tally)) {
      if (n > bestN) { best = +o; bestN = n; }
    }
    offset = best;
  }

  const parseDeadline = (s) => {
    if (!s || s === '-') return '';
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return s;
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };
  const cleanDash = (s) => (s === '-' ? '' : s);

  const tasks = [];
  for (const row of dataRows) {
    const cells = Array.from(row.children).map(c => norm(c.textContent));
    const aligned = cells.slice(offset);
    if (aligned.length < 3) continue;
    const nonEmpty = aligned.filter(c => c && c !== '-').length;
    if (nonEmpty < 2) continue;

    const obj = { _cells: cells, _offset: offset };
    headers.forEach((h, i) => { if (h) obj[h] = aligned[i] ?? ''; });

    const title = obj['Task Name'] || '';
    if (!title || title === '-') continue;

    tasks.push({
      id: title,
      title,
      type: cleanDash(obj['Type']),
      description: cleanDash(obj['Description']),
      status: cleanDash(obj['Status']) || 'Backlog',
      module: cleanDash(obj['Project']) || cleanDash(obj['Module']),
      assignee: cleanDash(obj['Assignee']),
      time: cleanDash(obj['Time']),
      deadline: parseDeadline(obj['Deadline']),
      priority: cleanDash(obj['Priority']) || 'Medium',
      version: cleanDash(obj['Version']),
      sprint: cleanDash(obj['Sprint']),
      quality: cleanDash(obj['Quality']),
      features: cleanDash(obj['Features']),
      deadlineStatus: cleanDash(obj['Deadline Status']),
      sp: 0,
      _row: obj,
    });
  }

  return {
    url: location.href, title: document.title,
    extractedAt: new Date().toISOString(),
    headers, childCounts,
    count: tasks.length, tasks,
  };
"""

EXTRACT_JS = "(() => { const root = document; " + _EXTRACT_BODY + " })()"
EXTRACT_JS_DIALOG = (
    "(() => { const root = document.querySelector('[role=\"dialog\"]') || document; "
    + _EXTRACT_BODY + " })()"
)

# Project Overview dialog dùng HTML <table> thật, khác cấu trúc /my-work.
# Có nhiều tables (1 theo category + 7 task tables + 1 team summary).
# Identify task tables bằng header chứa "Task Name" + "Task ID".
EXTRACT_JS_OVERVIEW = r"""
(() => {
  const norm = s => (s || '').toString().replace(/\s+/g, ' ').trim();
  const dlg = document.querySelector('.MuiDialog-paper');
  if (!dlg) return { error: 'no dialog', tasks: [], count: 0 };

  const tables = Array.from(dlg.querySelectorAll('table'));
  const TASK_HEADERS = ['Task Name', 'Task ID', 'Status', 'Assignee'];

  // Tìm task tables: thead chứa cả "Task Name" và "Task ID"
  const taskTables = tables.filter(t => {
    const heads = Array.from(t.querySelectorAll('thead th, thead td')).map(c => norm(c.textContent));
    return TASK_HEADERS.every(h => heads.some(x => x.includes(h)));
  });

  if (taskTables.length === 0) {
    return { error: 'no task tables found', tableCount: tables.length, tasks: [], count: 0 };
  }

  const parseDeadline = (s) => {
    if (!s || s === '-') return '';
    // DD/MM/YYYY hoặc DD-MM-YYYY
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    // DD-MM (no year — dùng năm hiện tại)
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (m) {
      const y = new Date().getFullYear();
      return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    }
    return s;
  };
  const cleanDash = (s) => (s === '-' ? '' : s);

  const tasks = [];
  for (const tbl of taskTables) {
    const heads = Array.from(tbl.querySelectorAll('thead th, thead td')).map(c => norm(c.textContent));
    const rows = Array.from(tbl.querySelectorAll('tbody tr'));
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td, th')).map(c => norm(c.textContent));
      if (cells.length < 4) continue;
      const obj = {};
      heads.forEach((h, i) => { if (h) obj[h] = cells[i] ?? ''; });

      const title = obj['Task Name'] || '';
      if (!title || title === '-') continue;

      tasks.push({
        id: obj['Task ID'] || title,
        title,
        type: cleanDash(obj['Type']),
        description: cleanDash(obj['Description']),
        status: cleanDash(obj['Status']) || 'Backlog',
        module: '',
        assignee: cleanDash(obj['Assignee']),
        time: cleanDash(obj['Time']),
        deadline: parseDeadline(obj['Deadline']),
        priority: cleanDash(obj['Priority']) || 'Medium',
        version: '',
        sprint: '',
        quality: '',
        features: cleanDash(obj['Features']),
        deadlineStatus: '',
        sp: 0,
        _row: { _cells: cells, _heads: heads },
      });
    }
  }

  return {
    url: location.href,
    title: document.title,
    extractedAt: new Date().toISOString(),
    taskTables: taskTables.length,
    count: tasks.length,
    tasks,
  };
})()
"""



# ── Context lifecycle ─────────────────────────────────────────────────────────


@contextmanager
def _persistent_context(p: Playwright, profile_dir: str, headless: bool):
    """Open persistent Chromium context — giữ IndexedDB cho Firebase Auth."""
    Path(profile_dir).mkdir(parents=True, exist_ok=True)
    ctx: BrowserContext = p.chromium.launch_persistent_context(
        user_data_dir=profile_dir,
        headless=headless,
        user_agent=DEFAULT_UA,
        viewport={"width": 1440, "height": 900},
        # Mượt hơn cho Firebase: không tắt JS, không block resource
    )
    try:
        yield ctx
    finally:
        ctx.close()


def _profile_has_data(profile_dir: str) -> bool:
    """Check profile dir có Cookies/IndexedDB tồn tại — proxy cho 'đã login'."""
    p = Path(profile_dir)
    if not p.exists():
        return False
    # Chromium profile structure: Default/IndexedDB, Default/Cookies (SQLite)
    return (p / "Default" / "IndexedDB").exists() or (p / "Default" / "Cookies").exists()


# ── Public API ────────────────────────────────────────────────────────────────


def login_persist(profile_dir: str) -> dict:
    """Mở browser headed cho user login. Profile auto-saved khi context close."""
    with sync_playwright() as p:
        with _persistent_context(p, profile_dir, headless=False) as ctx:
            page = ctx.new_page()
            page.goto(REVIEW_360_URL, wait_until="domcontentloaded")
            logger.info("Waiting for user login (up to %ds)...", LOGIN_TIMEOUT_MS // 1000)
            try:
                page.wait_for_url(f"**{LOGIN_DONE_URL_FRAGMENT}**", timeout=LOGIN_TIMEOUT_MS)
                logger.info("Login confirmed at %s", page.url)
            except PWTimeout:
                logger.warning("Login wait timed out — saving profile anyway")
        # Context đã close → Chromium tự flush profile lên disk
    return {"ok": True, "saved_to": profile_dir, "has_data": _profile_has_data(profile_dir)}


def _ensure_profile(profile_dir: str) -> None:
    if not _profile_has_data(profile_dir):
        raise RuntimeError(
            f"profile not found / empty at {profile_dir}. Call /login first."
        )


def _goto_my_work(page) -> dict:
    """Navigate /my-work + đợi table render. Best-effort."""
    page.goto(MY_WORK_URL, wait_until="domcontentloaded", timeout=SCRAPE_TIMEOUT_MS)
    try:
        page.wait_for_selector('[draggable="true"]', state="attached", timeout=20000)
    except PWTimeout:
        logger.warning("initial table headers not found — continuing")
    page.wait_for_timeout(1500)
    body_len = page.evaluate("() => (document.body && document.body.innerText.length) || 0")
    headers = page.evaluate("() => document.querySelectorAll('[draggable=\"true\"]').length")
    return {
        "url": page.url,
        "title": page.title(),
        "body_chars": body_len,
        "header_cells": headers,
    }


def _open_overview_dialog(page) -> None:
    """Click button "Project Overview" để mở dialog."""
    page.get_by_role("button", name="Project Overview").first.click(timeout=10000)
    # Đợi dialog mount
    page.wait_for_selector('.MuiDialog-paper[role="dialog"]', timeout=10000)
    page.wait_for_timeout(600)


def _close_popover(page) -> None:
    """Đợi MuiPopover đóng hẳn (backdrop biến mất)."""
    try:
        page.wait_for_function(
            "() => !document.querySelector('.MuiPopover-root')",
            timeout=3000,
        )
    except PWTimeout:
        logger.warning("popover did not close — pressing Escape")
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)


_ITEM_SELECTOR = ".MuiPopover-root .MuiListItemButton-root"


def _open_project_dropdown(page) -> None:
    """Click project dropdown trong DialogTitle (button có endIcon đầu tiên)."""
    page.locator(
        '.MuiDialogTitle-root button.MuiButton-outlined:has(.MuiButton-endIcon)'
    ).first.click(timeout=5000)
    page.wait_for_selector(_ITEM_SELECTOR, timeout=5000)
    page.wait_for_timeout(400)


def _open_sprint_dropdown(page) -> None:
    """Click sprint dropdown trong DialogContent."""
    page.locator(
        '.MuiDialog-paper button.MuiButton-outlined:has(.MuiButton-endIcon)'
    ).nth(1).click(timeout=5000)
    page.wait_for_selector(_ITEM_SELECTOR, timeout=5000)
    page.wait_for_timeout(400)


def _read_dropdown_state(page) -> list[dict]:
    """Đọc state của items trong popover hiện tại."""
    return page.evaluate(
        """
        () => Array.from(document.querySelectorAll('.MuiPopover-root .MuiListItemButton-root'))
          .map(it => ({
            text: (it.innerText || '').trim(),
            checked: !!(it.querySelector('input[type="checkbox"]')?.checked),
          }))
        """
    )


def _list_projects(page) -> list[dict]:
    """Open project dropdown, return [{text, checked}]."""
    _open_project_dropdown(page)
    items = _read_dropdown_state(page)
    page.keyboard.press("Escape")
    _close_popover(page)
    return items


def _select_only_project(page, target: str) -> None:
    """Toggle dropdown sao cho CHỈ `target` được chọn."""
    _open_project_dropdown(page)
    state = _read_dropdown_state(page)
    items = page.locator(_ITEM_SELECTOR)
    for i, it in enumerate(state):
        want = (it["text"] == target)
        if it["checked"] != want:
            items.nth(i).click()
            page.wait_for_timeout(250)
    page.keyboard.press("Escape")
    _close_popover(page)
    page.wait_for_timeout(800)


def _select_first_sprint(page) -> str | None:
    """Open sprint dropdown, deselect tất cả checked, pick first real sprint."""
    try:
        _open_sprint_dropdown(page)
    except Exception:
        return None
    state = _read_dropdown_state(page)
    real = [
        (i, s) for i, s in enumerate(state)
        if "không tìm thấy" not in s["text"].lower() and s["text"]
    ]
    if not real:
        page.keyboard.press("Escape")
        _close_popover(page)
        return None

    items = page.locator(_ITEM_SELECTOR)

    # Deselect mọi sprint đang checked
    for i, s in real:
        if s["checked"]:
            items.nth(i).click()
            page.wait_for_timeout(200)

    # Re-read state để chắc chắn (DOM có thể re-order/re-render)
    state2 = _read_dropdown_state(page)
    real2 = [
        (i, s) for i, s in enumerate(state2)
        if "không tìm thấy" not in s["text"].lower() and s["text"]
    ]
    if not real2:
        page.keyboard.press("Escape")
        _close_popover(page)
        return None

    idx, target_state = real2[0]
    items.nth(idx).click()
    page.wait_for_timeout(400)
    page.keyboard.press("Escape")
    _close_popover(page)
    page.wait_for_timeout(800)
    return target_state["text"]


def _scrape_dialog_table(page) -> list[dict]:
    """Scrape Project Overview dialog table (HTML <table> based)."""
    result = page.evaluate(EXTRACT_JS_OVERVIEW)
    return result.get("tasks", []) if isinstance(result, dict) else []


def scrape_my_work(profile_dir: str) -> dict:
    """Iterate Project Overview: với mỗi project chọn first sprint → scrape table.

    Returns aggregated tasks across all projects.
    """
    _ensure_profile(profile_dir)
    with sync_playwright() as p:
        with _persistent_context(p, profile_dir, headless=True) as ctx:
            page = ctx.new_page()
            diag = _goto_my_work(page)
            if "/my-work" not in page.url:
                raise RuntimeError(
                    f"redirected to {page.url} — session expired, login again"
                )

            try:
                _open_overview_dialog(page)
            except Exception as exc:
                raise RuntimeError(f"failed to open Project Overview dialog: {exc}") from exc

            try:
                project_items = _list_projects(page)
            except Exception as exc:
                raise RuntimeError(f"failed to list projects: {exc}") from exc

            project_names = [p["text"] for p in project_items]
            logger.info("found %d projects: %s", len(project_names), project_names)

            all_tasks: list[dict] = []
            per_project: dict[str, dict] = {}
            errors: list[str] = []

            for proj in project_names:
                try:
                    _select_only_project(page, proj)
                    sprint_raw = _select_first_sprint(page)
                    # Sprint button text có thể chứa workload "\n\n42h/58h" — lấy line đầu
                    sprint = sprint_raw.splitlines()[0].strip() if sprint_raw else None
                    page.wait_for_timeout(2000)
                    rows = _scrape_dialog_table(page)
                    for r in rows:
                        r["module"] = proj  # override với project name (chuẩn xác hơn)
                        if sprint and not r.get("sprint"):
                            r["sprint"] = sprint
                        r["_project"] = proj
                    all_tasks.extend(rows)
                    per_project[proj] = {"sprint": sprint, "count": len(rows)}
                    logger.info("scraped %d tasks for %r (sprint=%r)", len(rows), proj, sprint)
                except Exception as exc:
                    msg = f"project {proj!r}: {exc}"
                    logger.warning(msg)
                    errors.append(msg)

            return {
                "url": page.url,
                "title": page.title(),
                "extractedAt": datetime.now(timezone.utc).isoformat(),
                "projects": project_names,
                "perProject": per_project,
                "errors": errors,
                "count": len(all_tasks),
                "tasks": all_tasks,
                "_diag": diag,
            }


def dump_html(profile_dir: str, output_path: str) -> dict:
    """Best-effort: lưu DOM /my-work, kèm diag."""
    _ensure_profile(profile_dir)
    with sync_playwright() as p:
        with _persistent_context(p, profile_dir, headless=True) as ctx:
            page = ctx.new_page()
            diag: dict = {}
            try:
                diag = _goto_my_work(page)
            except Exception as exc:
                logger.warning("goto failed: %s — dumping anyway", exc)
                diag = {"goto_error": str(exc), "url": page.url}
            html = page.content()
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            Path(output_path).write_text(html, encoding="utf-8")
            return {"url": page.url, "bytes": len(html), "saved_to": output_path, **diag}


def state_status(profile_dir: str) -> dict:
    """Check profile dir tồn tại + có data."""
    p = Path(profile_dir)
    if not p.exists():
        return {"exists": False}
    has_data = _profile_has_data(profile_dir)
    try:
        size = sum(f.stat().st_size for f in p.rglob("*") if f.is_file())
    except OSError:
        size = 0
    return {
        "exists": True,
        "path": str(p),
        "has_data": has_data,
        "bytes": size,
        # giữ shape cũ cho FE: cookies count không có sẵn (cần parse SQLite)
        "cookies": 1 if has_data else 0,
        "origins": 1 if has_data else 0,
    }
