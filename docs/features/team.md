# Team

## Mục đích
Per-person breakdown — PM thấy từng người đang làm gì, % hoàn thành, có quá tải không.

## Trigger từ user
"Xem chi tiết workload của team / từng người."

## Data input
Từ `taskStore`:
- `team: Member[]`
- `tasks: Task[]` group by `assignee.id`
Derive per member: total / done count, pct, byStatus, sortedTasks (priority desc).

## Layout
Grid responsive (1 col mobile / 2-3 col desktop). Mỗi member 1 Card lớn:

```
┌────────────────────────────────────────────────┐
│ [AV]  Minh Trí          78% ████████░░         │
│       Frontend Dev      • 7/9 done              │
│  ─────────────────────────────────────────────  │
│  Backlog 1  · ToDo 1  · InProg 2  · Done 5     │
│  ─────────────────────────────────────────────  │
│  ▣ [HIGH] Fix login timeout       2026-05-20   │
│  ▣ [MED]  Update profile page     2026-05-22   │
│  ! [CRIT] Logcat parser           2026-05-10   │  ← overdue highlight
│  ...                                            │
└────────────────────────────────────────────────┘
```

## Components
| Component | Vị trí | Trách nhiệm |
|-----------|--------|-------------|
| `TeamView` | `features/team/TeamView.tsx` | Grid + map members |
| `MemberCard` | `features/team/MemberCard.tsx` | Avatar + header + breakdown + tasks |
| `StatusBreakdown` | `components/shared/StatusBreakdown.tsx` | 5 badge inline số task / status |
| `TaskRow` | `components/shared/TaskRow.tsx` | Một dòng compact (priority + title + deadline + mini progress) |

## State
| State | Loại | Vì sao |
|-------|------|--------|
| `team`, `tasks` | store | Cross-view |
| Sort/filter trong card | local | Ephemeral |

## Edge cases
- **Member 0 task** → Card vẫn hiện, body "Không có task nào".
- **Overdue trong list** → highlight nền `dangerSoft` cho row.
- **Avatar rỗng** → fallback initials.
- **Member không có trong team[] nhưng task có assignee** → group thành "Khác" / "Unknown" cuối cùng.

## Liên quan
- Skills: `ui-patterns.md` (responsive grid), `ui-states.md` (overdue highlight).
