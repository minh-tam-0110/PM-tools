---
name: Onboarding
context: Quick-start, mental model, first task walkthrough
skill_type: guide
triggers: [start, new, setup, first-time, orientation, bắt đầu, người mới]
depends_on: [architecture.md, ui-ux.md]
---

# Onboarding

15 phút để hiểu được PM Dashboard và làm task đầu tiên.

---

## Mental Model (1 phút)

- Project = **PM Dashboard cho Wolffun**, hiển thị task từ Review 360°.
- Có **5 view**: Overview, Charts, Calendar, Team, Kanban — đều consume cùng 1 store (`taskStore`).
- Data vào dashboard qua **3 nguồn**: `sample` (default), `iframe` (Review 360° postMessage), `manual` (paste JSON).
- Mọi data ngoài đi qua `lib/normalize.ts` trước khi vào store. UI components luôn nhận canonical shape.
- BE optional — chỉ cần khi muốn persist task.

---

## Repo Tour (3 phút)

```
CLAUDE.md              ← entry point cho agent — đọc trước
PROJECT.md             ← spec gốc (giữ làm reference)
docs/
  README.md            ← index
  ARCHITECTURE.md      ← layer + data flow
  FEATURE_GUIDE.md     ← cách thêm feature
  SETUP.md             ← setup môi trường
  features/<name>.md   ← doc per feature
skills/                ← rule files (architecture, coding, ui-ux, ui-patterns, ui-states)
backend/
  app.py
  features/<name>/
  core/
frontend/
  src/
    features/<name>/
    components/{ui,shared,layout}/
    hooks/, lib/, stores/, styles/
```

---

## Setup (5 phút)

```bash
cd frontend && npm install && npm run dev   # http://localhost:5173
# (optional) BE
pip install -r backend/requirements.txt
python run.py --dev                          # http://localhost:5000
```

Mở browser, mặc định thấy **Sample Data**. Click 5 tab để xem các view.

---

## First Task — Walkthrough (6 phút)

### Yêu cầu giả định: "Thêm field `tags: string[]` vào Task"

**Step 1 — Đọc.** `docs/ARCHITECTURE.md > Canonical Task Shape` + `skills/architecture.md > Normalize Boundary`.

**Step 2 — Đặt câu hỏi.**
- `tags` lấy từ field nào trong raw data Review 360°? → user trả lời (giả sử `labels` hoặc `tags`).
- Hiển thị ở đâu? Filter bar có thêm tags không? → giả sử có ở Kanban card + filter optional.

**Step 3 — Plan.**
1. Mở rộng type `Task` trong `frontend/src/lib/types.ts`.
2. Update `lib/normalize.ts`: map `raw.labels ?? raw.tags ?? [] → canonical.tags`.
3. Update `KanbanCard.tsx`: render tag pills.
4. (Optional) thêm filter trong `filterStore` + `FilterBar`.
5. Update `docs/features/kanban.md` để mention tags.

**Step 4 — Code surgically.**
- Mỗi diff có lý do trace tới yêu cầu.
- Không thêm filter tags nếu chưa rõ user muốn — hỏi trước.

**Step 5 — Verify.**
- Sample data cập nhật vài task có `tags: ['urgent', 'iap']` để test.
- Build TS: `npm run build` pass.
- Smoke 5 view: Kanban có tag pill, các view khác không bị crash.

**Step 6 — Commit.** Một concern duy nhất: "Add tags to Task model + render in Kanban card".

---

## Common Pitfalls

- **Quên validate `event.origin`** trong `useDataBridge` → security hole.
- **Normalize ở component thay vì lib/normalize.ts** → drift, bug khó tìm.
- **Selector tạo array literal** (`s.tasks ?? []`) → infinite re-render.
- **Hex hardcode trong JSX** → break dark/light future, không reusable.
- **Mix `useEffect` + `setState` cho derive** → dùng `useMemo`.

---

## Cheat Sheet

| Cần | Đi đâu |
|-----|-------|
| Thêm field vào Task | `lib/types.ts` + `lib/normalize.ts` |
| Đổi màu | `lib/constants.ts` (T, prioC, stCfg) + `styles/globals.css` |
| Thêm view mới | `features/<new>/<New>View.tsx` + tab vào `TabBar.tsx` |
| Thêm BE endpoint | `backend/features/<name>/routes/*.py` (auto-discovered) |
| Sửa filter | `stores/filterStore.ts` + `components/shared/FilterBar.tsx` |
| Sửa data bridge | `hooks/useDataBridge.ts` |
| Persist data | `backend/features/tasks/services/task_store.py` |
