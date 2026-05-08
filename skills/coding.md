---
name: Coding Conventions
context: TS/Python naming, hook patterns, state management, error handling, logging
skill_type: guide
triggers: [naming, state, useReducer, store, zustand, API, fetch, error, logging, convention, đặt tên, hook]
depends_on: [architecture.md]
---

# Coding Conventions

---

## Naming

### TypeScript
- Component: `PascalCase` (`OverviewView`, `MetricCard`).
- Hook: `useXxx` (`useDataBridge`, `useFilters`).
- Store: `useXxxStore` (`useTaskStore`).
- Type/interface: `PascalCase` (`Task`, `Member`, `Sprint`).
- File: khớp default export — `OverviewView.tsx`, `useDataBridge.ts`.
- Constants: `SCREAMING_SNAKE_CASE` ở top-level (`STATUSES`, `PRIORITIES`, `ALLOWED_ORIGINS`).
- Helper: `camelCase` (`fmtDate`, `groupByStatus`).

### Python
- Module: `snake_case`.
- Function: `snake_case`.
- Class: `PascalCase`.
- Constants: `SCREAMING_SNAKE_CASE`.
- Private: prefix `_`.

---

## Hooks Pattern

### Side effect cleanup luôn return
```tsx
useEffect(() => {
  const t = setInterval(refresh, 5 * 60_000)
  return () => clearInterval(t)
}, [refresh])
```

### Stable callback với useCallback khi pass xuống `memo` component
```tsx
const handleSelect = useCallback((id: string) => {
  setSelected(id)
}, [])
```

### Đừng dùng `useEffect` cho derive — dùng `useMemo`
```tsx
// ❌
const [pct, setPct] = useState(0)
useEffect(() => { setPct(done / total) }, [done, total])

// ✅
const pct = useMemo(() => total ? done / total : 0, [done, total])
```

---

## State — Where to Put It

| Loại state | Vị trí |
|-----------|--------|
| Cross-view (tasks, team, sprints, filter, connection) | Zustand store |
| UI ephemeral (modal open, tab active, form input) | local `useState` |
| Server cache (BE response) | Tạm: state trong store; tương lai: TanStack Query |
| Derive từ state khác | `useMemo` (không tạo state mới) |

---

## API Client (`lib/api.ts`)

```ts
const BASE = '/api'

async function http<T>(method: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(BASE + url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new ApiError(r.status, await r.text())
  return r.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(public status: number, public body: string) { super(`API ${status}: ${body}`) }
}

export const tasksApi = {
  list:   () => http<Task[]>('GET',  '/tasks'),
  create: (t: Partial<Task>) => http<Task>('POST', '/tasks', t),
}
```

Rule:
- Mọi fetch đi qua `api.ts` — không gọi `fetch` trực tiếp trong component.
- Throw `ApiError` để component bắt được status code.
- Không try/catch trong `api.ts` để swallow — caller tự handle.

---

## Error Handling

### Frontend
- `ApiError` → toast + log; không leak stack trace lên UI.
- `try/catch` chỉ ở **boundary** (route handler, async event handler).
- Component pure — render error state từ props/store, không tự catch render error.

### Backend
- Service raise `ValueError` (input xấu) hoặc `RuntimeError` (system fail).
- Route map exception → HTTP code:
  - `ValueError` → 400
  - `KeyError` (not found) → 404
  - `RuntimeError` → 503
  - Unhandled → 500 (Flask default)

```python
@bp.post("/api/tasks")
def create():
    data = request.get_json(silent=True) or {}
    try:
        return jsonify(create_task(data)), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503
```

---

## Logging

### Python
```python
import logging
logger = logging.getLogger(__name__)
logger.info("scrape ok, %d tasks", len(tasks))
logger.exception("scrape failed")  # bắt buộc dùng .exception trong except
```
Không `print` trong code production.

### TypeScript
- Dev: `console.debug` ok, prefix `[FeatureName]`.
- Production lỗi: route qua hàm `logError()` ở `lib/logger.ts` (gửi BE nếu có).

---

## Comments

Default: **không viết comment**. Chỉ thêm khi WHY không obvious:
- Workaround cho bug cụ thể (`// Safari fires twice — debounce`)
- Invariant ẩn (`// status đã được normalize ở normalize.ts`)
- Magic number (`// 5 phút theo yêu cầu PM`)

KHÔNG viết:
- Comment mô tả WHAT (`// Loop tasks` — đã thấy bằng code)
- Reference task ID / PR (`// fix #123` — thuộc commit message)
- Block comment lưu version cũ (xóa code, dùng git)

---

## File Header

Một dòng docstring mô tả mục đích:

```python
"""Persist + serve PM tasks (JSON file backend)."""
```

```ts
/** Hook trung tâm cho data bridge giữa iframe Review 360° và taskStore. */
```

---

## Imports Order

### TS
1. React + framework
2. Third-party
3. `@/components/...`
4. `@/lib/...`, `@/hooks/...`, `@/stores/...`
5. Relative `./` `../`
6. Type-only (`import type { ... }`)

### Python
1. stdlib
2. third-party
3. `backend.core.*`
4. `..services.*`, `..` (relative trong feature)

---

## TS Strict

`tsconfig.json` bật `strict: true`. Không `any` trừ khi đã try-typed và phải kèm comment lý do.

```ts
// ❌
function parse(x: any) { ... }

// ✅
function parse(x: unknown) {
  if (typeof x !== 'object' || x === null) return null
  // narrow tiếp
}
```
