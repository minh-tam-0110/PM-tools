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
import re
import threading
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
    DEBUG,
    DEFAULT_UA,
    LOGIN_DONE_URL_FRAGMENT,
    LOGIN_TIMEOUT_MS,
    MY_PROJECTS_URL,
    MY_WORK_URL,
    REVIEW_360_URL,
    SCRAPE_TIMEOUT_MS,
)

logger = logging.getLogger(__name__)

_scrape_lock = threading.Lock()
scrape_lock = _scrape_lock  # exported — callers acquire non-blocking


def _slug(s: str) -> str:
    """Stable slug for IDs: lowercase alnum, others → underscore."""
    return re.sub(r"[^a-z0-9]+", "_", (s or "").lower()).strip("_") or "x"



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
    # Đợi network idle thay vì sleep cứng — table render xong khi fetch initial data done
    try:
        page.wait_for_load_state("networkidle", timeout=5000)
    except PWTimeout:
        pass
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
    page.wait_for_selector('.MuiDialog-paper[role="dialog"]', timeout=10000)
    # Đợi table render xong thay vì sleep cứng
    try:
        page.wait_for_selector('.MuiDialog-paper table tbody tr', timeout=8000)
    except PWTimeout:
        logger.warning("dialog table rows not rendered yet")


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


def _wait_dialog_table_settle(page, timeout: int = 6000) -> None:
    """Đợi table trong dialog re-render xong sau khi đổi project/sprint.

    Strategy: poll innerHTML signature — settle khi 2 lần liên tiếp giống nhau
    và có row. Reset cờ trước mỗi lần đợi để tránh match nhầm với render cũ.
    """
    page.evaluate("() => { window.__tblSig = '__init__'; }")
    try:
        page.wait_for_function(
            """
            () => {
              const tbl = document.querySelector('.MuiDialog-paper table');
              if (!tbl) return false;
              const rows = tbl.querySelectorAll('tbody tr').length;
              if (rows === 0) return false;
              const sig = tbl.innerHTML.length + ':' + rows;
              const settled = window.__tblSig === sig;
              window.__tblSig = sig;
              return settled;
            }
            """,
            timeout=timeout,
            polling=300,
        )
    except PWTimeout:
        logger.debug("table did not settle within %dms", timeout)


def _wait_popover_stable(page) -> None:
    """Đợi popover items list ổn định (count không đổi trong 2 frames)."""
    try:
        page.wait_for_function(
            """() => {
              const items = document.querySelectorAll('.MuiPopover-root .MuiListItemButton-root');
              return items.length > 0;
            }""",
            timeout=3000,
        )
    except PWTimeout:
        pass


def _open_project_dropdown(page) -> None:
    """Click project dropdown trong DialogTitle (button có endIcon đầu tiên)."""
    page.locator(
        '.MuiDialogTitle-root button.MuiButton-outlined:has(.MuiButton-endIcon)'
    ).first.click(timeout=5000)
    page.wait_for_selector(_ITEM_SELECTOR, timeout=5000)
    _wait_popover_stable(page)


_last_sprint_popover_sig: dict = {"v": None}


def _open_sprint_dropdown(page) -> None:
    """Click sprint dropdown trong DialogContent. Đợi popover items refresh
    (so với signature lần mở trước) để tránh đọc items stale từ project trước.
    """
    page.locator(
        '.MuiDialog-paper button.MuiButton-outlined:has(.MuiButton-endIcon)'
    ).nth(1).click(timeout=5000)
    new_sig = _wait_sprint_popover_refresh(page, _last_sprint_popover_sig["v"])
    _last_sprint_popover_sig["v"] = new_sig
    _wait_popover_stable(page)


def _read_dropdown_state(page) -> list[dict]:
    """Đọc state của items trong popover hiện tại.

    `html` field giúp downstream detect status badge (e.g. chip "In Progress").
    """
    return page.evaluate(
        """
        () => Array.from(document.querySelectorAll('.MuiPopover-root .MuiListItemButton-root'))
          .map(it => ({
            text: (it.innerText || '').trim(),
            html: it.innerHTML,
            checked: !!(it.querySelector('input[type="checkbox"]')?.checked),
          }))
        """
    )


_SPRINT_NUM_RE = re.compile(r"sprint\s*(\d+)", re.I)
# Workload format trong item: "Sprint 1\n\n50h/85h" hoặc "...\n195.5h/294h"
_WORKLOAD_RE = re.compile(r"(\d+(?:\.\d+)?)\s*h\s*/\s*(\d+(?:\.\d+)?)\s*h")


def _parse_workload(text: str) -> tuple[float, float] | None:
    """Extract (used, budget) hours từ item text. Return None nếu không parse được."""
    m = _WORKLOAD_RE.search(text or "")
    if not m:
        return None
    try:
        return float(m.group(1)), float(m.group(2))
    except ValueError:
        return None


_BUCKET_UNASSIGNED_RE = re.compile(r"chưa\s*phân|unassigned|backlog", re.I)


def _first_line(text: str) -> str:
    """Lấy line đầu của item text — sprint name không kèm workload."""
    return (text or "").split("\n", 1)[0].strip()


def _sprint_num(text: str) -> int:
    """Sprint number parsed từ FIRST LINE only (tránh match số trong workload "62h").

    -1 nếu line đầu không có "Sprint N" pattern (e.g. "Hotfix 1", "[IAP] - Phase 1").
    """
    m = _SPRINT_NUM_RE.search(_first_line(text))
    return int(m.group(1)) if m else -1


def _is_unassigned_bucket(text: str) -> bool:
    """Item dạng "Chưa phân Sprint" / "Unassigned" / "Backlog" — không phải sprint thật."""
    return bool(_BUCKET_UNASSIGNED_RE.search(_first_line(text)))


def _detect_active_idx(state: list[dict]) -> int | None:
    """Detect active sprint từ workload pattern.

    Logic: sprint "đang chạy" có `0 < used < budget` (e.g. 50h/85h = đang dùng).
    Sprint hoàn thành: used == budget (e.g. 100h/100h). Sprint chưa start: 0h/0h.

    Trong các candidates incomplete:
      - Ưu tiên cái có sprint_num cao nhất (latest "Sprint N")
      - Nếu không có "Sprint N" nào → pick theo idx thấp nhất (top dropdown thường là latest)

    Bỏ qua "Chưa phân Sprint" / "Unassigned" — không phải sprint thật.
    """
    candidates: list[tuple[int, int, int]] = []  # (-has_num, -num, idx) — sort tăng dần
    for i, s in enumerate(state):
        text = s.get("text", "")
        if _is_unassigned_bucket(text):
            continue
        wl = _parse_workload(text)
        if wl is None:
            continue
        used, budget = wl
        if not (0 < used < budget):
            continue
        num = _sprint_num(text)
        # Sort key: prefer items có "Sprint N" (has_num=1) over non-numeric;
        # rồi pick num cao nhất; rồi idx thấp nhất.
        has_num = 1 if num >= 0 else 0
        candidates.append((-has_num, -num, i))
    if not candidates:
        return None
    candidates.sort()
    return candidates[0][2]


def _wait_sprint_popover_refresh(page, prev_signature: str | None) -> str:
    """Đợi sprint popover items đổi (signature based on item count + text hash).

    Trả về signature mới để caller track tiếp.
    """
    page.wait_for_selector(_ITEM_SELECTOR, timeout=5000)
    try:
        page.wait_for_function(
            """(prev) => {
              const items = Array.from(document.querySelectorAll('.MuiPopover-root .MuiListItemButton-root'));
              if (items.length === 0) return false;
              const sig = items.length + ':' + items.map(it => (it.innerText || '').slice(0, 30)).join('|');
              return prev === null || sig !== prev;
            }""",
            arg=prev_signature,
            timeout=3000,
            polling=200,
        )
    except PWTimeout:
        pass
    return page.evaluate(
        """() => {
          const items = Array.from(document.querySelectorAll('.MuiPopover-root .MuiListItemButton-root'));
          return items.length + ':' + items.map(it => (it.innerText || '').slice(0, 30)).join('|');
        }"""
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
            # MUI checkbox flip là sync — không cần sleep
    page.keyboard.press("Escape")
    _close_popover(page)
    _wait_dialog_table_settle(page)
    # Note: KHÔNG reset _last_sprint_popover_sig — giữ sig của project trước
    # để _open_sprint_dropdown đợi items khác (= mới của project hiện tại).


# JS extractor cho panel Sprint Release sau khi click card.
# Tìm heading "Sprint Release - <ProjectName>", rồi tìm sprint có status "In Progress" gần nhất.
# Robust: dùng innerText (gộp text children), không yêu cầu leaf-only.
_EXTRACT_ACTIVE_SPRINT_JS = r"""
(() => {
  // Scope: dialog Sprint Release
  const dialog = document.querySelector('.MuiDialog-root');
  if (!dialog) return { error: 'no MuiDialog' };

  // Project name
  const text = dialog.innerText || '';
  const headingMatch = text.match(/Sprint Release - (.+?)(?:\n|$)/);
  if (!headingMatch) return { error: 'no heading in dialog' };
  const projectName = headingMatch[1].trim();

  // Parse text lines: tìm "In Progress", lấy line ngay trước = sprint name.
  // Cấu trúc panel:
  //   Sprint Release - <Project>
  //   Sprint Releases (N)
  //   [Hot Fix] [Tạo Sprint mới]  <- action buttons
  //   <sprint name>               <- title
  //   In Progress                 <- status badge
  //   <platform>
  //   Release: ...
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  const NOISE = new Set([
    'Hot Fix', 'Tạo Sprint mới', 'Sprint Release', 'Sprint Releases',
    'In Progress', 'Done', 'Completed', 'Upcoming',
    'Android', 'iOS', 'Web',
  ]);
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === 'In Progress') {
      const prev = lines[i - 1];
      if (prev && !NOISE.has(prev) && !/^Sprint Releases? \(/.test(prev) &&
          !/^Release:/.test(prev) && !prev.startsWith('Sprint Release - ')) {
        return { projectName, activeSprint: prev };
      }
    }
  }
  return { projectName, activeSprint: null, error: 'no sprint name before In Progress' };
})()
"""


def _close_mui_dialog(page) -> None:
    """Đóng MuiDialog (panel Sprint Release) bằng Escape + đợi vanish."""
    page.keyboard.press("Escape")
    try:
        page.wait_for_function(
            "() => !document.querySelector('.MuiDialog-root')",
            timeout=3000,
        )
    except PWTimeout:
        # Fallback: click backdrop
        try:
            page.locator('.MuiBackdrop-root').first.click(timeout=1500, force=True)
            page.wait_for_function(
                "() => !document.querySelector('.MuiDialog-root')",
                timeout=2000,
            )
        except Exception:
            logger.debug("MuiDialog did not close")


_active_sprints_diag: dict = {}


def _collect_active_sprints(page) -> dict[str, str]:
    """Navigate /my-projects → click mỗi card's "Sprint Release" → đọc sprint In Progress.

    Returns mapping {project_name: sprint_name}. Best-effort: project nào fail thì bỏ qua.

    Trước khi vào /my-projects, prime session bằng /my-work — direct goto /my-projects
    đôi khi mất Firebase auth state trong headless context.
    """
    global _active_sprints_diag
    _active_sprints_diag = {"stage": "init"}
    mapping: dict[str, str] = {}
    try:
        # Prime /my-work để xác lập SPA router + session
        page.goto(MY_WORK_URL, wait_until="domcontentloaded", timeout=SCRAPE_TIMEOUT_MS)
        _active_sprints_diag["after_my_work_url"] = page.url
        if "/my-work" not in page.url:
            _active_sprints_diag["stage"] = "redirected_from_my_work"
            return mapping
        try:
            page.wait_for_load_state("networkidle", timeout=5000)
        except PWTimeout:
            pass
        # Click-nav: Projects → Dự án của tôi (SPA route change, không reload)
        for label in ("Projects", "Dự án của tôi"):
            try:
                page.get_by_text(label, exact=True).first.click(timeout=8000)
                _active_sprints_diag[f"clicked_{label}"] = True
            except Exception as exc:
                _active_sprints_diag["stage"] = f"click_failed_{label}"
                _active_sprints_diag["click_error"] = str(exc)
                return mapping
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except PWTimeout:
                pass
        _active_sprints_diag["after_nav_url"] = page.url
        if "/my-projects" not in page.url:
            _active_sprints_diag["stage"] = "not_at_my_projects"
            return mapping
        try:
            page.wait_for_selector('text="Sprint Release"', timeout=8000)
        except PWTimeout:
            _active_sprints_diag["stage"] = "no_sprint_release_button"
            return mapping
    except Exception as exc:
        _active_sprints_diag["stage"] = "nav_exception"
        _active_sprints_diag["error"] = str(exc)
        return mapping

    buttons = page.get_by_text("Sprint Release", exact=True)
    try:
        n = buttons.count()
    except Exception:
        n = 0
    _active_sprints_diag["button_count"] = n
    _active_sprints_diag["stage"] = "iterating"
    logger.info("found %d Sprint Release buttons on /my-projects", n)

    iter_log: list[dict] = []
    for i in range(n):
        step: dict = {"i": i}
        try:
            # Re-locate button mỗi vòng vì DOM có thể re-render
            btn = page.get_by_text("Sprint Release", exact=True).nth(i)
            btn.scroll_into_view_if_needed(timeout=2000)
            btn.click(timeout=8000)
            step["clicked"] = True
            try:
                # Đợi panel render xong: heading + content loaded (có "Sprint Releases (" text)
                page.wait_for_function(
                    """() => {
                      const dialog = document.querySelector('.MuiDialog-root');
                      if (!dialog) return false;
                      const t = dialog.innerText || '';
                      return t.includes('Sprint Release - ') && t.includes('Sprint Releases (');
                    }""",
                    timeout=8000,
                )
                step["panel_ready"] = True
            except PWTimeout:
                step["panel_ready"] = False
            info = page.evaluate(_EXTRACT_ACTIVE_SPRINT_JS)
            step["info"] = info
            if info and isinstance(info, dict):
                name = info.get("projectName")
                sprint = info.get("activeSprint")
                if name and sprint:
                    mapping[name] = sprint
            # Đóng dialog để click button tiếp theo
            _close_mui_dialog(page)
        except Exception as exc:
            step["error"] = str(exc)
            _close_mui_dialog(page)
        iter_log.append(step)
    _active_sprints_diag["iter_log"] = iter_log
    return mapping


def _select_sprint_by_name(page, sprint_name: str) -> str | None:
    """Open sprint dropdown trong Project Overview, ensure CHỈ sprint khớp `sprint_name` được tick.

    Match theo first-line (workload "\\n\\n42h/58h" sau text). Trả về sprint text đã chọn
    hoặc None nếu không tìm thấy.
    """
    try:
        _open_sprint_dropdown(page)
    except Exception:
        return None
    state = _read_dropdown_state(page)
    real_idx: int | None = None
    for i, s in enumerate(state):
        first_line = s["text"].splitlines()[0].strip() if s["text"] else ""
        if first_line == sprint_name:
            real_idx = i
            break
    if real_idx is None:
        page.keyboard.press("Escape")
        _close_popover(page)
        return None

    items = page.locator(_ITEM_SELECTOR)
    for i, s in enumerate(state):
        want = (i == real_idx)
        if s["checked"] != want:
            items.nth(i).click()
    page.keyboard.press("Escape")
    _close_popover(page)
    _wait_dialog_table_settle(page)
    return state[real_idx]["text"].splitlines()[0].strip()


def _select_first_sprint(page) -> str | None:
    """Open sprint dropdown; chọn sprint "In Progress" nếu detect được trong item markup.
    Fallback theo thứ tự ưu tiên: auto-ticked → first real.

    Auto-tick của Review 360° KHÔNG đáng tin (đôi khi chọn sprint mới nhất/cũ nhất,
    không phải active) → ưu tiên status badge trong item content.
    """
    try:
        _open_sprint_dropdown(page)
    except Exception:
        return None
    state = _read_dropdown_state(page)
    real_pairs = [
        (i, s) for i, s in enumerate(state)
        if "không tìm thấy" not in s["text"].lower() and s["text"]
    ]
    if not real_pairs:
        page.keyboard.press("Escape")
        _close_popover(page)
        return None

    items = page.locator(_ITEM_SELECTOR)

    # Priority 1: workload heuristic (sprint có used < budget = đang chạy)
    real_state = [s for _, s in real_pairs]
    active_local = _detect_active_idx(real_state)
    target_idx: int | None
    target_state: dict | None
    if active_local is not None:
        target_idx, target_state = real_pairs[active_local]
    else:
        # Priority 2: auto-ticked (có thể nhiều) → keep first
        checked = [(i, s) for i, s in real_pairs if s["checked"]]
        if checked:
            target_idx, target_state = checked[0]
        else:
            # Priority 3: first real
            target_idx, target_state = real_pairs[0]

    # Ensure target_idx is checked; deselect others.
    for i, s in real_pairs:
        want = (i == target_idx)
        if s["checked"] != want:
            items.nth(i).click()
    page.keyboard.press("Escape")
    _close_popover(page)
    _wait_dialog_table_settle(page)
    return target_state["text"]


def _scrape_dialog_table(page) -> list[dict]:
    """Scrape Project Overview dialog table (HTML <table> based)."""
    result = page.evaluate(EXTRACT_JS_OVERVIEW)
    return result.get("tasks", []) if isinstance(result, dict) else []


# Detail dialog selector: textarea với placeholder "Nhập mô tả chi tiết cho task..."
# Field này nằm trong dialog mở sau khi click task row → chứa full description.
_DESC_TEXTAREA_JS = r"""
  (() => {
    const dialogs = document.querySelectorAll('.MuiDialog-paper');
    if (dialogs.length < 2) return null;  // chỉ Overview dialog đang mở
    const detail = dialogs[dialogs.length - 1];
    const ta = detail.querySelector('textarea[placeholder*="mô tả"]');
    return ta ? (ta.value || '') : null;
  })()
"""


def _fetch_full_description(page, task_id: str) -> str | None:
    """Click row có Task ID khớp trong Overview dialog → đọc full description từ detail dialog.

    Returns description string, "" nếu textarea rỗng, None nếu không click được / fail.
    Detail dialog có textarea placeholder "Nhập mô tả chi tiết cho task..." — đó là field
    chứa description đầy đủ (list view chỉ show summary truncated).
    """
    try:
        before_count = page.evaluate(
            "() => document.querySelectorAll('.MuiDialog-paper').length"
        )
        clicked = page.evaluate(
            """(tid) => {
                const norm = s => (s || '').toString().replace(/\\s+/g, ' ').trim();
                const dlg = document.querySelector('.MuiDialog-paper');
                if (!dlg) return false;
                const tables = Array.from(dlg.querySelectorAll('table'));
                for (const tbl of tables) {
                    const heads = Array.from(tbl.querySelectorAll('thead th, thead td'))
                        .map(c => norm(c.textContent));
                    const nameIdx = heads.findIndex(h => h.includes('Task Name'));
                    if (nameIdx < 0) continue;
                    const rows = tbl.querySelectorAll('tbody tr');
                    for (const r of rows) {
                        const cells = Array.from(r.querySelectorAll('td, th'));
                        const cellTexts = cells.map(c => norm(c.textContent));
                        if (!cellTexts.includes(tid)) continue;
                        const nameCell = cells[nameIdx];
                        if (!nameCell) return false;
                        // Task Name render as link/button — click most specific clickable
                        const target =
                            nameCell.querySelector('a, button, [role="button"], .MuiLink-root') ||
                            nameCell.querySelector('span, p, div') ||
                            nameCell;
                        target.click();
                        return true;
                    }
                }
                return false;
            }""",
            task_id,
        )
        if not clicked:
            return None
        try:
            page.wait_for_function(
                """(prev) => {
                    const dialogs = document.querySelectorAll('.MuiDialog-paper');
                    if (dialogs.length <= prev) return false;
                    const newDlg = dialogs[dialogs.length - 1];
                    return !!newDlg.querySelector('textarea[placeholder*="mô tả"]');
                }""",
                arg=before_count,
                timeout=5000,
            )
        except PWTimeout:
            return None
        desc = page.evaluate(_DESC_TEXTAREA_JS)
        return desc if isinstance(desc, str) else None
    except Exception as exc:
        logger.warning("fetch full description failed for %r: %s", task_id, exc)
        return None
    finally:
        # Đóng CHỈ detail dialog — Escape close cả 2 (cả Overview) → next iteration fail.
        # Click nút X (close button) trong detail dialog để Overview vẫn mở.
        try:
            page.evaluate(
                """() => {
                    const dialogs = document.querySelectorAll('.MuiDialog-paper');
                    if (dialogs.length < 2) return false;
                    const detail = dialogs[dialogs.length - 1];
                    const closeBtn =
                        detail.querySelector('button[aria-label*="close" i]') ||
                        detail.querySelector('button[aria-label*="Close"]') ||
                        Array.from(detail.querySelectorAll('button')).find(b => {
                            const r = b.getBoundingClientRect();
                            const dr = detail.getBoundingClientRect();
                            return r.top - dr.top < 80 && dr.right - r.right < 80;
                        });
                    if (closeBtn) { closeBtn.click(); return true; }
                    return false;
                }"""
            )
            page.wait_for_function(
                """() => document.querySelectorAll('.MuiDialog-paper').length === 1""",
                timeout=3000,
            )
        except PWTimeout:
            pass
        except Exception:
            pass


def _enrich_full_descriptions(page, tasks: list[dict]) -> int:
    """Lặp qua tasks trong Overview dialog hiện tại, click từng row đọc full description.

    Mutates tasks in place: ghi đè `description` nếu fetch thành công và non-empty.
    Returns: số task được enrich. Best-effort — task fail giữ description cũ.
    """
    enriched = 0
    for t in tasks:
        tid = t.get("id")
        if not tid:
            continue
        full = _fetch_full_description(page, tid)
        if full:
            t["description"] = full
            enriched += 1
    return enriched


def scrape_my_work(profile_dir: str, fetch_full_descriptions: bool = False) -> dict:
    """Scrape pipeline 2-phase:
      Phase 1: /my-projects → mapping {project: active_sprint} (sprint có status "In Progress").
      Phase 2: /my-work → Project Overview dialog → mỗi project select đúng sprint từ mapping.
               Project không nằm trong mapping → fallback first-sprint.

    Args:
        fetch_full_descriptions: nếu True, click từng task row mở detail dialog để lấy
            full description (textarea). Đắt: +~0.5-1s mỗi task. Mặc định False vì list-view
            description đã đủ cho hầu hết use case.
    """
    # Lazy import để tránh circular (cache → config → ...)
    from .cache import load_active_sprints_cache, save_active_sprints_cache

    _ensure_profile(profile_dir)
    with sync_playwright() as p:
        with _persistent_context(p, profile_dir, headless=True) as ctx:
            page = ctx.new_page()

            # Phase 1: thử load cache trước (TTL 24h). Cache hit → bỏ qua /my-projects navigation.
            active_sprints = load_active_sprints_cache()
            if active_sprints is None:
                active_sprints = _collect_active_sprints(page)
                save_active_sprints_cache(active_sprints)
                logger.info("active sprints freshly collected: %s", active_sprints)
            else:
                logger.info("active sprints from cache: %s", active_sprints)

            # Phase 2: scrape Project Overview
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
                    target_sprint = active_sprints.get(proj)
                    sprint_raw: str | None
                    if target_sprint:
                        sprint_raw = _select_sprint_by_name(page, target_sprint)
                        if not sprint_raw:
                            # Mapping có nhưng dropdown không match (sprint name lệch) → fallback
                            logger.warning("active sprint %r not in dropdown for %r, fallback first",
                                           target_sprint, proj)
                            sprint_raw = _select_first_sprint(page)
                    else:
                        # Project không có trong mapping (e.g. project ngoài /my-projects của user)
                        sprint_raw = _select_first_sprint(page)
                    # Sprint button text có thể chứa workload "\n\n42h/58h" — lấy line đầu
                    sprint_name = sprint_raw.splitlines()[0].strip() if sprint_raw else None
                    sprint_obj = (
                        {"id": f"{_slug(proj)}__{_slug(sprint_name)}", "name": sprint_name, "project": proj}
                        if sprint_name else None
                    )
                    rows = _scrape_dialog_table(page)
                    if fetch_full_descriptions and rows:
                        enriched = _enrich_full_descriptions(page, rows)
                        logger.info("enriched %d/%d descriptions for %r", enriched, len(rows), proj)
                    for r in rows:
                        r["module"] = proj  # override với project name (chuẩn xác hơn)
                        # Promote sprint string → structured dict với ID project-scoped.
                        # Nếu row đã có sprint string từ scrape, vẫn override với sprint_obj
                        # (sprint dropdown là source of truth cho project hiện tại).
                        if sprint_obj:
                            r["sprint"] = sprint_obj
                        r["_project"] = proj
                    all_tasks.extend(rows)
                    per_project[proj] = {"sprint": sprint_name, "count": len(rows)}
                    logger.info("scraped %d tasks for %r (sprint=%r)", len(rows), proj, sprint_name)
                except Exception as exc:
                    msg = f"project {proj!r}: {exc}"
                    logger.warning(msg)
                    errors.append(msg)

            # Build per-project groups: project là cha, sprint/member nested vào.
            # FE chỉ việc đọc projects[selected].sprints — không cần scope tại runtime.
            projects_grouped: list[dict] = []
            for proj in project_names:
                proj_tasks = [t for t in all_tasks if t.get("_project") == proj]
                sprint_by_id: dict[str, dict] = {}
                member_by_name: dict[str, dict] = {}
                for t in proj_tasks:
                    sp = t.get("sprint")
                    if isinstance(sp, dict) and sp.get("id"):
                        sprint_by_id.setdefault(sp["id"], sp)
                    an = t.get("assignee")
                    if isinstance(an, str) and an and an != "-" and an not in member_by_name:
                        member_by_name[an] = {"name": an, "role": ""}
                projects_grouped.append({
                    "name": proj,
                    "sprints": list(sprint_by_id.values()),
                    "members": list(member_by_name.values()),
                    "taskCount": len(proj_tasks),
                })

            result = {
                "url": page.url,
                "title": page.title(),
                "extractedAt": datetime.now(timezone.utc).isoformat(),
                "projectNames": project_names,
                "projects": projects_grouped,
                "perProject": per_project,
                "activeSprintsMap": active_sprints,
                "errors": errors,
                "count": len(all_tasks),
                "tasks": all_tasks,
            }
            if DEBUG:
                result["activeSprintsDiag"] = _active_sprints_diag
                result["_diag"] = diag
            return result


def debug_fetch_one_description(profile_dir: str) -> dict:
    """One-shot: open overview, select first project, scrape table, try fetch full desc
    for FIRST task. Return verbose trace để debug selector.
    """
    _ensure_profile(profile_dir)
    trace: dict = {"steps": []}
    with sync_playwright() as p:
        with _persistent_context(p, profile_dir, headless=True) as ctx:
            page = ctx.new_page()
            try:
                _goto_my_work(page)
                trace["steps"].append({"step": "goto_my_work", "url": page.url})
                _open_overview_dialog(page)
                trace["steps"].append({"step": "open_overview", "ok": True})
                project_items = _list_projects(page)
                proj = project_items[0]["text"]
                trace["project"] = proj
                _select_only_project(page, proj)
                _select_first_sprint(page)
                rows = _scrape_dialog_table(page)
                trace["row_count"] = len(rows)
                if not rows:
                    trace["error"] = "no rows"
                    return trace
                first = rows[0]
                tid = first.get("id")
                trace["target_task_id"] = tid
                trace["original_description"] = first.get("description")

                # Probe: count dialogs before
                before_count = page.evaluate(
                    "() => document.querySelectorAll('.MuiDialog-paper').length"
                )
                trace["dialogs_before_click"] = before_count

                # Click attempt
                clicked = page.evaluate(
                    """(tid) => {
                        const norm = s => (s || '').toString().replace(/\\s+/g, ' ').trim();
                        const dlg = document.querySelector('.MuiDialog-paper');
                        if (!dlg) return {clicked: false, reason: 'no overview dialog'};
                        const tables = Array.from(dlg.querySelectorAll('table'));
                        for (const tbl of tables) {
                            const heads = Array.from(tbl.querySelectorAll('thead th, thead td'))
                                .map(c => norm(c.textContent));
                            const nameIdx = heads.findIndex(h => h.includes('Task Name'));
                            if (nameIdx < 0) continue;
                            const rows = tbl.querySelectorAll('tbody tr');
                            for (const r of rows) {
                                const cells = Array.from(r.querySelectorAll('td, th'));
                                const cellTexts = cells.map(c => norm(c.textContent));
                                if (!cellTexts.includes(tid)) continue;
                                const nameCell = cells[nameIdx];
                                const target =
                                    nameCell.querySelector('a, button, [role="button"], .MuiLink-root') ||
                                    nameCell.querySelector('span, p, div') ||
                                    nameCell;
                                target.click();
                                return {
                                    clicked: true,
                                    targetTag: target.tagName,
                                    targetClass: target.className,
                                    nameCellHTML: nameCell.outerHTML.slice(0, 500)
                                };
                            }
                        }
                        return {clicked: false, reason: 'task ID not found in any table'};
                    }""",
                    tid,
                )
                trace["click_result"] = clicked

                # Wait for new dialog
                try:
                    page.wait_for_function(
                        """(prev) => document.querySelectorAll('.MuiDialog-paper').length > prev""",
                        arg=before_count,
                        timeout=5000,
                    )
                    trace["new_dialog_appeared"] = True
                except PWTimeout:
                    trace["new_dialog_appeared"] = False

                # Inspect what dialogs exist now
                trace["dialog_inventory"] = page.evaluate(
                    """() => {
                        return Array.from(document.querySelectorAll('.MuiDialog-paper')).map((d, i) => ({
                            idx: i,
                            textareaCount: d.querySelectorAll('textarea').length,
                            textareaPlaceholders: Array.from(d.querySelectorAll('textarea')).map(t => t.placeholder),
                            hasDescTextarea: !!d.querySelector('textarea[placeholder*="mô tả"]'),
                        }));
                    }"""
                )

                desc = page.evaluate(_DESC_TEXTAREA_JS)
                trace["fetched_description"] = desc
            except Exception as exc:
                trace["error"] = str(exc)
            finally:
                try:
                    page.keyboard.press("Escape")
                except Exception:
                    pass
    return trace


def dump_sprint_dropdowns(profile_dir: str) -> dict:
    """Debug: với mỗi project trong Project Overview, mở sprint dropdown và dump items.

    Trả về {project_name: {items: [{text, checked, has_in_progress}], chosen: <idx>, reason: <str>}}.
    Dùng để verify _detect_active_idx() có pick đúng sprint không.
    """
    _ensure_profile(profile_dir)
    out: dict = {}
    with sync_playwright() as p:
        with _persistent_context(p, profile_dir, headless=True) as ctx:
            page = ctx.new_page()
            _goto_my_work(page)
            if "/my-work" not in page.url:
                return {"error": f"redirected to {page.url}"}
            _open_overview_dialog(page)
            project_items = _list_projects(page)
            project_names = [p["text"] for p in project_items]
            for proj in project_names:
                try:
                    _select_only_project(page, proj)
                    _open_sprint_dropdown(page)
                    state = _read_dropdown_state(page)
                    real_pairs = [
                        (i, s) for i, s in enumerate(state)
                        if "không tìm thấy" not in s["text"].lower() and s["text"]
                    ]
                    real_state = [s for _, s in real_pairs]
                    active_local = _detect_active_idx(real_state)
                    if active_local is not None:
                        chosen_idx, reason = real_pairs[active_local][0], "workload_active"
                    else:
                        checked = [(i, s) for i, s in real_pairs if s["checked"]]
                        if checked:
                            chosen_idx, reason = checked[0][0], "auto_ticked"
                        elif real_pairs:
                            chosen_idx, reason = real_pairs[0][0], "first_real"
                        else:
                            chosen_idx, reason = None, "no_real"
                    out[proj] = {
                        "items": [
                            {
                                "text": s["text"],
                                "checked": s["checked"],
                                "html_snippet": (s["html"][:300] if s.get("html") else ""),
                                "workload": _parse_workload(s.get("text", "")),
                                "sprint_num": _sprint_num(s.get("text", "")),
                            }
                            for s in state
                        ],
                        "chosen_idx": chosen_idx,
                        "reason": reason,
                    }
                    page.keyboard.press("Escape")
                    _close_popover(page)
                except Exception as exc:
                    out[proj] = {"error": str(exc)}
    return out


def dump_html(profile_dir: str, output_path: str, nav: list[str] | None = None) -> dict:
    """Best-effort: lưu DOM, kèm diag.

    Args:
        nav: Optional list of text labels click sequentially sau khi vào /my-work.
             Ví dụ ["Project", "Dự án của tôi", "Sprint Release"] → navigate menu.
    """
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
            if nav:
                nav_log: list[dict] = []
                for label in nav:
                    step = {"label": label}
                    try:
                        page.get_by_text(label, exact=True).first.click(timeout=8000)
                        try:
                            page.wait_for_load_state("networkidle", timeout=5000)
                        except PWTimeout:
                            pass
                        step["url_after"] = page.url
                        step["ok"] = True
                    except Exception as exc:
                        step["ok"] = False
                        step["error"] = str(exc)
                        logger.warning("nav click %r failed: %s", label, exc)
                    nav_log.append(step)
                diag["nav"] = nav_log
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
