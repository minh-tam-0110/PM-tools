/** Kanban tab — Status columns. Spec: docs/features/kanban.md */
import { useMemo } from 'react'
import { useFilterStore, useTaskStore } from '@/stores'
import { applyFilters } from '@/lib/filter'
import { prioC, PRIORITIES, stOf, STATUSES, T } from '@/lib/constants'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/shared/Badge'
import { ProgressBar } from '@/components/shared/ProgressBar'

export function KanbanView() {
  const tasks = useTaskStore((s) => s.tasks)
  const filters = useFilterStore((s) => s.filters)
  const search = useFilterStore((s) => s.search)

  const ft = useMemo(() => applyFilters(tasks, filters, search), [tasks, filters, search])
  const cols = [...new Set(ft.map((t) => t.status))].sort(
    (a, b) => STATUSES.indexOf(a) - STATUSES.indexOf(b),
  )

  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, minHeight: 360 }}>
      {cols.map((st) => {
        const col = ft
          .filter((t) => t.status === st)
          .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority))
        const cfg = stOf(st)
        return (
          <div key={st} style={{ flex: 1, minWidth: 210, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '0 4px' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.c }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{st}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.textMuted,
                  background: 'rgba(255,255,255,.05)',
                  padding: '1px 6px',
                  borderRadius: 8,
                  marginLeft: 'auto',
                }}
              >
                {col.length}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: 4,
                background: 'rgba(255,255,255,.01)',
                borderRadius: 9,
                border: `1px solid ${T.border}`,
              }}
            >
              {col.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: T.card,
                    border: `1px solid ${t.isOverdue ? 'rgba(248,113,113,.2)' : T.border}`,
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>{t.id}</span>
                    <Badge color={prioC[t.priority]?.c ?? T.textMuted} bg={prioC[t.priority]?.bg ?? T.surface} small>
                      {t.priority}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text, lineHeight: 1.3, marginBottom: 7 }}>{t.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, fontSize: 10, color: T.textMuted }}>
                    <span style={{ background: 'rgba(255,255,255,.04)', padding: '1px 5px', borderRadius: 3 }}>{t.module}</span>
                    <span>•</span>
                    <span>{t.sp} SP</span>
                  </div>
                  <ProgressBar value={t.progress} color={t.isOverdue ? T.danger : cfg.c} h={3} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Avatar name={t.assignee?.name ?? '?'} initials={t.assignee?.av ?? '?'} size={18} />
                      <span style={{ fontSize: 10, color: T.textSec }}>{t.assignee?.name}</span>
                    </div>
                    <span style={{ fontSize: 9, color: t.isOverdue ? T.danger : T.textMuted }}>{t.deadline}</span>
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
