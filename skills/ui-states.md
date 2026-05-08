---
name: UI States
context: Hover, focus, disabled, loading, empty, error, overdue, today, a11y, animation
skill_type: checklist
triggers: [hover, focus, disabled, loading, empty, error, overdue, today, a11y, skeleton, animation, micro-interaction]
depends_on: [ui-ux.md]
---

# UI States Checklist

Mọi component interactive đi qua checklist này trước khi merge.

---

## Interactive States

| State | Visual |
|-------|--------|
| Default | Bg `card`, border `border`, text `text` |
| Hover | Bg `cardAlt`, border `borderLight`, transition 120ms |
| Focus-visible | Outline 2px `accent`, offset 2 |
| Active / pressed | Bg darker (multiply 0.95) |
| Disabled | Opacity 0.5, cursor `not-allowed`, no hover effect |
| Selected | Bg `accentSoft`, border `accent`, text `accent` |

**Bắt buộc**: KHÔNG bỏ focus-visible (a11y). Tailwind `focus-visible:ring-2 focus-visible:ring-[var(--accent)]`.

---

## Loading

- Button submitting: spinner `<Loader2 className="animate-spin" />` thay icon, disable.
- Card loading: `<Skeleton>` shape giống content thật.
- Page loading: skeleton hoặc thin top progress bar (`h-0.5 bg-accent animate-pulse`).
- KHÔNG full-page spinner (UX kém với data có thể partial).

---

## Empty States

| Where | Pattern |
|-------|---------|
| No tasks | Icon + message + 2 CTA (Connect, Import) |
| Filter quá hẹp | Icon + "Không có task khớp filter" + nút "Xóa filter" |
| Cột Kanban trống | "—" centered, dim text |
| Member 0 task | "Không có task nào" trong card body |
| Chart không đủ data | "Cần ít nhất N data point" |

---

## Error States

- Toast (shadcn `<Toaster>`) cho async error: bg `dangerSoft`, border `danger`, icon ⚠.
- Inline form error: text 11px `danger` dưới field.
- Page-level error (load fail): card với icon + message + nút "Thử lại".

---

## Overdue Highlight

Áp dụng cho task có `deadline < today && status !== 'Done'`:
- Background row: `dangerSoft`
- Deadline text: `danger`, font weight 600
- Icon: `<AlertTriangle className="h-3.5 w-3.5" />` cạnh deadline

---

## Today Highlight (Calendar)

- DayColumn header (week): bg `accentSoft`, text `accent`, border-l 2px `accent`.
- MonthCell (month): ring-2 `accent` inset.
- Subtle glow: `box-shadow: 0 0 0 1px var(--accent), 0 4px 16px rgba(124,106,239,0.2)`.

---

## Connection Status (Header badge)

| Src | Color | Label |
|-----|-------|-------|
| `'sample'` | warn | "Sample Data" |
| `'iframe'` & connected | ok | "Live Connected" |
| `'iframe'` & loading | info pulse | "Đang kết nối..." |
| `'iframe'` & error | danger | "Lỗi kết nối" |
| `'manual'` | info | "Manual Import" |

Pulse: `animate-pulse` Tailwind cho loading.

---

## Micro-interactions

- Card hover: `transition: background 120ms, border 120ms`.
- Button press: `active:scale-[0.98]` (subtle).
- Tab switch: underline animate `transition-all duration-200`.
- Toast enter/exit: shadcn default (slide + fade).
- Number tăng/giảm (metric): KHÔNG animate count-up (tăng noise, không value).

---

## Animation Performance

- Chỉ animate `transform` và `opacity`. KHÔNG animate `width`, `height`, `top`, `left`.
- Chart re-render: dùng Recharts `isAnimationActive={false}` khi data update thường xuyên (auto-refresh) để tránh nháy.

---

## A11y Checklist

- [ ] Mọi button có `aria-label` nếu chỉ icon.
- [ ] Form input có `<label>` (htmlFor + id).
- [ ] Modal: focus trap + ESC close + restore focus về trigger sau khi close.
- [ ] Color contrast ≥ 4.5:1 cho body text. `textMuted` chỉ dùng cho info phụ, không content chính.
- [ ] Status / priority KHÔNG chỉ phân biệt bằng màu — kèm icon hoặc text.
- [ ] Keyboard: Tab di chuyển hợp lý, Enter submit form, Esc close modal.
- [ ] `prefers-reduced-motion: reduce` → tắt animation không thiết yếu.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## Self-check trước merge

- [ ] Hover, focus-visible, disabled đều có visual khác biệt.
- [ ] Loading state cho mọi async action.
- [ ] Empty state cho list / table / chart.
- [ ] Overdue/today highlight (nếu liên quan time).
- [ ] Toast / inline error cho mọi catch path.
- [ ] Tested keyboard-only: Tab/Shift-Tab/Enter/Esc.
- [ ] Tested với sample data có 0/1/many items.
