# Calendar

## Mục đích
Lịch deadline trực quan theo tuần / tháng để PM plan workload.

## Trigger từ user
"Tuần này có deadline gì? / Tháng tới ai bận nhất?"

## Data input
Từ `taskStore` (sau filter):
- `tasks: Task[]` — group by `deadline` (YYYY-MM-DD)
- Mode: `'week' | 'month'`
- Anchor date: state local `currentDate`

## Layout

### Tuần (7 cột)
```
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │
│ 06  │ 07  │ 08★ │ 09  │ 10  │ 11  │ 12  │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ ▣ T │     │ ▣ T │ ! T │     │     │     │
│ ▣ T │     │     │     │     │     │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```
Mỗi card: priority badge + title + assignee avatar; overdue highlight đỏ.

### Tháng (7 × 6 = 42 ô)
Task hiển thị dạng dot rút gọn + tên ellipsis. Ngày có overdue → badge cảnh báo góc phải.

## Components
| Component | Vị trí | Trách nhiệm |
|-----------|--------|-------------|
| `CalendarView` | `features/calendar/CalendarView.tsx` | Mode switch + header navigation |
| `WeekGrid` | `features/calendar/WeekGrid.tsx` | 7 cột, render `DayColumn` |
| `MonthGrid` | `features/calendar/MonthGrid.tsx` | 7×6 grid, render `MonthCell` |
| `DayColumn` | `features/calendar/DayColumn.tsx` | Header ngày + list `TaskCard` |
| `MonthCell` | `features/calendar/MonthCell.tsx` | Header ngày + list dot + overdue badge |
| `TaskCard` | `components/shared/TaskCard.tsx` | Card task tái dùng được ở Calendar / Kanban |

## State
| State | Loại | Vì sao |
|-------|------|--------|
| `mode` (week/month) | local | UI ephemeral |
| `currentDate` | local | Per-view scrub |
| `tasks` | store | Cross-view |

## Edge cases
- **Today highlight** — accent border + glow (xem `ui-states.md`).
- **Overdue & not Done** → background đỏ nhạt, text danger.
- **> 5 task / day (week)** → scroll dọc trong cột.
- **> 3 task / day (month)** → "+N more" dot.
- **Tuần đầu / cuối tháng (month grid)** — fill ngày tháng trước/sau, dim text.

## Liên quan
- Skills: `ui-ux.md` (color overdue/today), `ui-states.md` (today glow), `ui-patterns.md` (responsive: month grid mobile fold sang week).
