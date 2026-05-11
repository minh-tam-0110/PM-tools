/** Kanban tab — Status columns. Spec: docs/features/kanban.md */
import { useMemo } from 'react'
import { useFilterStore, useTaskStore } from '@/stores'
import { applyFilters } from '@/lib/filter'
import { prioC, PRIORITIES, stOf, STATUSES } from '@/lib/constants'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/shared/Badge'
import { ProgressBar } from '@/components/shared/ProgressBar'

export function KanbanView() {
  const tasks = useTaskStore((s) => s.tasks)
  const filters = useFilterStore((s) => s.filters)
  const search = useFilterStore((s) => s.search)

  const ft = useMemo(() => applyFilters(tasks, filters, search), [tasks, filters, search])
  const cols = [...new Set(ft.map((t) => t.status))].sort(
    (a, b) => STATUSES.indexOf(a as any) - STATUSES.indexOf(b as any),
  )

  return (
    <div className="animate-slide-up" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, minHeight: 400 }}>
      {cols.map((st) => {
        const col = ft
          .filter((t) => t.status === st)
          .sort((a, b) => PRIORITIES.indexOf(a.priority as any) - PRIORITIES.indexOf(b.priority as any))
        const cfg = stOf(st)
        return (
          <div key={st} style={{ flex: 1, minWidth: 290, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 4px' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: cfg.c, boxShadow: `0 0 8px ${cfg.c}` }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--app-text)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{st}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--app-text-muted)',
                  background: 'rgba(255,255,255,.05)',
                  padding: '2px 8px',
                  borderRadius: 10,
                  marginLeft: 'auto',
                }}
              >
                {col.length}
              </span>
            </div>
            <div
              className="glass-panel"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: 12,
                borderRadius: 16,
              }}
            >
              {col.map((t) => (
                <div
                  key={t.id}
                  className="card-hover animate-fade-in"
                  style={{
                    background: 'var(--app-card)',
                    border: `1px solid ${t.isOverdue ? 'rgba(248,113,113,.4)' : 'var(--app-border)'}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    cursor: 'grab',
                    boxShadow: t.isOverdue ? '0 4px 12px rgba(248,113,113,0.1)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--app-text-muted)', fontWeight: 700, letterSpacing: 0.5 }}>{t.id}</span>
                      {t.module && (
                        <span style={{ fontSize: 10, background: 'rgba(255,255,255,.06)', padding: '2px 6px', borderRadius: 4, fontWeight: 600, color: 'var(--app-text-sec)' }}>
                          {t.module}
                        </span>
                      )}
                    </div>
                    <Badge color={prioC[t.priority]?.c ?? 'var(--app-text-muted)'} bg={prioC[t.priority]?.bg ?? 'var(--app-surface)'} small>
                      {t.priority}
                    </Badge>
                  </div>
                  
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text)', lineHeight: 1.4, marginBottom: 12 }}>
                    {t.title}
                  </div>
                  
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--app-text-sec)', marginBottom: 6 }}>
                      <span>Tiến độ</span>
                      <span>{t.progress}%</span>
                    </div>
                    <ProgressBar value={t.progress} color={t.isOverdue ? 'var(--app-danger, #F87171)' : cfg.c} h={5} />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px dashed var(--app-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Avatar name={t.assignee?.name ?? '?'} initials={t.assignee?.av ?? '?'} size={24} />
                      <span style={{ fontSize: 12, color: 'var(--app-text-sec)', fontWeight: 600 }}>{t.assignee?.name.split(' ').pop()}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-muted)', background: 'var(--app-surface)', padding: '2px 6px', borderRadius: 4 }}>
                        {t.sp} SP
                      </span>
                      {t.deadline && (
                        <span style={{ 
                          fontSize: 11, 
                          fontWeight: 700, 
                          color: t.isOverdue ? 'var(--app-danger, #F87171)' : 'var(--app-text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          {t.isOverdue ? '⚠' : '🗓'} {t.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
