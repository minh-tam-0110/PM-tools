# Connection (Bridge → Review 360°)

## Mục đích
Đưa data từ Review 360° (`wolffun-review.web.app/my-work`) vào dashboard. **3 chế độ**:

1. **BE Playwright bridge** (default, recommended) — backend chạy Chromium, login 1 lần lưu cookie, sau đó headless scrape.
2. **FE Iframe + postMessage** — load iframe trong dashboard, dùng nếu sau này có script inject vào Review 360°.
3. **Manual JSON** — paste tay (fallback khi 2 cách trên fail).

## Trigger từ user
"Login Review 360° / Scrape data về."

---

## BE Playwright Bridge (chính)

### Flow

```
[User]            [FE]                   [BE /api/bridge]                   [Chromium]
  │                │                          │                                │
  │  click Login   │  POST /login             │  launch headed                 │
  │ ─────────────▶ │ ───────────────────────▶ │ ─────────────────────────────▶ │
  │                │                          │                                │
  │           Login tay trong popup Chromium  │                                │
  │ ◀───────────────────────────────────────────────────────────────────────── │
  │                │                          │  save storageState.json        │
  │                │                          │ ◀──────────────────────────────│
  │                │  click Scrape            │                                │
  │ ─────────────▶ │  POST /scrape            │  headless, load /my-work       │
  │                │ ───────────────────────▶ │ ─────────────────────────────▶ │
  │                │                          │  evaluate(EXTRACT_JS)          │
  │                │                          │ ◀──────────────────────────────│
  │                │  { tasks: [...] }        │                                │
  │                │ ◀─────────────────────── │                                │
  │  taskStore.setAll(normalize(payload))     │                                │
```

### Endpoints

| Method | Path | Mô tả | Block? |
|--------|------|------|--------|
| GET | `/api/bridge/status` | Storage state có chưa, bao nhiêu cookie | nhanh |
| POST | `/api/bridge/login` | Mở Chromium headed cho user login → lưu state | block, có thể vài phút |
| POST | `/api/bridge/scrape` | Headless scrape /my-work, return `{tasks}` | ~10–30s |
| POST | `/api/bridge/dump-html` | Lưu raw DOM ra `backend/data/review360_last_dom.html` (debug) | ~10–30s |

### Setup lần đầu

```bash
pip install -r backend/requirements.txt
playwright install chromium     # ~150MB browser binary
```

### Sử dụng

```bash
python run.py --dev
# Trong browser FE → Connect → tab "BE Bridge" → Login → (login Wolffun trong popup) → Scrape
```

Storage state lưu ở `backend/data/review360_state.json`. Cookies thường sống được vài tuần. Khi expired → BE trả 503 với error "session expired" → user re-login.

### Tuning selector

DOM Review 360° không stable — `EXTRACT_JS` trong `services/scraper.py` chỉ là heuristic:
- Scan element có `[data-task-id]` / `[data-id]` / class chứa "task"/"card"
- Filter element có chứa keyword status
- Best-effort extract title / status / priority / assignee / deadline

Khi muốn precise hơn:
1. Gọi `POST /api/bridge/dump-html` → mở file `backend/data/review360_last_dom.html`
2. Inspect cấu trúc DOM thật
3. Sửa `EXTRACT_JS` trong `services/scraper.py` (rebuild không cần — Flask reload Python module)

### Field mapping
Output từ scraper là raw — đi qua `frontend/src/lib/normalize.ts` (`normTask`) trước khi vào store.

---

## FE Iframe Mode (legacy / future)

Nếu sau này có script inject vào Review 360° gửi `postMessage`:

| Direction | Type | Payload |
|-----------|------|---------|
| → iframe | `REQUEST_SCRAPE` | — |
| → iframe | `CREATE_TASK` | `{ task }` |
| ← iframe | `WOLFFUN_AUTH_OK` | — |
| ← iframe | `WOLFFUN_DATA` | `{ tasks, team, sprints }` |
| ← iframe | `WOLFFUN_ERROR` | `{ message }` |

**Security MUST-DO** — `useDataBridge` validate `event.origin ∈ ALLOWED_ORIGINS`.

Hiện tại Firebase `X-Frame-Options` block iframe → mode này chưa khả dụng. Giữ code làm sẵn.

---

## Manual JSON (fallback)

Modal Connect → tab Manual → paste JSON → `normalizeImported()` → store. Format: xem `lib/normalize.ts`.

---

## Components / Files

| Layer | File | Trách nhiệm |
|------|------|-------------|
| FE Modal | `features/connection/ConnectionPanel.tsx` | Modal 3 tab |
| FE Hook | `hooks/useDataBridge.ts` | Validate origin, push vào store |
| FE Store | `stores/connStore.ts` | `src`/`iframeSt`/`lastSync` |
| BE Service | `backend/features/bridge/services/scraper.py` | Playwright wrapper |
| BE Routes | `backend/features/bridge/routes/scrape.py` | login/scrape/dump/status |
| BE Config | `backend/features/bridge/bridge_config.py` | URLs, paths, timeouts |
| Storage | `backend/data/review360_state.json` | Cookies + localStorage (gitignored) |

## Edge cases
- **Cookie expired** → BE trả 503 → FE prompt re-login.
- **Network idle timeout** → BE trả 500. Có thể tăng `SCRAPE_TIMEOUT_MS` trong config.
- **Selector miss (count = 0)** → check dump-html, sửa `EXTRACT_JS`.
- **Concurrent login** → KHÔNG hỗ trợ — chỉ 1 user dùng. Nếu cần multi-user → cần per-user storage path.

## Skills liên quan
- `architecture.md` (postMessage, normalize boundary)
- `coding.md` (validate origin, error→HTTP code mapping)
