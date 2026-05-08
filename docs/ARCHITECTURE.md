# Architecture

Kiến trúc tổng thể, data flow, dependency direction, postMessage protocol.

---

## Layer Map

```
run.py
  └── backend/app.py          # factory: create_app(), _discover_features(), serve SPA
        └── backend/features/<name>/
              feature.py      # manifest: NAME, LABEL, URL_PREFIX, register(app)
              <name>_config.py
              routes/*.py     # HTTP adapters
              services/*.py   # pure Python logic, no Flask imports

frontend/                     # React SPA (Vite + React 19 + TS + Tailwind v4)
    src/
        main.tsx              # React root
        App.tsx               # BrowserRouter + tab shell + filter bar
        features/<name>/      # <Name>View.tsx + feature components
        components/shared/    # Header, FilterBar, MetricCard, StatusBadge, …
        components/ui/        # shadcn/ui primitives
        components/layout/    # AppLayout, TabBar
        hooks/                # useDataBridge, useFilters, useMobile
        lib/                  # api.ts, normalize.ts, constants.ts, utils.ts
        stores/               # Zustand: taskStore, filterStore, connStore
        styles/globals.css    # Tailwind @theme tokens
    dist/                     # built SPA (Flask serves)
```

---

## Auto-Discovery (Backend)

`backend/app.py._discover_features()` scan `backend/features/*/feature.py` alphabetically:

```python
def _discover_features():
    features_dir = Path(__file__).parent / "features"
    for entry in sorted(features_dir.iterdir()):
        if entry.is_dir() and not entry.name.startswith("_") and (entry / "feature.py").exists():
            mod = importlib.import_module(f"backend.features.{entry.name}.feature")
            yield mod
```

Rule: folder name không bắt đầu bằng `_`, phải có `feature.py`. Không cần manual register.

**Frontend KHÔNG auto-discovery** — phải add tab/route trong `App.tsx` hoặc `TabBar.tsx`.

---

## Feature Manifest

```python
# backend/features/<name>/feature.py
NAME        = "tasks"                   # khớp folder
LABEL       = "Task Storage"
URL_PREFIX  = "/api/tasks"

DESCRIPTION = "Persist + serve PM tasks"
ICON        = "📋"
COLOR       = "#7C6AEF"
ORDER       = 10

def register(app):
    from .routes import crud
    app.config["TASKS_STORE_PATH"] = ...
    app.register_blueprint(crud.bp)
```

---

## Dependency Direction

**Backend:**

| Layer | Được import | KHÔNG được import |
|-------|-------------|-------------------|
| Routes | Services, Config, Flask | — |
| Services | Config, stdlib, backend/core | Flask, feature khác |
| Config | stdlib | Bất cứ thứ gì trong project |

**Frontend:**

```
features/<name>/  →  components/shared/  →  components/ui/
                                                ↑
                                          (shadcn — không sửa)
```

Cross-feature import bị **cấm**. Code dùng chung → `backend/core/` hoặc `frontend/src/components/shared/`.

---

## Data Flow

### Read (iframe mode)

```
[wolffun-review.web.app  iframe]  --postMessage(WOLFFUN_DATA)-->  [useDataBridge]
                                                                         │
                                                                         ▼
                                                             normalize.ts (map field names)
                                                                         │
                                                                         ▼
                                                                  taskStore (Zustand)
                                                                         │
                                                                         ▼
                                                             5 Views re-render
```

### Read (manual JSON)

```
[user paste textarea] --> importJSON(str) --> normalize.ts --> taskStore --> Views
```

### Write (create task)

```
[CreateTaskModal form submit]
       │
       ├─ optimistic: taskStore.add(task)
       │
       ├─ if iframe connected: postMessage(CREATE_TASK)
       │
       └─ if backend on: POST /api/tasks { task }
```

### Auto-refresh

- 5-min timer khi iframe connected → `postMessage(REQUEST_SCRAPE)` → iframe gửi lại `WOLFFUN_DATA`.
- Manual: nút Refresh.

---

## postMessage Protocol

### Dashboard → Iframe

| Type | Payload |
|------|---------|
| `REQUEST_SCRAPE` | — |
| `CREATE_TASK` | `{ task: <CanonicalTask> }` |

### Iframe → Dashboard

| Type | Payload |
|------|---------|
| `WOLFFUN_AUTH_OK` | — |
| `WOLFFUN_DATA` | `{ tasks: [...], team: [...], sprints: [...] }` (raw — chưa normalize) |
| `WOLFFUN_ERROR` | `{ message: string }` |

**Security:** mọi handler PHẢI validate `event.origin` ∈ `ALLOWED_ORIGINS` (`frontend/src/lib/constants.ts`). Reject silent nếu không khớp.

---

## Canonical Task Shape

UI components luôn nhận shape này (sau normalize):

```ts
type Task = {
  id: string
  title: string
  assignee: { id?: string; name: string; role?: string; av?: string }
  status: 'Backlog' | 'To Do' | 'In Progress' | 'Review' | 'Done'
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  module: string
  deadline: string          // YYYY-MM-DD
  sp: number                // story points
  sprint: { id: string; name: string; start: string; end: string; status: 'active' | 'closed' | 'planned' }
  description?: string
}
```

Normalizer (`lib/normalize.ts`) là **single source of truth** cho việc map raw → canonical. Không normalize ở chỗ khác.

---

## State Management

| State | Nơi sống | Lý do |
|-------|---------|-------|
| `tasks`, `team`, `sprints` | `taskStore` (Zustand) | Cross-view, survive tab switch |
| Filter (sprint, member, priority, module, search) | `filterStore` (Zustand) | Cross-view, persist khi đổi tab |
| Connection state (`src`, `iframeSt`, `lastSync`) | `connStore` (Zustand) | Header + Connect modal cùng đọc |
| Modal open/close, form input | local `useState` | UI ephemeral |
| Calendar current week/month | local `useState` per view | Per-view ephemeral |

**Selector rule** (React #185 guard): selector trả về primitive hoặc stable ref. Không tạo array/object literal mới trong selector — fallback dùng module-level constant.

```ts
const EMPTY: Task[] = []
const tasks = useTaskStore(s => s.tasks ?? EMPTY)   // ✅
// const tasks = useTaskStore(s => s.tasks ?? [])   // ❌ infinite re-render
```

---

## Backend Route Template

```python
"""Tasks CRUD."""
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

---

## Backend Service Template

```python
"""Pure logic — no Flask imports."""
import json, threading
from pathlib import Path

_lock = threading.Lock()

def load(path: str) -> list[dict]:
    p = Path(path)
    if not p.exists():
        return []
    return json.loads(p.read_text(encoding="utf-8"))

def save_one(path: str, task: dict) -> dict:
    with _lock:
        items = load(path)
        items.append(task)
        Path(path).write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    return task
```
