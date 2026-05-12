import { useEffect, useRef } from 'react'
import { useTaskStore } from '@/stores'
import { prioC, stOf } from '@/lib/constants'
import { Avatar } from './Avatar'
import { Badge } from './Badge'
import { ProgressBar } from './ProgressBar'

export function TaskDetailModal() {
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId)
  const setSelectedTask = useTaskStore((s) => s.setSelectedTask)
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === selectedTaskId))
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedTaskId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedTask(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selectedTaskId, setSelectedTask])

  if (!selectedTaskId || !task) return null

  return (
    <div
      ref={overlayRef}
      className="animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === overlayRef.current) setSelectedTask(null)
      }}
    >
      <div
        className="animate-slide-up glass-panel"
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 20,
          background: 'var(--app-surface)',
          border: '1px solid var(--app-border)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--app-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--app-text-muted)', letterSpacing: 1 }}>{task.id}</span>
              <Badge color={stOf(task.status).c} bg={stOf(task.status).bg} small>
                {stOf(task.status).i} {task.status}
              </Badge>
              {task.isOverdue && (
                <span style={{ fontSize: 11, color: 'var(--app-danger, #F87171)', fontWeight: 800, background: 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                  OVERDUE
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--app-text)', lineHeight: 1.4, margin: 0 }}>
              {task.title}
            </h2>
          </div>
          <button
            onClick={() => setSelectedTask(null)}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--app-text-sec)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--app-text)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--app-text-sec)' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--app-text-muted)', fontWeight: 600 }}>Assignee</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={task.assignee?.name ?? '?'} initials={task.assignee?.av ?? '?'} size={24} />
                <span style={{ fontSize: 14, color: 'var(--app-text)', fontWeight: 600 }}>{task.assignee?.name}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--app-text-muted)', fontWeight: 600 }}>Priority</span>
              <div>
                <Badge color={prioC[task.priority]?.c ?? 'var(--app-text-muted)'} bg={prioC[task.priority]?.bg ?? 'rgba(255,255,255,0.05)'}>
                  {task.priority}
                </Badge>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--app-text-muted)', fontWeight: 600 }}>Module / Category</span>
              <span style={{ fontSize: 14, color: 'var(--app-text)', fontWeight: 600 }}>{task.module}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--app-text-muted)', fontWeight: 600 }}>Deadline</span>
              <span style={{ fontSize: 14, color: task.deadline ? 'var(--app-text)' : 'var(--app-text-sec)', fontWeight: 600 }}>
                {task.deadline || 'Chưa có deadline'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--app-text-muted)', fontWeight: 600 }}>Sprint</span>
              <span style={{ fontSize: 14, color: 'var(--app-text)', fontWeight: 600 }}>{task.sprint?.name || 'Backlog'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--app-text-muted)', fontWeight: 600 }}>Time / SP</span>
              <span style={{ fontSize: 14, color: 'var(--app-text)', fontWeight: 600 }}>
                {task.time ? task.time : `${task.sp} SP`}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid var(--app-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--app-text-muted)', fontWeight: 600 }}>Tiến độ ({task.progress}%)</span>
            </div>
            <ProgressBar value={task.progress} color={task.isOverdue ? 'var(--app-danger, #F87171)' : stOf(task.status).c} h={6} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--app-text)', fontWeight: 700 }}>Mô tả chi tiết</span>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--app-border)',
              borderRadius: 12,
              padding: 16,
              fontSize: 14,
              color: 'var(--app-text-sec)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              minHeight: 100
            }}>
              {task.description ? task.description : <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Không có mô tả</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
