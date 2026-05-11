import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PRIORITIES, STATUSES, stOf, T } from '@/lib/constants'
import { applyFilters, hasActiveFilter } from '@/lib/filter'
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

type MSOption = { value: string; row: ReactNode; accent?: string }

function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  selectedLabel,
  minWidth = 160,
}: {
  options: MSOption[]
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
  selectedLabel?: (n: number, first: MSOption | undefined) => string
  minWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  const firstSelected = options.find((o) => o.value === value[0])
  const defaultLabel = (n: number, first: MSOption | undefined): string =>
    n === 0 ? placeholder : n === 1 && first ? String(first.value) : `${n} đã chọn`
  const label = (selectedLabel ?? defaultLabel)(value.length, firstSelected)
  const active = value.length > 0

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          ...sel,
          background: active ? 'rgba(124,106,239,0.12)' : T.surface,
          borderColor: active ? T.accent : T.border,
          color: active ? T.accent : T.text,
        }}
      >
        {label} ▾
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 100,
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: '4px 0',
            minWidth,
            maxHeight: 320,
            overflowY: 'auto',
            boxShadow: T.shadowLg,
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: 11, color: T.textMuted }}>Không có lựa chọn</div>
          )}
          {options.map((opt) => {
            const checked = value.includes(opt.value)
            return (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 12px',
                  cursor: 'pointer',
                  background: checked ? 'rgba(255,255,255,.04)' : 'transparent',
                  fontSize: 12,
                  color: T.text,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                  style={{ accentColor: opt.accent ?? T.accent, cursor: 'pointer' }}
                />
                {opt.row}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
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

  // Scope sprints + members theo module đang chọn — task nào thuộc module thì sprint/member của nó
  // mới xuất hiện trong dropdown. Tránh chọn người/sprint không hề có task trong project.
  const scopedTasks = useMemo(
    () => (filters.module === 'all' ? tasks : tasks.filter((t) => t.module === filters.module)),
    [tasks, filters.module],
  )
  const scopedSprints = useMemo(() => {
    const ids = new Set(scopedTasks.map((t) => t.sprint?.id).filter(Boolean) as string[])
    return sprints.filter((s) => ids.has(s.id))
  }, [scopedTasks, sprints])
  const scopedMembers = useMemo(() => {
    const ids = new Set(scopedTasks.map((t) => t.assignee?.id).filter((v) => v !== undefined))
    return team.filter((m) => ids.has(m.id))
  }, [scopedTasks, team])

  const filteredCount = useMemo(() => applyFilters(tasks, filters, search).length, [tasks, filters, search])
  const active = hasActiveFilter(filters)

  const onModuleChange = (mod: string) => {
    // Đổi project → sprint + members hiện tại có thể không còn nằm trong project mới.
    // Reset cả hai để filter bắt đầu fresh trong scope project mới.
    set({ module: mod, sprint: 'all', members: [] })
  }

  const memberOptions: MSOption[] = useMemo(
    () =>
      scopedMembers.map((m) => ({
        value: String(m.id),
        accent: T.accent,
        row: (
          <>
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: T.accentSoft,
                color: T.accent,
                fontSize: 9,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {m.av}
            </span>
            <span>{m.name}</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: T.textMuted }}>{m.role}</span>
          </>
        ),
      })),
    [scopedMembers],
  )

  const statusOptions: MSOption[] = useMemo(
    () =>
      STATUSES.map((s) => {
        const cfg = stOf(s)
        return {
          value: s,
          accent: cfg.c,
          row: (
            <>
              <span style={{ color: cfg.c, fontSize: 13 }}>{cfg.i}</span>
              <span>{s}</span>
            </>
          ),
        }
      }),
    [],
  )

  // Nếu sprint đang chọn không còn trong scope → hiện cảnh báo (nhưng không tự reset, user có thể vừa lỡ đổi project).
  const sprintInScope = filters.sprint === 'all' || scopedSprints.some((s) => s.id === filters.sprint)

  return (
    <div style={{ display: 'flex', gap: 7, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>Lọc:</span>

      <select value={filters.module} onChange={(e) => onModuleChange(e.target.value)} style={sel}>
        <option value="all">Tất cả Project</option>
        {modules.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>

      <select
        value={sprintInScope ? filters.sprint : 'all'}
        onChange={(e) => set({ sprint: e.target.value })}
        style={sel}
        disabled={scopedSprints.length === 0}
      >
        <option value="all">Tất cả Sprint</option>
        {scopedSprints.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.status === 'active' ? ' ●' : ''}
          </option>
        ))}
      </select>

      <MultiSelect
        options={memberOptions}
        value={filters.members}
        onChange={(members) => set({ members })}
        placeholder="Người"
        selectedLabel={(n, first) => {
          if (n === 0) return 'Người'
          if (n === 1 && first) {
            const m = scopedMembers.find((x) => String(x.id) === first.value)
            return m?.name ?? `${n} người`
          }
          return `${n} người`
        }}
        minWidth={220}
      />

      <select value={filters.priority} onChange={(e) => set({ priority: e.target.value })} style={sel}>
        <option value="all">Priority</option>
        {PRIORITIES.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>

      <MultiSelect
        options={statusOptions}
        value={filters.statuses}
        onChange={(statuses) => set({ statuses })}
        placeholder="Status"
        selectedLabel={(n, first) => (n === 0 ? 'Status' : n === 1 && first ? first.value : `${n} status`)}
      />

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
