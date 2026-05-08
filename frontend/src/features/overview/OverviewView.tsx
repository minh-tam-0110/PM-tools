/** Overview tab — 4 metric + status bar + module progress. Spec: docs/features/overview.md */
import { useMemo } from 'react'
import _ from 'lodash'
import { useFilterStore, useTaskStore } from '@/stores'
import { applyFilters } from '@/lib/filter'
import { stOf, T } from '@/lib/constants'
import { Badge } from '@/components/shared/Badge'
import { Card } from '@/components/shared/Card'
import { MetricCard } from '@/components/shared/MetricCard'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { SectionHeader } from '@/components/shared/SectionHeader'

export function OverviewView() {
  const tasks = useTaskStore((s) => s.tasks)
  const filters = useFilterStore((s) => s.filters)
  const search = useFilterStore((s) => s.search)

  const ft = useMemo(() => applyFilters(tasks, filters, search), [tasks, filters, search])

  const m = useMemo(() => {
    const total = ft.length
    const done = ft.filter((t) => t.status === 'Done').length
    const over = ft.filter((t) => t.isOverdue).length
    const prog = ft.filter((t) => t.status === 'In Progress').length
    const rev = ft.filter((t) => t.status === 'Review').length
    const tSP = _.sumBy(ft, 'sp')
    const dSP = _.sumBy(
      ft.filter((t) => t.status === 'Done'),
      'sp',
    )
    const pct = total ? Math.round((done / total) * 100) : 0
    const sts = [...new Set(ft.map((t) => t.status))]
    const mods = Object.entries(_.groupBy(ft, 'module')).map(([mod, ts]) => ({
      m: mod,
      total: ts.length,
      done: ts.filter((t) => t.status === 'Done').length,
      over: ts.filter((t) => t.isOverdue).length,
    }))
    return { total, done, over, prog, rev, tSP, dSP, pct, sts, mods }
  }, [ft])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <MetricCard label="Hoàn thành" value={`${m.pct}%`} sub={`${m.done}/${m.total} tasks`} color={T.ok} icon="✓" />
        <MetricCard label="Overdue" value={m.over} sub="cần xử lý" color={m.over > 0 ? T.danger : T.ok} icon="⚠" />
        <MetricCard label="Đang làm" value={m.prog} sub={`${m.rev} đang review`} color={T.info} icon="◐" />
        <MetricCard label="Story Points" value={`${m.dSP}/${m.tSP}`} sub="SP done" color={T.accent} icon="◆" />
      </div>

      <Card>
        <SectionHeader>Phân bố trạng thái</SectionHeader>
        <div style={{ display: 'flex', gap: 3, height: 26, borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
          {m.sts.map((s) => {
            const c = ft.filter((t) => t.status === s).length
            const p = m.total ? (c / m.total) * 100 : 0
            if (!p) return null
            return (
              <div
                key={s}
                style={{
                  width: `${p}%`,
                  background: stOf(s).c,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#fff',
                  minWidth: p > 6 ? 30 : 0,
                }}
              >
                {p > 8 && `${Math.round(p)}%`}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {m.sts.map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <div style={{ width: 9, height: 9, borderRadius: 2, background: stOf(s).c }} />
              <span style={{ color: T.textSec }}>{s}</span>
              <span style={{ color: T.text, fontWeight: 700 }}>{ft.filter((t) => t.status === s).length}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader>Tiến độ theo Module</SectionHeader>
        {m.mods
          .sort((a, b) => b.total - a.total)
          .map((mod) => {
            const p = mod.total ? Math.round((mod.done / mod.total) * 100) : 0
            return (
              <div key={mod.m} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ width: 110, fontSize: 13, color: T.text, fontWeight: 500, flexShrink: 0 }}>{mod.m}</span>
                <ProgressBar value={p} color={p === 100 ? T.ok : p > 60 ? T.info : T.warn} />
                <span style={{ minWidth: 38, textAlign: 'right', fontSize: 13, fontWeight: 700, color: p === 100 ? T.ok : T.text }}>
                  {p}%
                </span>
                <span style={{ minWidth: 50, textAlign: 'right', fontSize: 11, color: T.textSec }}>
                  {mod.done}/{mod.total}
                </span>
                {mod.over > 0 && (
                  <Badge color={T.danger} bg={T.dangerSoft} small>
                    ⚠{mod.over}
                  </Badge>
                )}
              </div>
            )
          })}
      </Card>
    </div>
  )
}
