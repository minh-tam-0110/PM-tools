# Kanban

## Mục đích
Board theo trạng thái — PM nhìn bottleneck (cột nào dồn task), drag-drop để chuyển status (roadmap Phase 2).

## Trigger từ user
"Xem flow của tasks / chuyển task qua trạng thái."

## Data input
Từ `taskStore` (sau filter):
- `tasks: Task[]` group by `status`
- Cột theo `STATUSES = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done']`

## Layout
```
┌─ Backlog ─┐ ┌─ To Do ─┐ ┌─ In Prog ─┐ ┌─ Review ─┐ ┌─ Done ─┐
│ 3         │ │ 5       │ │ 8         │ │ 2        │ │ 12     │
├───────────┤ ├─────────┤ ├───────────┤ ├──────────┤ ├────────┤
│ ▣ Card    │ │ ▣ Card  │ │ ▣ Card    │ │ ▣ Card   │ │ ▣ Card │
│ ▣ Card    │ │ ▣ Card  │ │ ▣ Card    │ │ ▣ Card   │ │ ...    │
│ ...       │ │ ...     │ │ ...       │ │          │ │        │
└───────────┘ └─────────┘ └───────────┘ └──────────┘ └────────┘
```
Scroll ngang khi screen hẹp. Cột scroll dọc khi nhiều task.

Card: ID + priority badge + title + module tag + SP + progress bar + assignee avatar + deadline.

## Components
| Component | Vị trí | Trách nhiệm |
|-----------|--------|-------------|
| `KanbanView` | `features/kanban/KanbanView.tsx` | Layout + map columns |
| `KanbanColumn` | `features/kanban/KanbanColumn.tsx` | Header (label + count) + list |
| `KanbanCard` | `features/kanban/KanbanCard.tsx` | Card chi tiết task |

## State
| State | Loại | Vì sao |
|-------|------|--------|
| `tasks` | store | Cross-view |
| Drag state (Phase 2) | local + dnd-kit | Ephemeral |

## Edge cases
- **Cột rỗng** → body "—" + nền dim.
- **Card overdue** → badge cảnh báo + border `danger`.
- **Quá nhiều card 1 cột** → scroll dọc, header dính top.
- **Drag drop (Phase 2)** → optimistic `taskStore.updateStatus(id, newStatus)`; nếu BE on, POST `/api/tasks/{id}/status`; rollback nếu fail.

## Liên quan
- Skills: `ui-patterns.md` (column layout, sticky header), `ui-states.md` (drag/hover/empty).
