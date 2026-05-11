/** Create Task modal. */
import { useMemo, useState } from 'react'
import { PRIORITIES, STATUSES } from '@/lib/constants'
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
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid var(--app-border)`,
    background: 'var(--app-bg)',
    color: 'var(--app-text)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
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
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel animate-scale-in"
        style={{
          background: 'var(--app-card)',
          border: `1px solid var(--app-border)`,
          borderRadius: 20,
          width: 520,
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 32,
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--app-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{color: 'var(--app-accent)'}}>✚</span> Tạo Task mới
          </div>
          <button
            className="btn-outline"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid var(--app-border)`,
              background: 'var(--app-surface)',
              color: 'var(--app-text)',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="animate-scale-in" style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 60, marginBottom: 16, color: 'var(--app-ok, #34D399)', textShadow: '0 0 20px rgba(52,211,153,0.4)' }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--app-text)' }}>Tạo thành công!</div>
            <div style={{ fontSize: 14, color: 'var(--app-text-sec)', marginTop: 8, background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
              <span style={{color: 'var(--app-text-muted)', fontWeight: 600}}>{done.id}</span> — {done.title}
            </div>
          </div>
        ) : team.length === 0 || sprints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--app-text)', marginBottom: 8 }}>
              Chưa có data
            </div>
            <div style={{ fontSize: 14, color: 'var(--app-text-sec)', lineHeight: 1.6, marginBottom: 24 }}>
              Cần scrape Review 360° trước để có team và sprint.
              <br />
              Mở <b>🔗 Kết nối → BE Bridge</b> để login và scrape.
            </div>
            <button
              className="btn-outline"
              onClick={onClose}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: `1px solid var(--app-border)`,
                background: 'var(--app-surface)',
                color: 'var(--app-text)',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Tên task *">
              <input
                className="input-premium"
                value={f.title}
                onChange={(e) => sF((p) => ({ ...p, title: e.target.value }))}
                placeholder="VD: Fix login timeout bug"
                style={inp}
                autoFocus
              />
            </Field>
            <div style={{ display: 'flex', gap: 16 }}>
              <Field label="Assignee" flex>
                <select className="input-premium" value={f.assigneeId} onChange={(e) => sF((p) => ({ ...p, assigneeId: Number(e.target.value) }))} style={inp}>
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Sprint" flex>
                <select className="input-premium" value={f.sprintId} onChange={(e) => sF((p) => ({ ...p, sprintId: e.target.value }))} style={inp}>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.status === 'active' ? ' ●' : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Field label="Status" flex>
                <select className="input-premium" value={f.status} onChange={(e) => sF((p) => ({ ...p, status: e.target.value as Status }))} style={inp}>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priority" flex>
                <select className="input-premium" value={f.priority} onChange={(e) => sF((p) => ({ ...p, priority: e.target.value as Priority }))} style={inp}>
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Field label="Project" flex>
                <input
                  className="input-premium"
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
                <select className="input-premium" value={f.sp} onChange={(e) => sF((p) => ({ ...p, sp: Number(e.target.value) }))} style={inp}>
                  {[1, 2, 3, 5, 8, 13].map((v) => (
                    <option key={v} value={v}>
                      {v} SP
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Deadline">
              <input className="input-premium" type="date" value={f.deadline} onChange={(e) => sF((p) => ({ ...p, deadline: e.target.value }))} style={inp} />
            </Field>
            <Field label="Mô tả">
              <textarea
                className="input-premium"
                value={f.desc}
                onChange={(e) => sF((p) => ({ ...p, desc: e.target.value }))}
                rows={3}
                placeholder="Chi tiết..."
                style={{ ...inp, resize: 'vertical' }}
              />
            </Field>
            <button
              className={f.title.trim() ? "btn-primary" : ""}
              onClick={submit}
              disabled={!f.title.trim()}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                border: 'none',
                background: f.title.trim() ? 'var(--app-gradient-primary)' : 'var(--app-surface)',
                color: f.title.trim() ? '#fff' : 'var(--app-text-muted)',
                fontSize: 15,
                fontWeight: 700,
                cursor: f.title.trim() ? 'pointer' : 'not-allowed',
                marginTop: 8,
                boxShadow: f.title.trim() ? '0 4px 16px rgba(124, 106, 239, 0.4)' : 'none',
                transition: 'all 0.3s'
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
      <label style={{ fontSize: 13, color: 'var(--app-text-sec)', fontWeight: 700, display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}
