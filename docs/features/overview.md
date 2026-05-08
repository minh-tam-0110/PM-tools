# Tổng quan (Overview)

## Mục đích
Cho PM cái nhìn tổng quan trong < 5 giây: hoàn thành bao nhiêu %, có bao nhiêu task overdue, ai đang làm gì, tiến độ theo module.

## Trigger từ user
"Mở dashboard buổi sáng để check tình trạng team."

## Data input
Từ `taskStore`:
- `tasks: Task[]`
- `team: Member[]`
- `sprints: Sprint[]` (để filter theo active sprint)

Sau khi pass qua `filterStore`, derive bằng `useMemo`:
- `completionPct = doneCount / totalCount`
- `overdueCount = tasks.filter(t => t.status !== 'Done' && t.deadline < today).length`
- `inProgressCount`, `totalSP`, `doneSP`
- `byStatus: Record<Status, number>` cho stacked bar
- `byModule: { module, total, done, pct }[]` cho progress table

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [MetricCard %]  [MetricCard Overdue]  [MetricCard In Prog]  [MetricCard SP] │
├─────────────────────────────────────────────────────────────┤
│  Stacked status bar (Backlog | To Do | In Progress | Review | Done)        │
├─────────────────────────────────────────────────────────────┤
│  Module progress table                                                      │
│   - Battle System    ████████░░  72%  (12/16 done)                          │
│   - UI/HUD           ██████░░░░  55%  (6/11)                                │
│   ...                                                                       │
└─────────────────────────────────────────────────────────────┘
```

## Components
| Component | Vị trí | Trách nhiệm |
|-----------|--------|-------------|
| `OverviewView` | `frontend/src/features/overview/OverviewView.tsx` | Layout chính, hold `useMemo` derivation |
| `MetricCard` | `components/shared/MetricCard.tsx` | 1 thẻ metric (label, value, delta, icon, color) |
| `StatusStackedBar` | `features/overview/StatusStackedBar.tsx` | Stacked bar tỷ lệ status |
| `ModuleProgressTable` | `features/overview/ModuleProgressTable.tsx` | Progress bar theo module |

## State
| State | Loại | Vì sao |
|-------|------|--------|
| `tasks`, `team` | `useTaskStore` | Cross-view |
| `filter` | `useFilterStore` | Apply filter từ FilterBar |
| Derived metrics | `useMemo` trong `OverviewView` | Pure derivation, không cần store |

## Edge cases
- **Empty data** → "Chưa có task nào. Kết nối Review 360° hoặc import JSON." + nút Connect.
- **All tasks Done** → completion = 100%, status bar full xanh.
- **No active sprint** → show "Không có sprint đang chạy" trong subtitle metric.
- **Overdue + Done** → KHÔNG tính là overdue (đã xong).
- **Module trống** → ẩn row đó.

## Liên quan
- Skills: `ui-ux.md` (token màu cho metric), `ui-patterns.md` (page shell + grid).
- Đụng tới `taskStore` shape → đọc lại `ARCHITECTURE.md > Canonical Task Shape`.
