# Feature Guide

Project dùng **feature-oriented architecture**. Mỗi capability lớn sống trong package riêng dưới `backend/features/<name>/` (API) và `frontend/src/features/<name>/` (React view + components).

---

## Directory Conventions

```
backend/features/<name>/
  feature.py            # REQUIRED manifest
  <name>_config.py      # constants only, no I/O at import
  routes/               # Flask blueprints — URL prefix /api/<name>/
  services/             # pure Python, no Flask imports

frontend/src/features/<name>/
  <Name>View.tsx        # React entry point cho tab
  <Component>.tsx       # components riêng feature (không shared)
  ...

frontend/src/components/
  ui/                   # shadcn/ui primitives — không sửa
  shared/               # cross-feature (Header, FilterBar, MetricCard, …)
  layout/               # AppLayout, TabBar
```

---

## Naming Conventions

- Feature config: `<name>_config.py` — **không** `config.py`. Lý do: phân biệt với `backend/config.py` trong tab IDE. Ví dụ: `tasks_config.py`, `bridge_config.py`.
- Route file trùng tên với service: thêm suffix `_route` → `task_route.py` (route) vs `task_service.py` (service).
- `app.config` keys: prefix theo feature → `TASKS_STORE_PATH`, `BRIDGE_ALLOWED_ORIGINS`.
- Blueprint: `{feature}_{operation}` → `tasks_crud`, `bridge_relay`.

---

## feature.py Manifest Contract

Mọi `feature.py` phải expose:

```python
NAME        : str   # khớp folder, e.g., "tasks"
LABEL       : str   # human-readable, e.g., "Task Storage"
URL_PREFIX  : str   # API prefix, e.g., "/api/tasks"

# Optional (dashboard meta)
DESCRIPTION : str
ICON        : str
COLOR       : str
ORDER       : int

def register(app: Flask) -> None:
    # 1. Load any data into app.config
    # 2. Register all blueprints
```

---

## Auto-discovery — Không sửa app.py

`backend/app.py` scan `backend/features/*/feature.py` alphabetically. Thêm BE feature chỉ cần tạo folder + `feature.py`.

**Frontend KHÔNG auto** — phải add tab trong `frontend/src/components/layout/TabBar.tsx` (hoặc route trong `App.tsx`) thủ công.

---

## Đăng ký feature mới (checklist)

1. Tạo `backend/features/<name>/` đúng structure trên.
2. Implement `feature.py` theo contract.
3. Tạo `<name>_config.py` (constants, không I/O at import time).
4. Tạo routes ở `routes/` và services ở `services/`.
5. Tạo `frontend/src/features/<name>/<Name>View.tsx`.
6. Add tab vào `frontend/src/components/layout/TabBar.tsx` (hoặc route trong `App.tsx`).
7. Tạo `docs/features/<name>.md` (template bên dưới).
8. Done — backend tự discovery; FE step 5-6 phải tay.

---

## Doc template `docs/features/<name>.md`

```markdown
# <Feature Label>

## Mục đích
Một câu mô tả tại sao feature này tồn tại và user value.

## Trigger từ user
"Khi tôi muốn xem ..." / "Khi tôi cần làm ..."

## Data input
- Shape gì? Lấy từ store nào?
- Có normalize/derive gì không?

## Layout
- ASCII sketch hoặc bullet list các block UI

## Components
| Component | Vị trí | Trách nhiệm |
|-----------|--------|-------------|

## State
| State | Loại (local/store) | Vì sao |

## Edge cases
- Empty data
- Loading
- Error
- Overdue / negative SP / null assignee / …

## Backend (nếu có)
- Endpoint
- Request/response shape

## Liên quan
- Skills nào nên đọc trước khi sửa
- Feature khác bị ảnh hưởng
```

---

## Shared Utilities

| Loại | Vị trí | Cách dùng |
|------|--------|----------|
| Shared backend utils | `backend/core/` | `from backend.core.<module> import ...` |
| Shared React components | `frontend/src/components/shared/` | `import { MetricCard } from '@/components/shared/MetricCard'` |
| UI primitives | `frontend/src/components/ui/` | `import { Button } from '@/components/ui/button'` |
| API wrappers | `frontend/src/lib/api.ts` | `import { tasksApi } from '@/lib/api'` |
| Normalizer | `frontend/src/lib/normalize.ts` | `import { normTask } from '@/lib/normalize'` |
| Stores | `frontend/src/stores/` | `import { useTaskStore, useFilterStore } from '@/stores'` |

Cross-feature imports bị **cấm**. Cần dùng ở 2+ feature → move sang `core/` / `components/shared/`.

---

## Existing Features

| Feature | Backend | API prefix | Frontend | Tab |
|---------|--------|-----------|---------|----|
| Core (shared infra) | `core/` | `/api/core/` | — | — |
| Dashboard meta | `dashboard/` | `/api/dashboard/` | — | — |
| Tasks (persist) | `tasks/` | `/api/tasks/` | (consumed by all views) | — |
| Team | `team/` | `/api/team/` | (consumed) | — |
| Sprints | `sprints/` | `/api/sprints/` | (consumed) | — |
| Bridge relay | `bridge/` | `/api/bridge/` | `features/connection/` | Connection modal |
| — (FE-only) | — | — | `features/overview/` | Tổng quan |
| — (FE-only) | — | — | `features/charts/` | Charts |
| — (FE-only) | — | — | `features/calendar/` | Calendar |
| — (FE-only) | — | — | `features/team/` | Team |
| — (FE-only) | — | — | `features/kanban/` | Kanban |
| — (FE-only modal) | — | — | `features/create-task/` | Create Task button |

> Một số feature là **FE-only view** (consume taskStore), một số là **BE service** (cung cấp API). Một feature có thể có cả hai.
