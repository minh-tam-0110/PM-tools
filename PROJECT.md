# Wolffun PM Dashboard — Project Documentation

> **Tool quản lý tiến độ task** dành cho Project Manager tại Wolffun Game, tích hợp dữ liệu từ Review 360° nội bộ.

---

## 1. Tổng quan dự án

### 1.1 Mục đích

Dashboard giúp PM theo dõi tiến độ task của team mà không cần mở nhiều tab hay vào tool gốc. Tất cả dữ liệu được kéo về một giao diện thống nhất, hỗ trợ nhiều góc nhìn khác nhau để đưa ra quyết định nhanh.

### 1.2 Vấn đề cần giải quyết

Review 360° (wolffun-review.web.app) là công cụ nội bộ của Wolffun Game chạy trên Firebase Hosting. Tool này yêu cầu đăng nhập và không cung cấp public API, khiến việc tổng hợp dữ liệu across team members trở nên thủ công và tốn thời gian. PM cần:

- Xem nhanh tỷ lệ hoàn thành, task overdue, workload mỗi người
- So sánh velocity qua các sprint
- Lịch deadline theo tuần/tháng
- Tạo task mới trực tiếp không cần chuyển sang tool gốc

### 1.3 Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Framework | React (JSX artifact) |
| Charts | Recharts (AreaChart, BarChart, PieChart) |
| Utilities | Lodash |
| Font | DM Sans (Google Fonts) |
| Hosting | Claude.ai artifact / Standalone deploy |
| Data source | Review 360° via iframe bridge hoặc JSON import |

---

## 2. Kiến trúc hệ thống

### 2.1 Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│                   YOUR DASHBOARD (React)                │
│                                                         │
│  ┌──────────────┐    postMessage     ┌───────────────┐  │
│  │  Iframe       │◄─────────────────►│  Data Layer    │  │
│  │  (hidden)     │   bi-directional  │  (React State) │  │
│  │  wolffun-     │                   │                │  │
│  │  review.web   │                   │  ┌──────────┐  │  │
│  │  .app         │                   │  │ Tasks    │  │  │
│  │               │                   │  │ Team     │  │  │
│  │  Firebase     │                   │  │ Sprints  │  │  │
│  │  Auth inside  │                   │  └──────────┘  │  │
│  └──────────────┘                   └───────┬───────┘  │
│                                             │          │
│  ┌──────────────┐                   ┌───────▼───────┐  │
│  │ Auto-refresh  │──── trigger ────►│  Dashboard     │  │
│  │ 5 min timer   │                  │  Views (5)     │  │
│  │ + Manual btn  │                  └───────────────┘  │
│  └──────────────┘                                      │
│                                     ┌───────────────┐  │
│                                     │ Create Task    │  │
│                                     │ Modal ──► post │  │
│                                     │ back to iframe │  │
│                                     └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow chi tiết

**Luồng đọc dữ liệu (Read):**

1. Dashboard embed `wolffun-review.web.app/my-work` vào hidden iframe
2. User login vào tài khoản Wolffun trong iframe
3. Sau khi auth thành công, script trong iframe đọc DOM (task list, team info)
4. Data được serialize thành JSON và gửi qua `window.postMessage`
5. Dashboard nhận message, parse qua `normalizeImportedData()`, cập nhật React state
6. Tất cả 5 views re-render với data mới

**Luồng tạo task (Write):**

1. PM mở Create Task Modal, điền thông tin
2. Task mới được thêm vào React state ngay lập tức (optimistic update)
3. Nếu iframe đang connected, gửi `CREATE_TASK` message xuống iframe
4. Iframe nhận và submit form trên trang gốc

**Luồng refresh:**

1. Timer tự động trigger mỗi 5 phút (khi ở chế độ iframe)
2. Hoặc PM bấm nút "↻ Refresh" trên header
3. Dashboard gửi `REQUEST_SCRAPE` xuống iframe
4. Iframe đọc lại DOM và gửi data mới lên

### 2.3 Fallback: Manual JSON Import

Vì Firebase Hosting có thể block iframe qua `X-Frame-Options`, dashboard hỗ trợ chế độ Manual:

- PM copy data từ Review 360° (hoặc export JSON/CSV)
- Paste vào textarea trong Connection Panel
- Tool tự parse và map fields phổ biến

---

## 3. Cấu trúc Component

### 3.1 Component Tree

```
App
├── Header
│   ├── Connection Status Badge (Live / Manual / Sample)
│   ├── Search Input
│   ├── Refresh Button
│   ├── Connect Button → ConnPanel modal
│   └── Create Task Button → CreateModal modal
├── TabBar (5 views)
├── Filter Bar (Sprint / Member / Priority / Module)
├── Views
│   ├── VOverview   — Metric cards, status bar, module progress
│   ├── VCharts     — Burndown, Velocity, Team Distribution, Status Donut
│   ├── VCalendar   — Week view (7-column) + Month view (42-cell grid)
│   ├── VTeam       — Per-person breakdown with task list
│   └── VKanban     — Column-based board by status
├── ConnPanel (modal)
│   ├── Tab: Auto (iframe embed)
│   └── Tab: Manual (JSON paste)
└── CreateModal (modal)
    └── Form: title, assignee, sprint, status, priority, module, SP, deadline, desc
```

### 3.2 Hook: useDataBridge()

Hook trung tâm quản lý toàn bộ data flow. Returns:

| Property | Type | Mô tả |
|---|---|---|
| `tasks` | Array | Danh sách task hiện tại |
| `team` | Array | Danh sách thành viên |
| `sprints` | Array | Danh sách sprint |
| `src` | String | Nguồn data: `"sample"` / `"iframe"` / `"manual"` |
| `lastSync` | Date | Thời gian sync gần nhất |
| `iframeSt` | String | Trạng thái iframe: `"idle"` / `"loading"` / `"connected"` / `"error"` |
| `iframeRef` | Ref | React ref cho iframe element |
| `refresh()` | Function | Trigger refresh thủ công |
| `importJSON(str)` | Function | Parse và import JSON string |
| `addTask(task)` | Function | Tạo task mới |

### 3.3 Data Normalizer

Hàm `normTask()` tự động map các field names phổ biến:

| Input field | Mapped to |
|---|---|
| `title`, `name`, `summary` | `title` |
| `assignee` (string hoặc object) | `assignee: { id, name, role, av }` |
| `status` (bất kỳ string) | Mapped to: Backlog, To Do, In Progress, Review, Done |
| `priority` (string hoặc số 1-4) | Mapped to: Critical, High, Medium, Low |
| `deadline`, `dueDate`, `due` | `deadline` (YYYY-MM-DD) |
| `sp`, `storyPoints`, `points` | `sp` (number) |
| `sprint` (string hoặc object) | `sprint: { id, name, start, end, status }` |

---

## 4. Các View chi tiết

### 4.1 Tổng quan (Overview)

Hiển thị 4 metric cards ở trên cùng: % hoàn thành, số task overdue, số task đang làm, và story points. Phía dưới là thanh phân bố trạng thái (stacked bar tỷ lệ) và bảng tiến độ theo module với progress bar.

### 4.2 Charts

Gồm 4 chart bố trí 2×2:

- **Sprint Burndown** (AreaChart) — So sánh đường thực tế vs lý tưởng trong sprint active. Dùng gradient fill để highlight vùng remaining work.
- **Sprint Velocity** (BarChart) — Cặp bar committed/completed cho mỗi sprint đã hoàn thành. Bar completed đổi màu xanh (đạt) hoặc vàng (thiếu). Reference line trung bình velocity.
- **Team Distribution** (BarChart stacked) — Số task theo trạng thái cho mỗi thành viên, giúp phát hiện ai đang bị bottleneck.
- **Status Donut** (PieChart) — Tỷ lệ trạng thái hiện tại dạng donut chart kèm legend.

### 4.3 Calendar

Hai chế độ chuyển đổi:

- **Tuần** — Grid 7 cột, mỗi cột là 1 ngày với danh sách task card chi tiết (assignee avatar, priority badge, overdue highlight). Ngày hôm nay được highlight bằng accent color và border glow.
- **Tháng** — Grid 7×6 (42 ô), task được hiển thị dạng dot rút gọn với status icon và tên task (ellipsis khi dài). Ngày có task overdue sẽ hiện badge cảnh báo.

Navigation: nút trái/phải để chuyển tuần/tháng, nút "Hôm nay" để quay về hiện tại.

### 4.4 Team

Mỗi thành viên 1 Card lớn gồm: avatar, tên, role, % hoàn thành, progress bar, breakdown trạng thái bằng badges, và danh sách tất cả task (sorted by priority) với deadline và mini progress bar. Task overdue được highlight nền đỏ nhạt.

### 4.5 Kanban

Board dạng cột theo trạng thái (Backlog → To Do → In Progress → Review → Done). Mỗi task là 1 card gồm: ID, priority badge, title, module tag, SP, progress bar, assignee avatar, và deadline. Scroll ngang nếu nhiều cột.

---

## 5. Theme & Design System

### 5.1 Color Tokens

| Token | Hex | Sử dụng |
|---|---|---|
| `bg` | `#0C0F17` | Background chính |
| `surface` | `#111827` | Background header, filter bar |
| `card` | `#151C2C` | Background card |
| `accent` | `#7C6AEF` | Primary action, active tab, highlight |
| `ok` | `#34D399` | Success, done, connected |
| `warn` | `#FBBF24` | Warning, review |
| `danger` | `#F87171` | Error, overdue |
| `info` | `#60A5FA` | In progress, info |

### 5.2 Status Colors

| Status | Color | Icon |
|---|---|---|
| Backlog | Gray `#6B7280` | ○ |
| To Do | Purple `#A78BFA` | ◔ |
| In Progress | Blue `#60A5FA` | ◐ |
| Review | Yellow `#FBBF24` | ◑ |
| Done | Green `#34D399` | ● |

### 5.3 Priority Colors

| Priority | Color |
|---|---|
| Critical | Red `#EF4444` |
| High | Orange `#F97316` |
| Medium | Yellow `#EAB308` |
| Low | Gray `#6B7280` |

### 5.4 Typography

- Font: DM Sans (Google Fonts) — tất cả weights từ 300 đến 800
- Metric values: 28px, weight 800
- Section titles: 15px, weight 700
- Body text: 12-13px, weight 500
- Labels/badges: 10-11px, weight 600

---

## 6. postMessage Protocol

### 6.1 Dashboard → Iframe

```json
{ "type": "REQUEST_SCRAPE" }
```

Yêu cầu iframe đọc lại DOM và gửi data mới.

```json
{
  "type": "CREATE_TASK",
  "task": {
    "id": "T-042",
    "title": "Fix login timeout",
    "assignee": { "name": "Minh Trí" },
    "status": "To Do",
    "priority": "High",
    "module": "Backend API",
    "deadline": "2026-05-20",
    "sp": 5
  }
}
```

Yêu cầu iframe tạo task mới trên trang gốc.

### 6.2 Iframe → Dashboard

```json
{
  "type": "WOLFFUN_DATA",
  "tasks": [ ... ],
  "team": [ ... ],
  "sprints": [ ... ]
}
```

Data scrape từ DOM trang Review 360°. Array `tasks` chứa các object với bất kỳ field names nào — dashboard sẽ tự normalize.

```json
{ "type": "WOLFFUN_AUTH_OK" }
```

Xác nhận user đã login thành công.

```json
{ "type": "WOLFFUN_ERROR", "message": "..." }
```

Báo lỗi (VD: session expired).

---

## 7. Manual Import Format

Dashboard chấp nhận JSON ở các dạng sau:

### 7.1 Mảng đơn giản

```json
[
  {
    "id": "TASK-001",
    "title": "Fix login bug",
    "assignee": "Minh Trí",
    "status": "In Progress",
    "priority": "High",
    "module": "Backend API",
    "deadline": "2026-05-12",
    "sprint": "Sprint 21",
    "sp": 5
  }
]
```

### 7.2 Object đầy đủ

```json
{
  "tasks": [ ... ],
  "team": [
    { "id": 1, "name": "Minh Trí", "role": "Frontend Dev" }
  ],
  "sprints": [
    { "id": "s3", "name": "Sprint 21", "start": "2026-04-27", "end": "2026-05-10", "status": "active", "committed": 50, "completed": 32 }
  ]
}
```

### 7.3 Field Mapping tự động

Tool hỗ trợ nhiều tên field khác nhau. Ví dụ, status `"doing"` sẽ map thành `"In Progress"`, priority `"urgent"` sẽ map thành `"Critical"`, field `"dueDate"` sẽ map thành `"deadline"`.

---

## 8. Hướng dẫn sử dụng

### 8.1 Lần đầu mở

Dashboard hiển thị **Sample Data** — dữ liệu mẫu mô phỏng cấu trúc team Wolffun. Header hiện badge vàng "Sample Data". Tất cả views hoạt động bình thường với data mẫu để bạn preview.

### 8.2 Kết nối Review 360°

1. Bấm nút **"🔗 Kết nối"** trên header
2. Chọn tab **"Auto (iframe)"** hoặc **"Manual (paste JSON)"**
3. Với iframe: login tài khoản Wolffun → data tự load
4. Với manual: copy data từ Review 360° → paste JSON → bấm Import
5. Header badge chuyển sang xanh "Live Connected" hoặc xanh dương "Manual Import"

### 8.3 Tạo task mới

1. Bấm nút **"✚ Tạo Task"** trên header
2. Điền form: tên task, assignee, sprint, status, priority, module, SP, deadline
3. Bấm "Tạo Task" → task xuất hiện ngay trên dashboard
4. Nếu đang kết nối iframe, task cũng được gửi về Review 360°

### 8.4 Refresh data

- **Tự động**: Mỗi 5 phút khi ở chế độ iframe
- **Thủ công**: Bấm nút **"↻ Refresh"** bất kỳ lúc nào
- Thời gian sync gần nhất hiển thị trên header

### 8.5 Filter và Search

- **Filter bar**: 4 dropdown (Sprint, Người, Priority, Module) — kết hợp được
- **Search**: Tìm theo tên task, task ID, hoặc tên người
- **Xóa filter**: Nút "✕ Xóa" xuất hiện khi có filter active

---

## 9. Deployment

### 9.1 Chạy trên Claude.ai

File `dashboard.jsx` là React artifact, có thể chạy trực tiếp trên giao diện Claude.ai. Không cần setup thêm.

### 9.2 Standalone Deploy

Để deploy riêng (VD: Firebase Hosting cho team Wolffun):

1. Tạo project React (Vite hoặc CRA)
2. Install dependencies: `npm install recharts lodash`
3. Copy nội dung `dashboard.jsx` vào `src/App.jsx`
4. Build và deploy

Khi deploy standalone, có thể bổ sung:

- Inject scraper script vào iframe để tự động đọc DOM Review 360°
- Kết nối Firestore trực tiếp nếu có access
- Thêm authentication layer riêng
- Persistent storage cho task data (localStorage hoặc backend)

---

## 10. Hạn chế & Cải tiến tương lai

### 10.1 Hạn chế hiện tại

- Iframe có thể bị block bởi X-Frame-Options của Firebase Hosting
- Data chỉ tồn tại trong session (mất khi refresh trang)
- Task tạo mới chỉ thêm vào local state, chưa có persistent backend
- Burndown chart dùng random data nếu không có data thực

### 10.2 Roadmap cải tiến

- **Phase 1**: Kết nối trực tiếp Firebase Firestore (nếu được cấp quyền)
- **Phase 2**: Thêm drag-and-drop trên Kanban board
- **Phase 3**: Thêm Gantt chart / Timeline view
- **Phase 4**: Export report ra PDF/Excel
- **Phase 5**: Notification system cho task overdue
- **Phase 6**: Multi-project support

---

## 11. File Structure

```
project/
├── dashboard.jsx          # Main dashboard — full integrated version
├── dashboard-sample.jsx   # UI sample — simplified single-view demo
├── PROJECT.md             # This document
└── README.md              # Quick start guide (optional)
```

---

*Tài liệu được tạo cho dự án PM Dashboard — Wolffun Game*
*Phiên bản: 3.0 — Tháng 5/2026*
