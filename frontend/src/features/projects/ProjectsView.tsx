/** Projects tab — toàn bộ task chia theo project. Spec: docs/features/projects.md */
import { useMemo } from 'react'
import _ from 'lodash'
import { useFilterStore, useTaskStore } from '@/stores'
import { applyFilters } from '@/lib/filter'
import { prioC, PRIORITIES, stOf, T } from '@/lib/constants'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/shared/Badge'
import { Card } from '@/components/shared/Card'
import { ProgressBar } from '@/components/shared/ProgressBar'

export function ProjectsView() {
  const tasks = useTaskStore((s) => s.tasks)
  const filters = useFilterStore((s) => s.filters)
  const search = useFilterStore((s) => s.search)

  const ft = useMemo(() => applyFilters(tasks, filters, search), [tasks, filters, search])
  const byProject = useMemo(() => _.groupBy(ft, (t) => t.module || '—'), [ft])

  const projects = useMemo(
    () =>
      Object.keys(byProject).sort((a, b) => byProject[b].length - byProject[a].length),
    [byProject],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {projects.map((proj) => {
        const list = byProject[proj]
        const done = list.filter((t) => t.status === 'Done').length
        const ov = list.filter((t) => t.isOverdue).length
        const pct = list.length ? Math.round((done / list.length) * 100) : 0
        const sprintNames = [...new Set(list.map((t) => t.sprint?.name).filter(Boolean))]
        return (
          <Card key={proj}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: T.accentSoft,
                  color: T.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                ⌘
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{proj}</span>
                  {sprintNames.map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: 11,
                        color: T.textMuted,
                        background: 'rgba(255,255,255,.04)',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: 12, color: T.textSec }}>
                  <span>{list.length} tasks</span>
                  <span>· {done} done</span>
                  {ov > 0 && (
                    <Badge color={T.danger} bg={T.dangerSoft} small>
                      ⚠{ov} overdue
                    </Badge>
                  )}
                </div>
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: pct === 100 ? T.ok : pct > 60 ? T.info : pct > 30 ? T.warn : T.danger,
                }}
              >
                {pct}%
              </div>
            </div>

            <ProgressBar value={pct} color={pct === 100 ? T.ok : pct > 60 ? T.info : T.warn} h={4} />

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {list
                .slice()
                .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority))
                .map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '6px 8px',
                      borderRadius: 6,
                      background: t.isOverdue ? 'rgba(248,113,113,.05)' : 'rgba(255,255,255,.02)',
                      border: t.isOverdue ? '1px solid rgba(248,113,113,.1)' : '1px solid transparent',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: stOf(t.status).c, fontSize: 12 }}>{stOf(t.status).i}</span>
                    <span style={{ color: T.textMuted, fontWeight: 600, minWidth: 56 }}>{t.id}</span>
                    <span style={{ flex: 1, color: T.text, fontWeight: 500 }}>{t.title}</span>
                    <Avatar name={t.assignee?.name ?? '?'} initials={t.assignee?.av ?? '?'} size={18} />
                    <span style={{ fontSize: 11, color: T.textSec, minWidth: 90 }}>
                      {t.assignee?.name?.split(' ').slice(-2).join(' ') ?? ''}
                    </span>
                    <Badge color={prioC[t.priority]?.c ?? T.textMuted} bg={prioC[t.priority]?.bg ?? T.surface} small>
                      {t.priority}
                    </Badge>
                    <span
                      style={{
                        color: t.isOverdue ? T.danger : T.textMuted,
                        fontSize: 11,
                        minWidth: 75,
                        textAlign: 'right',
                        fontWeight: t.isOverdue ? 600 : 400,
                      }}
                    >
                      {t.isOverdue ? '⚠ ' : ''}
                      {t.deadline || '—'}
                    </span>
                    <div style={{ width: 40 }}>
                      <ProgressBar value={t.progress} color={t.isOverdue ? T.danger : stOf(t.status).c} h={3} />
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
