# Charts

## Mục đích
4 chart bố trí 2×2, giúp PM phát hiện sớm rủi ro tiến độ và bottleneck nhân sự.

## Trigger từ user
"Xem sprint này có on-track không / ai đang quá tải."

## Data input
Từ `taskStore` (sau filter):
- Burndown: `tasks` của active sprint + `sprints[active]` (start, end, committed SP)
- Velocity: `sprints` đã closed → `committed`, `completed`
- Distribution: `tasks` group by `assignee.id` × `status`
- Donut: `tasks` group by `status`

## Layout
```
┌──────────────────────┬──────────────────────┐
│  Sprint Burndown     │  Sprint Velocity     │
│  (AreaChart)         │  (BarChart)          │
├──────────────────────┼──────────────────────┤
│  Team Distribution   │  Status Donut        │
│  (BarChart stacked)  │  (PieChart)          │
└──────────────────────┴──────────────────────┘
```

## Components
| Component | Vị trí | Trách nhiệm |
|-----------|--------|-------------|
| `ChartsView` | `features/charts/ChartsView.tsx` | Grid 2×2 |
| `BurndownChart` | `features/charts/BurndownChart.tsx` | Area: actual vs ideal, gradient remaining |
| `VelocityChart` | `features/charts/VelocityChart.tsx` | Bar pair committed/completed + reference line trung bình |
| `TeamDistributionChart` | `features/charts/TeamDistributionChart.tsx` | Stacked bar theo người |
| `StatusDonut` | `features/charts/StatusDonut.tsx` | Donut + legend |
| `ChartShell` | `components/shared/charts/ChartShell.tsx` | Wrapper: title + ResponsiveContainer + theme tooltip |

## State
| State | Loại | Vì sao |
|-------|------|--------|
| Active sprint | derive từ `sprints` (status='active') | Không phải user-controlled |
| Burndown ideal line | derive từ committed + duration | Pure compute |

## Edge cases
- **Burndown không có data thực** → fallback bằng line "ideal" + tooltip "chưa đủ data".
- **Velocity < 1 sprint closed** → show empty state "Cần ít nhất 1 sprint hoàn thành".
- **Distribution > 8 người** → scroll hoặc gộp "+ N others" — quyết định khi build.
- **Donut tất cả Done** → pie 1 màu xanh, legend ẩn các status 0.

## Theme rule
- Mọi chart **không hardcode màu** — import từ `lib/constants.ts` (`T`, `stCfg`).
- Tooltip dùng custom component để match theme dark (background `T.card`, border `T.border`).

## Liên quan
- Skills: `ui-ux.md` (token), `ui-patterns.md` (chart sizing responsive).
- Recharts version theo `package.json`.
