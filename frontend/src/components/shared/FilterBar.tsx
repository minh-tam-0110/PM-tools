import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PRIORITIES, STATUSES, stOf } from '@/lib/constants'
import { applyFilters, hasActiveFilter } from '@/lib/filter'
import { useFilterStore, useTaskStore } from '@/stores'

const sel = {
  padding: '6px 12px',
  borderRadius: 8,
  border: `1px solid var(--app-border)`,
  background: 'var(--app-surface)',
  color: 'var(--app-text)',
  fontSize: 13,
  fontWeight: 600,
  outline: 'none' as const,
  cursor: 'pointer' as const,
  transition: 'all 0.2s ease',
}

type MSOption = { value: string; row: ReactNode; accent?: string }

function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  selectedLabel,
  minWidth = 180,
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
          background: active ? 'rgba(124, 106, 239, 0.1)' : 'var(--app-surface)',
          borderColor: active ? 'var(--app-accent)' : 'var(--app-border)',
          color: active ? 'var(--app-accent)' : 'var(--app-text)',
          boxShadow: active ? '0 0 0 1px var(--app-accent)' : 'none',
        }}
      >
        {label} <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>▼</span>
      </button>
      {open && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 100,
            background: 'var(--app-card)',
            border: `1px solid var(--app-border)`,
            borderRadius: 12,
            padding: '6px 0',
            minWidth,
            maxHeight: 320,
            overflowY: 'auto',
            boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--app-text-muted)' }}>Không có lựa chọn</div>
          )}
          {options.map((opt) => {
            const checked = value.includes(opt.value)
            return (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  background: checked ? 'rgba(255,255,255,.04)' : 'transparent',
                  fontSize: 13,
                  color: checked ? 'var(--app-text)' : 'var(--app-text-sec)',
                  fontWeight: checked ? 600 : 500,
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => {
                  if (!checked) e.currentTarget.style.background = 'rgba(255,255,255,.02)'
                }}
                onMouseOut={(e) => {
                  if (!checked) e.currentTarget.style.background = 'transparent'
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                  style={{ accentColor: opt.accent ?? 'var(--app-accent)', cursor: 'pointer', width: 14, height: 14 }}
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
  const projectMap = useTaskStore((s) => s.projectMap)
  const filters = useFilterStore((s) => s.filters)
  const search = useFilterStore((s) => s.search)
  const set = useFilterStore((s) => s.set)
  const clear = useFilterStore((s) => s.clear)

  const hasProjectMap = Object.keys(projectMap).length > 0

  // Project list: ưu tiên đọc từ projectMap (BE đã sắp xếp); fallback derive từ tasks.module.
  const modules = useMemo(
    () => (hasProjectMap ? Object.keys(projectMap) : [...new Set(tasks.map((t) => t.module))]),
    [hasProjectMap, projectMap, tasks],
  )

  // Sprints/members hiển thị: nếu chưa chọn project ("all") → all; ngược lại đọc trực tiếp
  // projectMap[selected]. Không còn useMemo scoping logic ở FE.
  const scopedSprints =
    filters.module === 'all'
      ? sprints
      : hasProjectMap
        ? (projectMap[filters.module]?.sprints ?? [])
        : sprints.filter((s) => tasks.some((t) => t.module === filters.module && t.sprint?.id === s.id))

  const scopedMembers =
    filters.module === 'all'
      ? team
      : hasProjectMap
        ? (projectMap[filters.module]?.members ?? [])
        : team.filter((m) => tasks.some((t) => t.module === filters.module && t.assignee?.id === m.id))

  // Active sprint ID cho project hiện tại — dùng để mark "🎯 Active" trong dropdown.
  const activeSprintId =
    filters.module !== 'all' && hasProjectMap ? projectMap[filters.module]?.activeSprintId : undefined

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
        accent: 'var(--app-accent)',
        row: (
          <>
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'rgba(124, 106, 239, 0.2)',
                color: 'var(--app-accent)',
                fontSize: 10,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {m.av}
            </span>
            <span>{m.name}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--app-text-muted)', fontWeight: 500 }}>{m.role}</span>
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
              <span style={{ color: cfg.c, fontSize: 14 }}>{cfg.i}</span>
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
    <div className="glass-panel" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px', borderRadius: 12, position: 'relative', zIndex: 40 }}>
      <span style={{ fontSize: 13, color: 'var(--app-text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        Lọc:
      </span>

      <select className="input-premium" value={filters.module} onChange={(e) => onModuleChange(e.target.value)} style={sel}>
        <option value="all">Tất cả Project</option>
        {modules.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>

      <select
        className="input-premium"
        value={sprintInScope ? filters.sprint : 'all'}
        onChange={(e) => set({ sprint: e.target.value })}
        style={sel}
        disabled={scopedSprints.length === 0}
      >
        <option value="all">Tất cả Sprint</option>
        {scopedSprints.map((s) => {
          const isActive = s.id === activeSprintId
          return (
            <option key={s.id} value={s.id}>
              {s.name}
              {isActive ? '  🎯 Active' : s.status === 'active' ? ' ●' : ''}
            </option>
          )
        })}
      </select>

      <MultiSelect
        options={memberOptions}
        value={filters.members}
        onChange={(members) => set({ members })}
        placeholder="Assignee"
        selectedLabel={(n, first) => {
          if (n === 0) return 'Assignee'
          if (n === 1 && first) {
            const m = scopedMembers.find((x) => String(x.id) === first.value)
            return m?.name ?? `${n} người`
          }
          return `${n} người`
        }}
        minWidth={240}
      />

      <select className="input-premium" value={filters.priority} onChange={(e) => set({ priority: e.target.value })} style={sel}>
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
          className="btn-outline"
          onClick={clear}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: `1px solid rgba(248,113,113,.3)`,
            background: 'rgba(248,113,113,.1)',
            color: 'var(--app-danger, #F87171)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          ✕ Xóa Lọc
        </button>
      )}
      <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--app-text-sec)', fontWeight: 600 }}>
        Hiển thị <span style={{ color: 'var(--app-text)', fontWeight: 800 }}>{filteredCount}</span> tasks
      </span>
    </div>
  )
}
