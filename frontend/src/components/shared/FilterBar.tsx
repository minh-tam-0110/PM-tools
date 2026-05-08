import { useMemo } from 'react'
import { PRIORITIES, T } from '@/lib/constants'
import { hasActiveFilter } from '@/lib/filter'
import { applyFilters } from '@/lib/filter'
import { useFilterStore, useTaskStore } from '@/stores'

const sel = {
  padding: '5px 9px',
  borderRadius: 7,
  border: `1px solid ${T.border}`,
  background: T.surface,
  color: T.text,
  fontSize: 12,
  outline: 'none' as const,
  cursor: 'pointer' as const,
}

export function FilterBar() {
  const tasks = useTaskStore((s) => s.tasks)
  const team = useTaskStore((s) => s.team)
  const sprints = useTaskStore((s) => s.sprints)
  const filters = useFilterStore((s) => s.filters)
  const search = useFilterStore((s) => s.search)
  const set = useFilterStore((s) => s.set)
  const clear = useFilterStore((s) => s.clear)

  const modules = useMemo(() => [...new Set(tasks.map((t) => t.module))], [tasks])
  const filteredCount = useMemo(() => applyFilters(tasks, filters, search).length, [tasks, filters, search])
  const active = hasActiveFilter(filters)

  return (
    <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>Lọc:</span>
      <select value={filters.sprint} onChange={(e) => set({ sprint: e.target.value })} style={sel}>
        <option value="all">Tất cả Sprint</option>
        {sprints.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.status === 'active' ? ' ●' : ''}
          </option>
        ))}
      </select>
      <select value={filters.member} onChange={(e) => set({ member: e.target.value })} style={sel}>
        <option value="all">Tất cả người</option>
        {team.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <select value={filters.priority} onChange={(e) => set({ priority: e.target.value })} style={sel}>
        <option value="all">Priority</option>
        {PRIORITIES.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      <select value={filters.module} onChange={(e) => set({ module: e.target.value })} style={sel}>
        <option value="all">Project</option>
        {modules.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      {active && (
        <button
          onClick={clear}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${T.danger}`,
            background: T.dangerSoft,
            color: T.danger,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ✕ Xóa
        </button>
      )}
      <span style={{ marginLeft: 'auto', fontSize: 12, color: T.textMuted }}>{filteredCount} tasks</span>
    </div>
  )
}
