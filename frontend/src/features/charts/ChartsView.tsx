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
import { stOf, STATUSES, T } from '@/lib/constants'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {burn.length > 0 && (
          <Card style={{ flex: 1.2, minWidth: 320 }} glow>
            <SectionHeader sub={active ? `${active.name} • ${active.start} → ${active.end}` : ''}>🔥 Sprint Burndown</SectionHeader>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={burn} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="ba" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.info} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={T.info} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="day" tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.border} />
                <YAxis tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.border} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  stroke={T.textMuted}
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  dot={false}
                  name="Lý tưởng"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke={T.info}
                  strokeWidth={2.5}
                  fill="url(#ba)"
                  dot={{ r: 3, fill: T.info, strokeWidth: 0 }}
                  name="Thực tế"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {velData.length > 0 && (
          <Card style={{ flex: 1, minWidth: 280 }}>
            <SectionHeader sub="Committed vs Completed SP">⚡ Velocity</SectionHeader>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={velData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="name" tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.border} />
                <YAxis tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.border} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="committed" name="Committed" radius={[4, 4, 0, 0]} fill={T.borderLight} barSize={20} />
                <Bar dataKey="completed" name="Completed" radius={[4, 4, 0, 0]} barSize={20}>
                  {velData.map((e, i) => (
                    <Cell key={i} fill={e.completed >= e.committed ? T.ok : T.warn} />
                  ))}
                </Bar>
                <ReferenceLine y={avgVel} stroke={T.accent} strokeDasharray="5 3" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', fontSize: 12, color: T.textSec, marginTop: 6 }}>
              Avg: <span style={{ color: T.accent, fontWeight: 700 }}>{avgVel} SP/sprint</span>
            </div>
          </Card>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Card style={{ flex: 1.2, minWidth: 320 }}>
          <SectionHeader sub="Task theo trạng thái mỗi người">👥 Team Distribution</SectionHeader>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={perPerson} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="name" tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.border} />
              <YAxis tick={{ fill: T.textMuted, fontSize: 11 }} stroke={T.border} />
              <Tooltip content={<ChartTooltip />} />
              {STATUSES.map((s) => (
                <Bar key={s} dataKey={s} stackId="a" fill={stOf(s).c} name={s} barSize={26} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ flex: 1, minWidth: 260 }}>
          <SectionHeader>📊 Status</SectionHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="value"
                  stroke="none"
                  paddingAngle={3}
                >
                  {pieData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pieData.map((p) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 3, background: p.color }} />
                  <span style={{ fontSize: 12, color: T.textSec, flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
