/** Team tab — Per-person breakdown. Spec: docs/features/team.md */
import { useMemo } from 'react'
import _ from 'lodash'
import { useFilterStore, useTaskStore } from '@/stores'
import { applyFilters } from '@/lib/filter'
import { prioC, PRIORITIES, stOf } from '@/lib/constants'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/shared/Badge'
import { Card } from '@/components/shared/Card'
import { ProgressBar } from '@/components/shared/ProgressBar'

export function TeamView() {
  const tasks = useTaskStore((s) => s.tasks)
  const team = useTaskStore((s) => s.team)
  const filters = useFilterStore((s) => s.filters)
  const search = useFilterStore((s) => s.search)

  const ft = useMemo(() => applyFilters(tasks, filters, search), [tasks, filters, search])
  const byPerson = useMemo(() => _.groupBy(ft, (t) => t.assignee?.id), [ft])

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {team.map((m) => {
        const mt = byPerson[m.id] ?? []
        const d = mt.filter((t) => t.status === 'Done').length
        const ov = mt.filter((t) => t.isOverdue).length
        const p = mt.length ? Math.round((d / mt.length) * 100) : 0
        return (
          <Card key={m.id} hoverable={false}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ padding: 3, background: 'var(--app-gradient-primary)', borderRadius: '50%', boxShadow: '0 4px 12px rgba(124, 106, 239, 0.3)' }}>
                <Avatar name={m.name} initials={m.av} size={48} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--app-text)' }}>{m.name}</span>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--app-text-muted)',
                      background: 'rgba(255,255,255,.06)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontWeight: 600,
                    }}
                  >
                    {m.role}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: 'var(--app-text-sec)', fontWeight: 600 }}>
                  <span style={{background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: 4}}>{mt.length} tasks</span>
                  <span style={{background: 'rgba(52,211,153,0.1)', color: 'var(--app-ok)', padding: '2px 8px', borderRadius: 4}}>{d} done</span>
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
                    color: p === 100 ? 'var(--app-ok, #34D399)' : p > 60 ? 'var(--app-info, #60A5FA)' : p > 30 ? 'var(--app-warn, #FBBF24)' : 'var(--app-text)',
                    letterSpacing: '-1px'
                  }}
                >
                  {p}%
                </div>
              </div>
            </div>
            
            <ProgressBar value={p} color={p === 100 ? 'var(--app-ok, #34D399)' : p > 60 ? 'var(--app-info, #60A5FA)' : p > 30 ? 'var(--app-warn, #FBBF24)' : 'var(--app-text-muted)'} h={6} />
            
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mt
                .slice()
                .sort((a, b) => PRIORITIES.indexOf(a.priority as any) - PRIORITIES.indexOf(b.priority as any))
                .map((t) => (
                  <div
                    key={t.id}
                    className="card-hover"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: t.isOverdue ? 'rgba(248,113,113,.04)' : 'var(--app-surface)',
                      border: t.isOverdue ? '1px solid rgba(248,113,113,.2)' : '1px solid var(--app-border)',
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 80, flexShrink: 0 }}>
                      <span style={{ color: 'var(--app-text-muted)', fontWeight: 700, fontSize: 12 }}>{t.id}</span>
                    </div>
                    
                    <div style={{ flex: 1, color: 'var(--app-text)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.title}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                      <div style={{ width: 110 }}>
                        <Badge color={stOf(t.status).c} bg={stOf(t.status).bg} small>
                          {stOf(t.status).i} {t.status}
                        </Badge>
                      </div>
                      
                      <div style={{ width: 80 }}>
                        <Badge color={prioC[t.priority]?.c ?? 'var(--app-text-muted)'} bg={prioC[t.priority]?.bg ?? 'rgba(255,255,255,0.05)'} small>
                          {t.priority}
                        </Badge>
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
