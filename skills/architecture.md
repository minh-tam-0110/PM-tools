---
name: Architecture
context: Layer rules, dependency direction, data bridge pattern, postMessage protocol, normalize boundary
skill_type: reference
triggers: [feature, route, service, postMessage, iframe, bridge, normalize, store, layer, blueprint, backend, auto-discovery, register, manifest, zustand, tính năng mới]
depends_on: []
---

# Architecture

Layer, dependency direction, data bridge, postMessage, normalize boundary, store contract.

> Đọc song song với [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md). File này nhấn vào **rule** cần follow khi code, file kia là tham khảo tổng thể.

---

## Layer Rules

**Backend:**

| Layer | Được import | KHÔNG được import |
|-------|-------------|-------------------|
| `routes/*.py` | services, config, Flask | — |
| `services/*.py` | config, stdlib, `backend/core` | Flask, feature khác |
| `<name>_config.py` | stdlib | Bất cứ thứ gì trong project |

Vi phạm thường gặp:
- Import `request` / `current_app` trong `services/*.py` → SAI. Truyền data qua param.
- Import từ `backend.features.other_feature.*` → SAI. Move sang `backend/core/`.

**Frontend:**

```
features/<name>/  →  components/shared/  →  components/ui/
```

- `features/A/` import `features/B/*` → CẤM.
- `components/shared/` import `features/*` → CẤM.

---

## Auto-discovery Contract

`backend/app.py` scan `backend/features/*/feature.py`. Folder không bắt đầu bằng `_`. Manifest **bắt buộc** expose `NAME`, `LABEL`, `URL_PREFIX`, `register(app)`.

```python
# backend/features/<name>/feature.py
NAME = "<name>"           # khớp folder
LABEL = "Human Label"
URL_PREFIX = "/api/<name>"

def register(app):
    from .routes import xxx
    app.config["FEATURE_KEY"] = ...
    app.register_blueprint(xxx.bp)
```

Frontend KHÔNG auto — phải add tab/route thủ công.

---

## Normalize Boundary (rule cứng)

**Single source of truth**: `frontend/src/lib/normalize.ts`. Mọi data từ ngoài (iframe, manual JSON, BE response) phải pass qua đây trước khi vào store.

```ts
// ✅
const canonical = normalizeImported(rawFromIframe)
useTaskStore.getState().setAll(canonical)

// ❌ — không normalize ở component
function OverviewView() {
  const tasks = useTaskStore(s => s.tasks)
  const fixed = tasks.map(t => ({ ...t, status: t.status || 'Backlog' }))  // ❌ làm ở normalize
}
```

UI components **luôn nhận canonical shape** (xem `ARCHITECTURE.md > Canonical Task Shape`).

---

## postMessage Pattern (Iframe Bridge)

```ts
// hooks/useDataBridge.ts
useEffect(() => {
  const handler = (e: MessageEvent) => {
    if (!ALLOWED_ORIGINS.includes(e.origin)) return  // SECURITY
    const msg = e.data
    if (msg?.type === 'WOLFFUN_DATA') {
      const norm = normalizeImported(msg)
      useTaskStore.getState().setAll(norm)
      useConnStore.getState().setSrc('iframe')
    } else if (msg?.type === 'WOLFFUN_AUTH_OK') {
      useConnStore.getState().setIframeSt('connected')
    } else if (msg?.type === 'WOLFFUN_ERROR') {
      useConnStore.getState().setIframeSt('error')
    }
  }
  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}, [])
```

Rule:
1. **Validate `event.origin`** — silent reject nếu không thuộc allowlist.
2. Mọi mutation store đi qua action (`setAll`, `setSrc`), không `useTaskStore.setState({...})`.
3. Auto-refresh: chỉ chạy khi `iframeSt === 'connected'`.

---

## Store Contract (Zustand)

| Store | Shape | Trách nhiệm |
|-------|-------|-------------|
| `taskStore` | `{ tasks, team, sprints, setAll, add, update, remove }` | Data canonical |
| `filterStore` | `{ sprintId, memberId, priority, module, search, set, clear }` | Cross-view filter |
| `connStore` | `{ src, iframeSt, lastSync, setSrc, setIframeSt, touchSync }` | Connection state |

**Selector rule (React #185 guard):** selector trả primitive hoặc stable ref.

```ts
// ✅
const tasks = useTaskStore(s => s.tasks)
const running = useConnStore(s => s.iframeSt === 'connected')

// ❌ — fallback array literal mỗi lần render → infinite loop
const tasks = useTaskStore(s => s.tasks ?? [])

// ✅ fix
const EMPTY: Task[] = []
const tasks = useTaskStore(s => s.tasks ?? EMPTY)
```

Derivation `.map`/`.filter` phải nằm trong `useMemo`, không trong selector.

---

## Backend Route Template

```python
"""<Feature> CRUD."""
from flask import Blueprint, current_app, jsonify, request
from ..services.task_store import load, save_one

bp = Blueprint("tasks_crud", __name__)

@bp.get("/api/tasks")
def list_tasks():
    return jsonify(load(current_app.config["TASKS_STORE_PATH"]))

@bp.post("/api/tasks")
def create_task():
    data = request.get_json(silent=True) or {}
    if not data.get("title"):
        return jsonify({"error": "title required"}), 400
    saved = save_one(current_app.config["TASKS_STORE_PATH"], data)
    return jsonify(saved), 201
```

## Backend Service Template

```python
"""Pure logic — no Flask."""
import json, threading
from pathlib import Path

_lock = threading.Lock()

def load(path: str) -> list[dict]:
    p = Path(path)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []

def save_one(path: str, task: dict) -> dict:
    with _lock:
        items = load(path)
        items.append(task)
        Path(path).write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    return task
```

---

## New Feature Checklist

1. `backend/features/<name>/feature.py` — manifest.
2. `backend/features/<name>/<name>_config.py` — constants only.
3. `backend/features/<name>/routes/*.py` — blueprint `{feature}_{operation}`.
4. `backend/features/<name>/services/*.py` — pure Python.
5. `frontend/src/features/<name>/<Name>View.tsx` — React entry.
6. Add tab vào `frontend/src/components/layout/TabBar.tsx`.
7. `docs/features/<name>.md` — feature doc.

Backend tự discovery step 1-4. Step 5-6 thủ công.
