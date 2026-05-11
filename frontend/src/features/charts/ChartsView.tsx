/** Charts tab — Burndown / Velocity / Distribution / Donut. Spec: docs/features/charts.md */
import { useMemo } from 'react'
import _ from 'lodash'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useFilterStore, useTaskStore } from '@/stores'
import { applyFilters } from '@/lib/filter'
import { stOf, STATUSES } from '@/lib/constants'
import { Card } from '@/components/shared/Card'
import { ChartTooltip } from '@/components/shared/ChartTooltip'
import { SectionHeader } from '@/components/shared/SectionHeader'

export function ChartsView() {
  const tasks = useTaskStore((s) => s.tasks)
  const team = useTaskStore((s) => s.team)
  const sprints = useTaskStore((s) => s.sprints)
  const filters = useFilterStore((s) => s.filters)
  const search = useFilterStore((s) => s.search)

  const ft = useMemo(() => applyFilters(tasks, filters, search), [tasks, filters, search])

  const pieData = useMemo(
    () =>
      [...new Set(ft.map((t) => t.status))].map((s) => ({
        name: s,
        value: ft.filter((t) => t.status === s).length,
        color: stOf(s).c,
      })),
    [ft],
  )

  const perPerson = useMemo(
    () =>
      team.map((m) => {
        const mt = ft.filter((t) => t.assignee?.id === m.id)
        const o: Record<string, string | number> = { name: m.name.split(' ').pop() ?? m.name }
        for (const s of STATUSES) o[s] = mt.filter((t) => t.status === s).length
        return o
      }),
    [team, ft],
  )

  const velData = useMemo(
    () =>
      sprints
        .filter((s) => s.status !== 'upcoming' && s.committed > 0)
        .map((s) => ({
          name: s.name.replace('Sprint ', 'S'),
          committed: s.committed,
          completed: s.completed || 0,
        })),
    [sprints],
  )

  const active = sprints.find((s) => s.status === 'active')

  const burn = useMemo(() => {
    if (!active) return [] as { day: string; ideal: number; actual: number }[]
    const start = new Date(active.start || new Date())
    const total = active.committed || 50
    let rem = total
    const days = 14
    return Array.from({ length: Math.min(12, days + 1) }, (_unused, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const ideal = Math.round((total - (total / days) * i) * 10) / 10
      if (i > 0) rem = Math.max(0, rem - (1 + Math.floor(Math.random() * 3)))
      return { day: `${d.getDate()}/${d.getMonth() + 1}`, ideal, actual: rem }
    })
  }, [active])

  const avgVel = velData.length ? Math.round(_.meanBy(velData, 'completed')) : 0

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {burn.length > 0 && (
          <Card style={{ flex: 1.2, minWidth: 360 }} glow hoverable={false}>
            <SectionHeader sub={active ? `${active.name} • ${active.start} → ${active.end}` : ''}>🔥 Sprint Burndown</SectionHeader>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={burn} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="ba" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--app-info)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--app-info)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border-light)" />
                <XAxis dataKey="day" tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }} stroke="var(--app-border)" />
                <YAxis tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }} stroke="var(--app-border)" />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  stroke="var(--app-text-muted)"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  dot={false}
                  name="Lý tưởng"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--app-info, #60A5FA)"
                  strokeWidth={3}
                  fill="url(#ba)"
                  dot={{ r: 4, fill: 'var(--app-info, #60A5FA)', strokeWidth: 0 }}
                  name="Thực tế"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {velData.length > 0 && (
          <Card style={{ flex: 1, minWidth: 320 }} hoverable={false}>
            <SectionHeader sub="Committed vs Completed SP">⚡ Velocity</SectionHeader>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={velData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border-light)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }} stroke="var(--app-border)" />
                <YAxis tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }} stroke="var(--app-border)" />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="committed" name="Committed" radius={[4, 4, 0, 0]} fill="rgba(255,255,255,0.1)" barSize={24} />
                <Bar dataKey="completed" name="Completed" radius={[4, 4, 0, 0]} barSize={24}>
                  {velData.map((e, i) => (
                    <Cell key={i} fill={e.completed >= e.committed ? 'var(--app-ok, #34D399)' : 'var(--app-warn, #FBBF24)'} />
                  ))}
                </Bar>
                <ReferenceLine y={avgVel} stroke="var(--app-accent)" strokeDasharray="5 3" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--app-text-sec)', marginTop: 12, fontWeight: 600 }}>
              Avg: <span style={{ color: 'var(--app-accent)', fontWeight: 800 }}>{avgVel} SP/sprint</span>
            </div>
          </Card>
        )}
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <Card style={{ flex: 1.2, minWidth: 360 }} hoverable={false}>
          <SectionHeader sub="Task theo trạng thái mỗi người">👥 Team Distribution</SectionHeader>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={perPerson} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border-light)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }} stroke="var(--app-border)" />
              <YAxis tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }} stroke="var(--app-border)" />
              <Tooltip content={<ChartTooltip />} />
              {STATUSES.map((s) => (
                <Bar key={s} dataKey={s} stackId="a" fill={stOf(s).c} name={s} barSize={32} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ flex: 1, minWidth: 300 }} hoverable={false}>
          <SectionHeader>📊 Status</SectionHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width="50%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  stroke="none"
                  paddingAngle={4}
                >
                  {pieData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pieData.map((p) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
                  <span style={{ fontSize: 13, color: 'var(--app-text-sec)', flex: 1, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--app-text)' }}>{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
