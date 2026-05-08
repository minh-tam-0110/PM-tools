---
name: UI / UX Tokens
context: Design tokens (T, prioC, stCfg), typography, color usage, icon rules, spacing scale
skill_type: reference
triggers: [token, color, theme, globals.css, T, prioC, stCfg, spacing, typography, icon, font, glass, gradient, giao diện, màu sắc]
depends_on: []
---

# UI / UX Tokens

**Đọc file này TRƯỚC bất kỳ frontend edit nào.**

---

## Color Tokens (`T`)

Sống ở `frontend/src/lib/constants.ts`. Tailwind `@theme` ở `frontend/src/styles/globals.css` mirror các token này thành CSS var.

| Token | Hex | Dùng cho |
|-------|-----|---------|
| `bg` | `#0C0F17` | Background app |
| `surface` | `#111827` | Header, filter bar |
| `card` | `#151C2C` | Card chính |
| `cardAlt` | `#1A2236` | Card nested / hover |
| `border` | `#1F2A40` | Border default |
| `borderLight` | `#293550` | Border hover/focus |
| `text` | `#E8ECF4` | Body text |
| `textSec` | `#8B95AB` | Label, caption |
| `textMuted` | `#566075` | Disabled text |
| `accent` | `#7C6AEF` | Primary action, active tab |
| `accentSoft` | `rgba(124,106,239,0.12)` | Active tab bg, badge |
| `ok` | `#34D399` | Success, Done, connected |
| `okSoft` | `rgba(52,211,153,0.1)` | Success bg |
| `warn` | `#FBBF24` | Review, warning |
| `danger` | `#F87171` | Error, overdue |
| `info` | `#60A5FA` | In Progress, info |
| `cyan` | `#22D3EE` | Chart accent |
| `pink` | `#F472B6` | Chart accent |

**Rule:**
- KHÔNG hardcode hex trong feature components. Dùng `T.x` hoặc CSS var (`var(--accent)`).
- Soft variant dùng cho background (badge, hover); solid dùng cho text/border/icon.

---

## Status Tokens (`stCfg`)

```ts
{
  Backlog:       { c: "#6B7280", bg: "rgba(107,114,128,0.1)", i: "○" },
  "To Do":       { c: "#A78BFA", bg: "rgba(167,139,250,0.1)", i: "◔" },
  "In Progress": { c: "#60A5FA", bg: "rgba(96,165,250,0.1)",  i: "◐" },
  Review:        { c: "#FBBF24", bg: "rgba(251,191,36,0.1)",  i: "◑" },
  Done:          { c: "#34D399", bg: "rgba(52,211,153,0.1)",  i: "●" },
}
```
- `c` = text/icon color
- `bg` = badge / pill background
- `i` = icon (Unicode glyph)

Helper: `stOf(status)` → fallback Backlog.

---

## Priority Tokens (`prioC`)

```ts
{
  Critical: { c: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  High:     { c: "#F97316", bg: "rgba(249,115,22,0.1)" },
  Medium:   { c: "#EAB308", bg: "rgba(234,179,8,0.1)" },
  Low:      { c: "#6B7280", bg: "rgba(107,114,128,0.08)" },
}
```

---

## Typography

Font: **DM Sans** (Google Fonts), weight 300–800.

| Use | Size | Weight | Letter-spacing |
|-----|------|--------|----------------|
| Metric value | 28px | 800 | -0.02em |
| Page / section title | 15px | 700 | -0.01em |
| Card title | 14px | 600 | 0 |
| Body | 12-13px | 500 | 0 |
| Label / badge | 10-11px | 600 | 0.04em (uppercase) |
| Caption / muted | 11px | 500 | 0 |

Số liệu (SP, %, count) dùng **tabular-nums** (`font-feature-settings: "tnum"`).

---

## Spacing Scale

Theo Tailwind default (4px base): 1=4, 2=8, 3=12, 4=16, 6=24, 8=32.

| Context | Spacing |
|--------|---------|
| Card padding | `p-4` (16) hoặc `p-5` (20) |
| Card gap (grid) | `gap-3` hoặc `gap-4` |
| Section gap | `gap-6` (24) |
| Inline icon-text | `gap-1.5` (6) |
| Form field stack | `gap-3` (12) |
| Modal padding | `p-6` (24) |

---

## Border / Radius

| Element | Radius |
|---------|--------|
| Button, badge, pill | `rounded-md` (6) |
| Card | `rounded-xl` (12) |
| Modal | `rounded-2xl` (16) |
| Avatar | `rounded-full` |
| Chart container | `rounded-xl` (12) |

Border luôn `1px solid var(--border)`. Hover → `var(--border-light)`.

---

## Icon Rules

- Bộ icon: **lucide-react** (đã ship trong shadcn).
- Size: 14 (badge inline), 16 (button), 20 (header), 24 (empty state).
- Stroke `1.5` (consistent với DM Sans weight medium).
- KHÔNG mix với emoji trong cùng container — chọn 1.
- Status icon trong `stCfg.i` là Unicode glyph, KHÔNG dùng lucide cho status.

---

## Background Layers

```
bg (app)
  └─ surface (header / filter bar / sidebar)
      └─ card (content card)
          └─ cardAlt (nested item / hover)
```

KHÔNG nest sâu hơn 2 cấp card — flatten thay.

---

## Charts (Recharts)

- Background: `T.card`.
- Grid: `T.border` dashed `3 3`.
- Axis tick: `T.textSec`, font 11.
- Tooltip: custom — bg `T.card`, border `T.border`, shadow `0 8px 24px rgba(0,0,0,0.4)`.
- Gradient (Burndown): từ `T.accent` 0.6 opacity → `T.accent` 0 opacity.
- Bar radius: `[6, 6, 0, 0]`.
- Reference line: `T.warn` dashed.

Wrapper: `components/shared/charts/ChartShell.tsx` (title + ResponsiveContainer + tooltip theme).

---

## Glass / Blur

Modal overlay: `bg-black/60 backdrop-blur-sm`.
KHÔNG dùng glass cho card body — giữ solid để contrast text.

---

## Forbidden

- ❌ Hex literal trong component (`#7C6AEF`) — import từ `T` hoặc CSS var.
- ❌ `style={{ color: 'red' }}` inline — dùng class hoặc token.
- ❌ Mix font khác DM Sans.
- ❌ `!important` trong Tailwind class trừ override shadcn.
