---
name: UI Patterns
context: Page shell, tab bar, filter bar, kanban column, calendar grid, modal, form, responsive
skill_type: pattern
triggers: [layout, page, tab, filter, kanban, calendar, grid, modal, form, responsive, table, drawer]
depends_on: [ui-ux.md]
---

# UI Patterns

Pattern tái dùng cho PM Dashboard. Đọc sau `ui-ux.md`.

---

## Page Shell

```
<AppLayout>
  <Header />              ← connection badge, search, refresh, connect, create
  <TabBar />              ← 5 tab: Overview, Charts, Calendar, Team, Kanban
  <FilterBar />           ← sprint, member, priority, module, clear
  <main className="px-6 py-4">
    <ActiveView />        ← OverviewView | ChartsView | …
  </main>
</AppLayout>
```

`AppLayout` width: `min-h-screen`, max-w `1440px` desktop, full-bleed mobile. Header + TabBar + FilterBar dính top (sticky), content scroll.

---

## Header

Layout: flex row, `h-14`, `px-6`, bg `surface`, border-b `border`.

```
[ Logo + Title ]   [ ● Live | ● Manual | ● Sample ]   [ search ]   [↻]   [🔗 Connect]   [✚ Create]
```

- Connection badge: dot màu (`ok` / `info` / `warn`) + label + last sync (caption).
- Search: w-64 desktop, w-full mobile (drawer).
- Buttons: shadcn `<Button>` sizes `sm`.

---

## Tab Bar

Horizontal, `h-12`, sticky dưới Header.

```
[ Tổng quan ] [ Charts ] [ Calendar ] [ Team ] [ Kanban ]
```

- Active tab: text `text`, underline 2px `accent`, bg `accentSoft`.
- Inactive: text `textSec`, hover bg `cardAlt`.
- Mobile: scroll ngang, fade gradient ở edge.

---

## Filter Bar

Flex row gap-2, `h-12`, bg `surface`, border-b.

```
[Sprint ▼] [Người ▼] [Priority ▼] [Module ▼]   [✕ Xóa]
```

- Mỗi dropdown shadcn `<Select>`.
- "Xóa" chỉ hiện khi có ít nhất 1 filter active.
- Mobile: collapse vào icon button → mở Drawer.

---

## Metric Card

```
┌─────────────────────────────────┐
│ HOÀN THÀNH               [icon] │   ← label uppercase 11px textSec
│ 78%                             │   ← value 28/800
│ +5% vs sprint trước             │   ← delta 11px ok/danger
└─────────────────────────────────┘
```
Width `flex-1`, padding `p-5`, radius `rounded-xl`, bg `card`.

Grid container: `grid grid-cols-2 md:grid-cols-4 gap-3`.

---

## Stacked Status Bar

Single horizontal bar `h-2`, segments tỷ lệ theo `byStatus`. Hover segment → tooltip count + status.

---

## Kanban Column

```
┌─ <Status>     <count> ─┐    ← header sticky top trong column
│  ┌─ KanbanCard ─┐      │
│  │   ...        │      │
│  └──────────────┘      │
│  ┌─ KanbanCard ─┐      │
│  └──────────────┘      │
└────────────────────────┘
```

- Width: `w-72` (288px) fixed.
- Container: `flex gap-3 overflow-x-auto pb-4`.
- Column body: `flex flex-col gap-2 overflow-y-auto`, max-h `calc(100vh - 280px)`.

---

## Calendar Week Grid

`grid-cols-7 gap-px bg-border` (border = 1px gap).

Mỗi `DayColumn`:
```
┌─────────────┐
│ T2  06      │   ← header h-10 px-3, today: bg accentSoft + text accent
├─────────────┤
│ ▣ Card      │
│ ▣ Card      │
│ ...         │
└─────────────┘
```

## Calendar Month Grid

`grid-cols-7 grid-rows-6 gap-px`.

Mỗi `MonthCell`: header ngày 11px + dot list (max 3) + "+N more".

---

## Task Card (shared)

```
┌─────────────────────────────────┐
│ T-042  [HIGH]                   │   ← id 11px textSec, priority badge
│ Fix login timeout               │   ← title 14/600
│ [Backend API]  · 5 SP           │   ← module tag + SP
│ ████████░░  60%                 │   ← progress bar (mini, h-1)
│ [AV] Minh Trí       2026-05-20  │   ← avatar + assignee + deadline
└─────────────────────────────────┘
```
Padding `p-3`, gap `gap-2`, radius `rounded-lg`, bg `card`, hover bg `cardAlt`.

---

## Form (Create Task Modal)

```
<Dialog>
  <DialogContent className="max-w-xl">
    <DialogHeader>
      <DialogTitle>Tạo Task</DialogTitle>
    </DialogHeader>
    <form className="grid grid-cols-2 gap-4">
      <Field label="Title*" colSpan={2}>...</Field>
      <Field label="Assignee">...</Field>
      <Field label="Sprint">...</Field>
      ...
      <Field label="Description" colSpan={2}>...</Field>
    </form>
    <DialogFooter>
      <Button variant="ghost">Hủy</Button>
      <Button>Tạo Task</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- Field label 11px uppercase.
- Required → `*` đỏ.
- Inline error 11px `danger`, dưới input.

---

## Empty State

```
   [ icon size=24 textMuted ]
   Chưa có task nào
   Kết nối Review 360° hoặc import JSON
   [ Connect ]   [ Import JSON ]
```
Center, padding `py-16`.

---

## Responsive Breakpoints

| Breakpoint | Tailwind | Layout impact |
|-----------|----------|---------------|
| < 640 | base | TabBar scroll, FilterBar drawer, metric grid 2-col, kanban scroll-x |
| ≥ 768 | `md:` | Metric grid 4-col, calendar month visible |
| ≥ 1024 | `lg:` | Sidebar (nếu có), team grid 2-col |
| ≥ 1280 | `xl:` | Team grid 3-col, container max-w 1440 |

---

## Loading Skeleton

Dùng shadcn `<Skeleton>` cho card placeholder. Animation `animate-pulse` (Tailwind built-in).

---

## Modal / Drawer

- Modal cho action ngắn (Create Task, Connect).
- Drawer cho list dài (mobile filter).
- Mọi modal có ESC close + backdrop click close + focus trap (shadcn `<Dialog>` sẵn).
