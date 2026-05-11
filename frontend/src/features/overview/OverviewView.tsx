/** Overview tab — 4 metric + status bar + module progress. Spec: docs/features/overview.md */
import { useMemo } from 'react'
import _ from 'lodash'
import { useFilterStore, useTaskStore } from '@/stores'
import { applyFilters } from '@/lib/filter'
import { stOf } from '@/lib/constants'
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
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <MetricCard label="Hoàn thành" value={`${m.pct}%`} sub={`${m.done}/${m.total} tasks`} color="var(--app-ok, #34D399)" icon="✓" />
        <MetricCard label="Overdue" value={m.over} sub="cần xử lý" color={m.over > 0 ? 'var(--app-danger, #F87171)' : 'var(--app-ok, #34D399)'} icon="⚠" />
        <MetricCard label="Đang làm" value={m.prog} sub={`${m.rev} đang review`} color="var(--app-info, #60A5FA)" icon="◐" />
        <MetricCard label="Story Points" value={`${m.dSP}/${m.tSP}`} sub="SP done" color="var(--app-accent)" icon="◆" />
      </div>

      <Card>
        <SectionHeader>Phân bố trạng thái</SectionHeader>
        <div style={{ display: 'flex', gap: 4, height: 28, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
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
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#fff',
                  minWidth: p > 6 ? 36 : 0,
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {p > 8 && `${Math.round(p)}%`}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {m.sts.map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: stOf(s).c, boxShadow: `0 0 8px ${stOf(s).c}` }} />
              <span style={{ color: 'var(--app-text-sec)' }}>{s}</span>
              <span style={{ color: 'var(--app-text)', fontWeight: 800 }}>{ft.filter((t) => t.status === s).length}</span>
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
              <div key={mod.m} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <span style={{ width: 130, fontSize: 14, color: 'var(--app-text)', fontWeight: 600, flexShrink: 0 }}>{mod.m}</span>
                <ProgressBar value={p} color={p === 100 ? 'var(--app-ok, #34D399)' : p > 60 ? 'var(--app-info, #60A5FA)' : 'var(--app-warn, #FBBF24)'} />
                <span style={{ minWidth: 42, textAlign: 'right', fontSize: 14, fontWeight: 800, color: p === 100 ? 'var(--app-ok, #34D399)' : 'var(--app-text)' }}>
                  {p}%
                </span>
                <span style={{ minWidth: 54, textAlign: 'right', fontSize: 12, color: 'var(--app-text-sec)' }}>
                  {mod.done}/{mod.total}
                </span>
                {mod.over > 0 && (
                  <Badge color="var(--app-danger, #F87171)" bg="rgba(248,113,113,0.1)" small>
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
