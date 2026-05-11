/** Team tab — Per-person breakdown. Spec: docs/features/team.md */
import { useMemo } from 'react'
import _ from 'lodash'
import { useFilterStore, useTaskStore } from '@/stores'
import { applyFilters } from '@/lib/filter'
import { prioC, PRIORITIES, stOf, T } from '@/lib/constants'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {team.map((m) => {
        const mt = byPerson[m.id] ?? []
        const d = mt.filter((t) => t.status === 'Done').length
        const ov = mt.filter((t) => t.isOverdue).length
        const p = mt.length ? Math.round((d / mt.length) * 100) : 0
        return (
          <Card key={m.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Avatar name={m.name} initials={m.av} size={38} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{m.name}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: T.textMuted,
                      background: 'rgba(255,255,255,.04)',
                      padding: '1px 6px',
                      borderRadius: 4,
                    }}
                  >
                    {m.role}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: 12, color: T.textSec }}>
                  <span>{mt.length} tasks</span>
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
                  color: p === 100 ? T.ok : p > 60 ? T.info : p > 30 ? T.warn : T.danger,
                }}
              >
                {p}%
              </div>
            </div>
            <ProgressBar value={p} color={p === 100 ? T.ok : p > 60 ? T.info : T.warn} h={4} />
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {mt
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
                    <span style={{ color: T.textMuted, fontWeight: 600, minWidth: 42 }}>{t.id}</span>
                    <span style={{ flex: 1, color: T.text, fontWeight: 500 }}>{t.title}</span>
                    <Badge color={stOf(t.status).c} bg={stOf(t.status).bg} small>
                      {stOf(t.status).i} {t.status}
                    </Badge>
                    <Badge color={prioC[t.priority]?.c ?? T.textMuted} bg={prioC[t.priority]?.bg ?? T.surface} small>
                      {t.priority}
                    </Badge>
                    <span
                      style={{
                        color: t.isOverdue ? T.danger : T.textMuted,
                        fontSize: 11,
                        minWidth: 65,
                        textAlign: 'right',
                        fontWeight: t.isOverdue ? 600 : 400,
                      }}
                    >
                      {t.isOverdue ? '⚠ ' : ''}
                      {t.deadline}
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
