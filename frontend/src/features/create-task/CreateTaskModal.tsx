/** Create Task modal. */
import { useMemo, useState } from 'react'
import { PRIORITIES, STATUSES, T } from '@/lib/constants'
import { fmtDate } from '@/lib/utils'
import { useConnStore, useTaskStore } from '@/stores'
import type { Priority, Status, Task } from '@/lib/types'

type Props = {
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  onClose: () => void
}

export function CreateTaskModal({ iframeRef, onClose }: Props) {
  const tasks = useTaskStore((s) => s.tasks)
  const team = useTaskStore((s) => s.team)
  const sprints = useTaskStore((s) => s.sprints)
  const addTask = useTaskStore((s) => s.add)
  const src = useConnStore((s) => s.src)

  const modules = useMemo(
    () => [...new Set(tasks.map((t) => t.module).filter(Boolean))],
    [tasks],
  )
  const activeSp = sprints.find((s) => s.status === 'active') ?? sprints[0]

  const [f, sF] = useState({
    title: '',
    assigneeId: team[0]?.id ?? 1,
    sprintId: activeSp?.id ?? 's0',
    status: 'To Do' as Status,
    priority: 'Medium' as Priority,
    module: modules[0] ?? '',
    deadline: fmtDate(new Date(Date.now() + 7 * 864e5)),
    sp: 3,
    desc: '',
  })
  const [done, setDone] = useState<Task | null>(null)

  const inp = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${T.border}`,
    background: T.bg,
    color: T.text,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const submit = () => {
    if (!f.title.trim()) return
    const a = team.find((m) => m.id === Number(f.assigneeId)) ?? team[0]
    const sp = sprints.find((s) => s.id === f.sprintId) ?? sprints[0]
    const t = addTask({
      title: f.title.trim(),
      assignee: a,
      sprint: sp,
      status: f.status,
      priority: f.priority,
      module: f.module,
      deadline: f.deadline,
      sp: f.sp,
      desc: f.desc,
    })
    setDone(t)
    if (src === 'iframe') {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: 'CREATE_TASK', task: t }),
        'https://wolffun-review.web.app',
      )
    }
    setTimeout(onClose, 1000)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: 520,
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 28,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>✚ Tạo Task mới</div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: T.text,
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.ok }}>Tạo thành công!</div>
            <div style={{ fontSize: 13, color: T.textSec, marginTop: 4 }}>
              {done.id} — {done.title}
            </div>
          </div>
        ) : team.length === 0 || sprints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>
              Chưa có data
            </div>
            <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6, marginBottom: 16 }}>
              Cần scrape Review 360° trước để có team và sprint.
              <br />
              Mở <b>🔗 Kết nối → BE Bridge</b> để login và scrape.
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.surface,
                color: T.text,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Tên task *">
              <input
                value={f.title}
                onChange={(e) => sF((p) => ({ ...p, title: e.target.value }))}
                placeholder="VD: Fix login timeout bug"
                style={inp}
                autoFocus
              />
            </Field>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Assignee" flex>
                <select value={f.assigneeId} onChange={(e) => sF((p) => ({ ...p, assigneeId: Number(e.target.value) }))} style={inp}>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sprint" flex>
                <select value={f.sprintId} onChange={(e) => sF((p) => ({ ...p, sprintId: e.target.value }))} style={inp}>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.status === 'active' ? ' ●' : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Status" flex>
                <select value={f.status} onChange={(e) => sF((p) => ({ ...p, status: e.target.value as Status }))} style={inp}>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priority" flex>
                <select value={f.priority} onChange={(e) => sF((p) => ({ ...p, priority: e.target.value as Priority }))} style={inp}>
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Project" flex>
                <input
                  value={f.module}
                  onChange={(e) => sF((p) => ({ ...p, module: e.target.value }))}
                  list="module-options"
                  placeholder="Tên project"
                  style={inp}
                />
                <datalist id="module-options">
                  {modules.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Field>
              <Field label="Story Points" flex>
                <select value={f.sp} onChange={(e) => sF((p) => ({ ...p, sp: Number(e.target.value) }))} style={inp}>
                  {[1, 2, 3, 5, 8, 13].map((v) => (
                    <option key={v} value={v}>
                      {v} SP
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Deadline">
              <input type="date" value={f.deadline} onChange={(e) => sF((p) => ({ ...p, deadline: e.target.value }))} style={inp} />
            </Field>
            <Field label="Mô tả">
              <textarea
                value={f.desc}
                onChange={(e) => sF((p) => ({ ...p, desc: e.target.value }))}
                rows={2}
                placeholder="Chi tiết..."
                style={{ ...inp, resize: 'vertical' }}
              />
            </Field>
            <button
              onClick={submit}
              disabled={!f.title.trim()}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                border: 'none',
                background: f.title.trim() ? T.accent : T.borderLight,
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: f.title.trim() ? 'pointer' : 'not-allowed',
                marginTop: 4,
              }}
            >
              Tạo Task
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <div style={{ flex: flex ? 1 : undefined }}>
      <label style={{ fontSize: 12, color: T.textSec, fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}
