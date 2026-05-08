# Projects

## Mục đích
Per-project breakdown — PM xem toàn bộ task của mỗi project, ai làm gì, tiến độ ra sao.

## Trigger từ user
"Xem chi tiết tasks của 1 project / so sánh tiến độ giữa các projects."

## Data input
Từ `taskStore`:
- `tasks: Task[]` group by `task.module`
Derive per project: total / done count, pct, overdue count, distinct sprint names, sortedTasks (priority desc).

## Layout
Stack cards (1 col), mỗi project là 1 Card lớn:

```
┌─────────────────────────────────────────────────────────────────────┐
│ [⌘]  Tile Journey: Triple Match  [Sprint 5]      99%               │
│      56 tasks · 55 done                                              │
│  ─────────────────────────────────────────────────────────────────  │
│  ████████████████████░  99%                                          │
│  ─────────────────────────────────────────────────────────────────  │
│  ● TJ-164  [QC] - Test release IOS    [AV] Tâm   [HIGH]  14-04 ▣▣▣ │
│  ● TJ-163  [QC] - Test Ads            [AV] Tâm   [HIGH]  11-04 ▣▣▣ │
│  ◐ TJ-162  ...                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Components
| Component | Vị trí | Trách nhiệm |
|-----------|--------|-------------|
| `ProjectsView` | `frontend/src/features/projects/ProjectsView.tsx` | Layout, group by project |
| `Card`, `Badge`, `Avatar`, `ProgressBar` | shared | Render |

## State
| State | Loại | Vì sao |
|-------|------|--------|
| `tasks` | store | Cross-view |
| `filters`, `search` | store | Apply filter từ FilterBar |

## Edge cases
- **Project trống** (sprint 0 task) → không hiện trong list (chỉ projects có ≥1 task sau filter).
- **Task không có module** → group "—" placeholder.
- **Multiple sprints trong 1 project** → hiển thị tất cả sprint chips ở header.

## Liên quan
- Skills: `ui-patterns.md` (page shell + cards), `ui-states.md` (overdue highlight).
- Khác với **Members** view ở chỗ group theo project thay vì theo người.
