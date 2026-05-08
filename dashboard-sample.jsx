import { useState, useMemo, useEffect, useRef } from "react";
import _ from "lodash";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from "recharts";

/*
  ╔═══════════════════════════════════════════════════════════════╗
  ║  WOLFFUN PM DASHBOARD — UI SAMPLE                            ║
  ║  Phiên bản đơn giản minh hoạ cấu trúc component & data flow ║
  ║  Dùng làm reference khi customize hoặc mở rộng              ║
  ╚═══════════════════════════════════════════════════════════════╝
*/

// ─── 1. THEME TOKENS ─────────────────────────────────────────
// Tập trung tất cả màu sắc vào 1 object để dễ thay đổi theme
const T = {
  bg: "#0C0F17",
  surface: "#111827",
  card: "#151C2C",
  border: "#1F2A40",
  text: "#E8ECF4",
  textSec: "#8B95AB",
  textMuted: "#566075",
  accent: "#7C6AEF",
  accentSoft: "rgba(124,106,239,0.12)",
  ok: "#34D399",
  okSoft: "rgba(52,211,153,0.1)",
  warn: "#FBBF24",
  danger: "#F87171",
  dangerSoft: "rgba(248,113,113,0.1)",
  info: "#60A5FA",
};

// ─── 2. STATUS & PRIORITY CONFIG ─────────────────────────────
// Mỗi status/priority có color và icon riêng
const STATUS = {
  Backlog:       { color: "#6B7280", bg: "rgba(107,114,128,0.1)", icon: "○" },
  "To Do":       { color: "#A78BFA", bg: "rgba(167,139,250,0.1)", icon: "◔" },
  "In Progress": { color: "#60A5FA", bg: "rgba(96,165,250,0.1)",  icon: "◐" },
  Review:        { color: "#FBBF24", bg: "rgba(251,191,36,0.1)",  icon: "◑" },
  Done:          { color: "#34D399", bg: "rgba(52,211,153,0.1)",  icon: "●" },
};

const PRIORITY = {
  Critical: { color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  High:     { color: "#F97316", bg: "rgba(249,115,22,0.1)" },
  Medium:   { color: "#EAB308", bg: "rgba(234,179,8,0.1)" },
  Low:      { color: "#6B7280", bg: "rgba(107,114,128,0.08)" },
};

const STATUSES = Object.keys(STATUS);
const PRIORITIES = Object.keys(PRIORITY);

// ─── 3. SAMPLE DATA ──────────────────────────────────────────
// Data mẫu — thay bằng data thật từ Review 360°
const TEAM = [
  { id: 1, name: "Minh Trí",   role: "Frontend Dev",   av: "MT" },
  { id: 2, name: "Thanh Hà",   role: "Backend Dev",    av: "TH" },
  { id: 3, name: "Quốc Bảo",   role: "Game Designer",  av: "QB" },
  { id: 4, name: "Mai Linh",   role: "QA Engineer",    av: "ML" },
];

const SPRINTS = [
  { id: "s1", name: "Sprint 19", status: "completed", committed: 45, completed: 43 },
  { id: "s2", name: "Sprint 20", status: "completed", committed: 48, completed: 41 },
  { id: "s3", name: "Sprint 21", status: "active",    committed: 50, completed: 32 },
];

const SAMPLE_TASKS = [
  { id: "T-001", title: "Fix damage calculation", assignee: TEAM[0], sprint: SPRINTS[2], status: "In Progress", priority: "High", module: "Battle System", deadline: "2026-05-09", sp: 5 },
  { id: "T-002", title: "Redesign health bar", assignee: TEAM[0], sprint: SPRINTS[2], status: "Review", priority: "Medium", module: "UI/HUD", deadline: "2026-05-07", sp: 3 },
  { id: "T-003", title: "Optimize match query", assignee: TEAM[1], sprint: SPRINTS[2], status: "Done", priority: "High", module: "Backend API", deadline: "2026-05-06", sp: 8 },
  { id: "T-004", title: "Add rate limiting", assignee: TEAM[1], sprint: SPRINTS[2], status: "In Progress", priority: "Critical", module: "Backend API", deadline: "2026-05-10", sp: 5 },
  { id: "T-005", title: "Fix ELO calculation", assignee: TEAM[2], sprint: SPRINTS[2], status: "To Do", priority: "High", module: "Matchmaking", deadline: "2026-05-12", sp: 5 },
  { id: "T-006", title: "Balance hero stats", assignee: TEAM[2], sprint: SPRINTS[2], status: "Backlog", priority: "Medium", module: "Battle System", deadline: "2026-05-15", sp: 3 },
  { id: "T-007", title: "Purchase validation", assignee: TEAM[3], sprint: SPRINTS[2], status: "Done", priority: "High", module: "Shop & IAP", deadline: "2026-05-05", sp: 5 },
  { id: "T-008", title: "Funnel tracking", assignee: TEAM[3], sprint: SPRINTS[2], status: "In Progress", priority: "Medium", module: "Analytics", deadline: "2026-05-08", sp: 3 },
  { id: "T-009", title: "Chat UI system", assignee: TEAM[0], sprint: SPRINTS[2], status: "To Do", priority: "Low", module: "UI/HUD", deadline: "2026-05-20", sp: 8 },
  { id: "T-010", title: "Session tracking", assignee: TEAM[3], sprint: SPRINTS[1], status: "Done", priority: "Medium", module: "Analytics", deadline: "2026-04-25", sp: 3 },
  { id: "T-011", title: "Region filter", assignee: TEAM[2], sprint: SPRINTS[1], status: "Done", priority: "Low", module: "Matchmaking", deadline: "2026-04-22", sp: 2 },
  { id: "T-012", title: "Auth refresh fix", assignee: TEAM[1], sprint: SPRINTS[1], status: "Done", priority: "High", module: "Backend API", deadline: "2026-04-20", sp: 5 },
].map(t => ({
  ...t,
  isOverdue: t.status !== "Done" && new Date(t.deadline) < new Date(),
  progress: t.status === "Done" ? 100 : t.status === "Review" ? 85 : t.status === "In Progress" ? 40 : 0,
}));

// ─── 4. DATA BRIDGE HOOK ─────────────────────────────────────
// Hook trung tâm quản lý data flow
// Trong bản đầy đủ, hook này xử lý iframe postMessage & auto-refresh
function useDataBridge() {
  const [tasks, setTasks] = useState(SAMPLE_TASKS);
  const [dataSource, setDataSource] = useState("sample"); // sample | iframe | manual
  const [lastSync, setLastSync] = useState(null);

  // === IMPORT JSON (chế độ Manual) ===
  function importJSON(jsonStr) {
    try {
      const raw = JSON.parse(jsonStr);
      const arr = Array.isArray(raw) ? raw : raw.tasks || [];
      const mapped = arr.map((t, i) => ({
        id: t.id || `T-${String(i + 1).padStart(3, "0")}`,
        title: t.title || t.name || "Untitled",
        assignee: typeof t.assignee === "string"
          ? { id: i, name: t.assignee, role: "", av: t.assignee.split(" ").map(w => w[0]).join("").slice(0, 2) }
          : t.assignee || { id: 0, name: "?", role: "", av: "?" },
        sprint: typeof t.sprint === "string"
          ? { id: `s${i}`, name: t.sprint, status: "active" }
          : t.sprint || SPRINTS[2],
        status: mapStatus(t.status),
        priority: mapPriority(t.priority),
        module: t.module || "General",
        deadline: t.deadline || t.dueDate || "2026-05-15",
        sp: t.sp || t.storyPoints || 3,
        isOverdue: false,
        progress: 0,
      }));
      mapped.forEach(t => {
        t.isOverdue = t.status !== "Done" && new Date(t.deadline) < new Date();
        t.progress = t.status === "Done" ? 100 : t.status === "Review" ? 85 : t.status === "In Progress" ? 40 : 0;
      });
      setTasks(mapped);
      setDataSource("manual");
      setLastSync(new Date());
      return { ok: true, count: mapped.length };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // === ADD TASK ===
  function addTask(task) {
    const newTask = {
      ...task,
      id: `T-${String(tasks.length + 1).padStart(3, "0")}`,
      isOverdue: task.status !== "Done" && new Date(task.deadline) < new Date(),
      progress: task.status === "Done" ? 100 : task.status === "Review" ? 85 : task.status === "In Progress" ? 40 : 0,
    };
    setTasks(prev => [...prev, newTask]);
    return newTask;
  }

  return { tasks, dataSource, lastSync, importJSON, addTask };
}

// Helpers cho normalizing data
function mapStatus(s) {
  if (!s) return "Backlog";
  const l = s.toLowerCase();
  if (l.includes("done") || l.includes("complete")) return "Done";
  if (l.includes("review") || l.includes("testing")) return "Review";
  if (l.includes("progress") || l.includes("doing")) return "In Progress";
  if (l.includes("todo") || l.includes("to do")) return "To Do";
  return "Backlog";
}

function mapPriority(p) {
  if (!p) return "Medium";
  const l = (p + "").toLowerCase();
  if (l.includes("critical") || l.includes("urgent")) return "Critical";
  if (l.includes("high")) return "High";
  if (l.includes("low")) return "Low";
  return "Medium";
}

// ─── 5. REUSABLE UI COMPONENTS ───────────────────────────────
// Các component nhỏ dùng chung across views

function Avatar({ name, initials, size = 28 }) {
  const hue = (name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `hsl(${hue},50%,42%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff", flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

function Badge({ children, color, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 7px", borderRadius: 5,
      fontSize: 10, fontWeight: 600,
      color, background: bg, whiteSpace: "nowrap"
    }}>
      {children}
    </span>
  );
}

function ProgressBar({ value, color, height = 5 }) {
  return (
    <div style={{ flex: 1, height, background: "rgba(255,255,255,0.06)", borderRadius: height, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", background: color || T.accent, borderRadius: height, transition: "width 0.5s" }} />
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14, padding: 20,
      ...style
    }}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "16px 18px",
      flex: 1, minWidth: 140, position: "relative", overflow: "hidden"
    }}>
      {/* Accent top border */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color || T.accent }} />
      <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || T.text, letterSpacing: -1, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: T.textSec, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// Chart tooltip — shared across all recharts
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}>
      <div style={{ fontWeight: 700, color: T.text, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ color: T.textSec }}>{p.name}:</span>
          <span style={{ color: T.text, fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── 6. OVERVIEW SECTION ─────────────────────────────────────
// Metric cards + Status distribution + Velocity chart

function OverviewSection({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "Done").length;
  const overdue = tasks.filter(t => t.isOverdue).length;
  const inProg = tasks.filter(t => t.status === "In Progress").length;
  const pct = total ? Math.round(done / total * 100) : 0;
  const totalSP = _.sumBy(tasks, "sp");
  const doneSP = _.sumBy(tasks.filter(t => t.status === "Done"), "sp");

  // Velocity data from sprints
  const velData = SPRINTS.filter(s => s.committed > 0).map(s => ({
    name: s.name.replace("Sprint ", "S"),
    committed: s.committed,
    completed: s.completed || 0,
  }));

  // Status pie
  const pieData = STATUSES.map(s => ({
    name: s,
    value: tasks.filter(t => t.status === s).length,
    color: STATUS[s].color,
  })).filter(d => d.value > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Metric cards row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MetricCard label="Hoàn thành" value={`${pct}%`} sub={`${done}/${total} tasks`} color={T.ok} />
        <MetricCard label="Overdue" value={overdue} sub="cần xử lý" color={overdue > 0 ? T.danger : T.ok} />
        <MetricCard label="Đang làm" value={inProg} sub="tasks in progress" color={T.info} />
        <MetricCard label="Story Points" value={`${doneSP}/${totalSP}`} sub="SP completed" color={T.accent} />
      </div>

      {/* Charts row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Velocity chart */}
        <Card style={{ flex: 1.2, minWidth: 300 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>⚡ Sprint Velocity</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>Committed vs Completed (SP)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={velData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="name" tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.border} />
              <YAxis tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.border} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="committed" name="Committed" radius={[4, 4, 0, 0]} fill="rgba(255,255,255,0.1)" barSize={20} />
              <Bar dataKey="completed" name="Completed" radius={[4, 4, 0, 0]} barSize={20}>
                {velData.map((entry, i) => (
                  <Cell key={i} fill={entry.completed >= entry.committed ? T.ok : T.warn} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status donut */}
        <Card style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>📊 Status Overview</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" stroke="none" paddingAngle={3}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {pieData.map(p => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: T.textSec, flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── 7. MINI KANBAN SECTION ──────────────────────────────────
// Simplified kanban board

function KanbanSection({ tasks }) {
  const cols = STATUSES.filter(s => tasks.some(t => t.status === s));

  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
      {cols.map(st => {
        const col = tasks.filter(t => t.status === st)
          .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));
        const cfg = STATUS[st];

        return (
          <div key={st} style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column" }}>
            {/* Column header */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "0 4px" }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{st}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, background: "rgba(255,255,255,0.05)", padding: "1px 6px", borderRadius: 8, marginLeft: "auto" }}>
                {col.length}
              </span>
            </div>

            {/* Cards container */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, padding: 4, background: "rgba(255,255,255,0.01)", borderRadius: 9, border: `1px solid ${T.border}` }}>
              {col.map(task => (
                <div key={task.id} style={{
                  background: T.card,
                  border: `1px solid ${task.isOverdue ? "rgba(248,113,113,0.2)" : T.border}`,
                  borderRadius: 8, padding: 10
                }}>
                  {/* Task ID + Priority */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>{task.id}</span>
                    <Badge color={PRIORITY[task.priority]?.color} bg={PRIORITY[task.priority]?.bg}>
                      {task.priority}
                    </Badge>
                  </div>

                  {/* Title */}
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.3, marginBottom: 7 }}>
                    {task.title}
                  </div>

                  {/* Module + SP */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, fontSize: 10, color: T.textMuted }}>
                    <span style={{ background: "rgba(255,255,255,0.04)", padding: "1px 5px", borderRadius: 3 }}>{task.module}</span>
                    <span>•</span>
                    <span>{task.sp} SP</span>
                  </div>

                  {/* Progress */}
                  <ProgressBar value={task.progress} color={task.isOverdue ? T.danger : cfg.color} height={3} />

                  {/* Assignee + Deadline */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Avatar name={task.assignee.name} initials={task.assignee.av} size={18} />
                      <span style={{ fontSize: 10, color: T.textSec }}>{task.assignee.name.split(" ").pop()}</span>
                    </div>
                    <span style={{ fontSize: 9, color: task.isOverdue ? T.danger : T.textMuted, fontWeight: task.isOverdue ? 600 : 400 }}>
                      {task.isOverdue ? "⚠ " : ""}{task.deadline}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 8. QUICK ADD TASK ───────────────────────────────────────
// Inline task creation (simplified version)

function QuickAddTask({ onAdd }) {
  const [title, setTitle] = useState("");
  const [show, setShow] = useState(false);

  const submit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      assignee: TEAM[0],
      sprint: SPRINTS[2],
      status: "To Do",
      priority: "Medium",
      module: "General",
      deadline: new Date(Date.now() + 7 * 864e5).toISOString().split("T")[0],
      sp: 3,
    });
    setTitle("");
    setShow(false);
  };

  if (!show) {
    return (
      <button onClick={() => setShow(true)} style={{
        padding: "10px 20px", borderRadius: 10,
        border: `1px dashed ${T.border}`, background: "transparent",
        color: T.textSec, fontSize: 13, cursor: "pointer",
        width: "100%", textAlign: "left",
      }}>
        ✚ Thêm task nhanh...
      </button>
    );
  }

  return (
    <Card>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Tên task mới..."
          autoFocus
          onKeyDown={e => e.key === "Enter" && submit()}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 8,
            border: `1px solid ${T.border}`, background: T.bg,
            color: T.text, fontSize: 13, outline: "none"
          }}
        />
        <button onClick={submit} style={{
          padding: "8px 16px", borderRadius: 8, border: "none",
          background: title.trim() ? T.accent : T.border,
          color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer"
        }}>
          Tạo
        </button>
        <button onClick={() => setShow(false)} style={{
          padding: "8px 12px", borderRadius: 8,
          border: `1px solid ${T.border}`, background: T.surface,
          color: T.textSec, fontSize: 13, cursor: "pointer"
        }}>
          Huỷ
        </button>
      </div>
    </Card>
  );
}

// ─── 9. MAIN APP ─────────────────────────────────────────────
// Kết hợp tất cả sections lại

export default function App() {
  const bridge = useDataBridge();
  const [view, setView] = useState("overview"); // overview | kanban

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: T.bg, color: T.text, minHeight: "100vh", paddingBottom: 40 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
      `}</style>

      {/* ── HEADER ────────────────────────────── */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "20px 24px 16px", marginBottom: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: bridge.dataSource === "sample" ? T.warn : T.ok }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: T.textSec, letterSpacing: 1, textTransform: "uppercase" }}>
                  {bridge.dataSource === "sample" ? "Sample Data" : "Connected"}
                </span>
                {bridge.lastSync && (
                  <span style={{ fontSize: 10, color: T.textMuted }}>• {bridge.lastSync.toLocaleTimeString("vi-VN")}</span>
                )}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text }}>PM Dashboard — UI Sample</h1>
              <p style={{ fontSize: 12, color: T.textSec, marginTop: 2 }}>Wolffun Game • Phiên bản mẫu đơn giản</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ fontSize: 12, color: T.textMuted, alignSelf: "center" }}>{bridge.tasks.length} tasks</span>
            </div>
          </div>

          {/* View tabs */}
          <div style={{ display: "flex", gap: 2, background: T.bg, borderRadius: 10, padding: 3, border: `1px solid ${T.border}`, width: "fit-content" }}>
            {[{ id: "overview", label: "◫ Tổng quan" }, { id: "kanban", label: "▦ Kanban" }].map(tab => (
              <button key={tab.id} onClick={() => setView(tab.id)} style={{
                padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
                background: view === tab.id ? T.accent : "transparent",
                color: view === tab.id ? "#fff" : T.textSec,
                transition: "all 0.2s"
              }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        {view === "overview" && <OverviewSection tasks={bridge.tasks} />}
        {view === "kanban" && <KanbanSection tasks={bridge.tasks} />}

        {/* Quick add task */}
        <div style={{ marginTop: 20 }}>
          <QuickAddTask onAdd={bridge.addTask} />
        </div>
      </div>
    </div>
  );
}
