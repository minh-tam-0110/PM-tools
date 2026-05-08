# Create Task

## Mục đích
PM tạo task mới trực tiếp từ dashboard, không cần switch sang Review 360°.

## Trigger từ user
"Tạo task mới."

## Data input
Form fields:
- title (required)
- assignee (select từ `team`)
- sprint (select từ `sprints`, default = active)
- status (default 'To Do')
- priority (default 'Medium')
- module (select từ MODULES const)
- sp (number, default 3)
- deadline (date picker)
- description (textarea, optional)

## Layout
Modal 600px, form 2-column responsive.

```
┌─ Tạo Task ─────────────────────── [×] ─┐
│ Title*  [_______________________]      │
│ Assignee [▼ select  ]  Sprint [▼ ]    │
│ Status   [▼ To Do   ]  Priority [▼ ]  │
│ Module   [▼ select  ]  SP     [_3_]   │
│ Deadline [📅 2026-05-15           ]   │
│ Description                            │
│ [______________________________ ]      │
│                                        │
│            [ Hủy ] [ Tạo Task ]        │
└────────────────────────────────────────┘
```

## Components
| Component | Vị trí | Trách nhiệm |
|-----------|--------|-------------|
| `CreateTaskModal` | `features/create-task/CreateTaskModal.tsx` | Modal + form state + submit |
| `TaskForm` | `features/create-task/TaskForm.tsx` | Field-level rendering |
| `useTaskMutation` | `hooks/useTaskMutation.ts` | submit logic (optimistic + sync) |

## State
| State | Loại | Vì sao |
|-------|------|--------|
| Modal open | parent (`App.tsx`) hoặc `connStore` | Trigger từ Header button |
| Form fields | local `useState` | Ephemeral |
| Submit pending | local | UI lock button |

## Submit flow
1. Validate locally (title not empty, deadline valid date).
2. Generate `id = "T-" + nanoid(6)`.
3. **Optimistic**: `taskStore.add(newTask)` → modal close, view re-render.
4. **Side effects** (parallel):
   - Nếu `connStore.src === 'iframe'`: `postMessage({ type: 'CREATE_TASK', task })`.
   - Nếu BE on: `POST /api/tasks` → response replace optimistic.
5. **Rollback** nếu BE fail: `taskStore.remove(id)` + toast error.

## Edge cases
- **Không có team / sprint data** → assignee/sprint dropdown hiện "Chưa có data, kết nối Review 360° trước". Vẫn cho tạo, để string thô.
- **Deadline trong quá khứ** → warn (không block).
- **SP = 0** → cảnh báo "Story points = 0?" (không block).
- **Iframe disconnect giữa chừng** → vẫn add local; show toast "Task chưa sync về Review 360°".

## Liên quan
- Skills: `ui-patterns.md` (form layout), `ui-states.md` (validation, loading button).
- ARCHITECTURE.md > Canonical Task Shape.
