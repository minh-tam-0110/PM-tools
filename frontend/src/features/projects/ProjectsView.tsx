/** Projects tab — toàn bộ task chia theo project. Spec: docs/features/projects.md */
import { useMemo } from 'react'
import _ from 'lodash'
import { useFilterStore, useTaskStore } from '@/stores'
import { applyFilters } from '@/lib/filter'
import { prioC, PRIORITIES, stOf } from '@/lib/constants'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/shared/Badge'
import { Card } from '@/components/shared/Card'
import { ProgressBar } from '@/components/shared/ProgressBar'

export function ProjectsView() {
  const tasks = useTaskStore((s) => s.tasks)
  const filters = useFilterStore((s) => s.filters)
  const search = useFilterStore((s) => s.search)
  const setSelectedTask = useTaskStore((s) => s.setSelectedTask)

  const ft = useMemo(() => applyFilters(tasks, filters, search), [tasks, filters, search])
  const byProject = useMemo(() => _.groupBy(ft, (t) => t.module || '—'), [ft])

  const projects = useMemo(
    () =>
      Object.keys(byProject).sort((a, b) => byProject[b].length - byProject[a].length),
    [byProject],
  )

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {projects.map((proj) => {
        const list = byProject[proj]
        const done = list.filter((t) => t.status === 'Done').length
        const ov = list.filter((t) => t.isOverdue).length
        const pct = list.length ? Math.round((done / list.length) * 100) : 0
        const sprintNames = [...new Set(list.map((t) => t.sprint?.name).filter(Boolean))]
        return (
          <Card key={proj} hoverable={false}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'var(--app-accent-glow)',
                  color: 'var(--app-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 800,
                  flexShrink: 0,
                  boxShadow: '0 0 16px var(--app-accent-glow)'
                }}
              >
                ⌘
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--app-text)' }}>{proj}</span>
                  {sprintNames.map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: 12,
                        color: 'var(--app-text-muted)',
                        background: 'rgba(255,255,255,.06)',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: 'var(--app-text-sec)', fontWeight: 600 }}>
                  <span style={{background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: 4}}>{list.length} tasks</span>
                  <span style={{background: 'rgba(52,211,153,0.1)', color: 'var(--app-ok)', padding: '2px 8px', borderRadius: 4}}>{done} done</span>
                  {ov > 0 && (
                    <Badge color="var(--app-danger, #F87171)" bg="rgba(248,113,113,0.1)" small>
                      ⚠ {ov} overdue
                    </Badge>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: pct === 100 ? 'var(--app-ok, #34D399)' : pct > 60 ? 'var(--app-info, #60A5FA)' : pct > 30 ? 'var(--app-warn, #FBBF24)' : 'var(--app-text)',
                    letterSpacing: '-1px'
                  }}
                >
                  {pct}%
                </div>
              </div>
            </div>

            <ProgressBar value={pct} color={pct === 100 ? 'var(--app-ok, #34D399)' : pct > 60 ? 'var(--app-info, #60A5FA)' : pct > 30 ? 'var(--app-warn, #FBBF24)' : 'var(--app-text-muted)'} h={6} />

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list
                .slice()
                .sort((a, b) => PRIORITIES.indexOf(a.priority as any) - PRIORITIES.indexOf(b.priority as any))
                .map((t) => (
                  <div
                    key={t.id}
                    className="card-hover"
                    onClick={() => setSelectedTask(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: t.isOverdue ? 'rgba(248,113,113,.04)' : 'var(--app-surface)',
                      border: t.isOverdue ? '1px solid rgba(248,113,113,.2)' : '1px solid var(--app-border)',
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 100, flexShrink: 0 }}>
                      <span style={{ color: stOf(t.status).c, fontSize: 16, filter: `drop-shadow(0 0 6px ${stOf(t.status).c})` }}>{stOf(t.status).i}</span>
                      <span style={{ color: 'var(--app-text-muted)', fontWeight: 700, fontSize: 12 }}>{t.id}</span>
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
                      <div style={{ color: 'var(--app-text)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.title}
                      </div>
                      {t.description && (
                        <div style={{ color: 'var(--app-text-sec)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.description}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                      <div style={{ width: 140, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Badge color={prioC[t.priority]?.c ?? 'var(--app-text-muted)'} bg={prioC[t.priority]?.bg ?? 'rgba(255,255,255,0.05)'} small>
                          {t.priority}
                        </Badge>
                        {t.time && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--app-text-sec)', fontSize: 12, fontWeight: 600 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            {t.time}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 140 }}>
                        <Avatar name={t.assignee?.name ?? '?'} initials={t.assignee?.av ?? '?'} size={24} />
                        <span style={{ fontSize: 13, color: 'var(--app-text-sec)', fontWeight: 600 }}>
                          {t.assignee?.name?.split(' ').pop() ?? ''}
                        </span>
                      </div>

                      <div style={{ width: 100 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: 4, textAlign: 'right' }}>{t.progress}%</div>
                        <ProgressBar value={t.progress} color={t.isOverdue ? 'var(--app-danger, #F87171)' : stOf(t.status).c} h={4} />
                      </div>

                      <div
                        style={{
                          width: 100,
                          textAlign: 'right',
                          color: t.isOverdue ? 'var(--app-danger, #F87171)' : 'var(--app-text-muted)',
                          fontSize: 12,
                          fontWeight: t.isOverdue ? 700 : 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 4
                        }}
                      >
                        {t.isOverdue ? '⚠' : '🗓'} {t.deadline || '—'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
