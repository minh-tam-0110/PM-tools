# Skills Index

Mỗi file trong `skills/` có YAML frontmatter với `triggers`. Agent load skill khi user prompt hoặc task hiện tại nhắc tới một trong các keyword đó.

---

## Frontmatter Schema

```yaml
---
name: <Display Name>
context: <One-line "khi nào đọc">
skill_type: reference | guide | pattern | checklist
triggers: [keyword1, keyword2, ...]
depends_on: [other-skill.md]   # optional
---
```

---

## Skills Catalog

| File | Type | Triggers | Load khi |
|------|------|----------|---------|
| [architecture.md](architecture.md) | reference | feature, route, service, postMessage, iframe, bridge, normalize, store, layer, blueprint, backend | Thiết kế hoặc debug structure / data flow |
| [coding.md](coding.md) | guide | naming, state, useReducer, store, zustand, API, fetch, error, logging, convention | Viết TS hoặc Python |
| [ui-ux.md](ui-ux.md) | reference | token, color, theme, globals.css, T, prioC, stCfg, spacing, typography, icon | **BẤT KỲ** frontend edit — đọc đầu tiên |
| [ui-patterns.md](ui-patterns.md) | pattern | layout, page, tab, filter bar, kanban, calendar, grid, modal, form, responsive | Build hoặc restructure React page/feature |
| [ui-states.md](ui-states.md) | checklist | hover, focus, disabled, loading, empty, error, overdue, today, a11y, animation | Wire interaction states / a11y |
| [onboarding.md](onboarding.md) | guide | start, new, setup, first-time, orientation | Lần đầu vào repo / sau break dài |

---

## Agent Loading Rules

1. **Luôn load `ui-ux.md`** trước bất kỳ frontend edit — token foundation.
2. Load `ui-patterns.md` khi build page mới hoặc restructure layout.
3. Load `ui-states.md` khi wire interaction / a11y.
4. Skills có thể combine — e.g., build Kanban view = `ui-ux.md` + `ui-patterns.md` + `ui-states.md`.
5. Skills là **authoritative**. Khi rule skill mâu thuẫn với training default → theo skill.

---

## Vietnamese Trigger Equivalents

| Vietnamese | Maps to |
|-----------|---------|
| giao diện, UI, màu sắc, token | ui-ux.md |
| layout, trang, tab, lịch, kanban, bảng, modal | ui-patterns.md |
| hover, focus, trạng thái, loading, rỗng, overdue | ui-states.md |
| backend, route, service, tính năng mới, postMessage, bridge, normalize, store | architecture.md |
| đặt tên, state, hook, API, log | coding.md |
| bắt đầu, người mới, lần đầu | onboarding.md |
