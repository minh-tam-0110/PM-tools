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
  searchable = false,
  searchPlaceholder = 'Tìm...',
  searchKey,
}: {
  options: MSOption[]
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
  selectedLabel?: (n: number, first: MSOption | undefined) => string
  minWidth?: number
  searchable?: boolean
  searchPlaceholder?: string
  /** Per-option searchable string. Defaults to option.value. */
  searchKey?: (o: MSOption) => string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = query.toLowerCase()
    const key = searchKey ?? ((o: MSOption) => o.value)
    return options.filter((o) => key(o).toLowerCase().includes(q))
  }, [options, query, searchable, searchKey])

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
          {searchable && (
            <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, background: 'var(--app-card)', zIndex: 1 }}>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--app-border)',
                  background: 'var(--app-surface)',
                  color: 'var(--app-text)',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </div>
          )}
          {filteredOptions.length === 0 && (
            <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--app-text-muted)' }}>
              {searchable && query ? 'Không tìm thấy' : 'Không có lựa chọn'}
            </div>
          )}
          {filteredOptions.map((opt) => {
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

function SingleSelect({
  options,
  value,
  onChange,
  placeholder,
  allLabel,
  minWidth = 180,
  searchable = false,
  searchPlaceholder = 'Tìm...',
  searchKey,
  disabled = false,
}: {
  options: MSOption[]
  value: string
  onChange: (v: string) => void
  /** Label hiển thị khi không có option nào chọn ("all"). */
  placeholder: string
  /** Label cho option "all" (clear). */
  allLabel?: string
  minWidth?: number
  searchable?: boolean
  searchPlaceholder?: string
  searchKey?: (o: MSOption) => string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options
    const q = query.toLowerCase()
    const key = searchKey ?? ((o: MSOption) => o.value)
    return options.filter((o) => key(o).toLowerCase().includes(q))
  }, [options, query, searchable, searchKey])

  const selected = options.find((o) => o.value === value)
  const active = value !== 'all' && !!selected

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        style={{
          ...sel,
          background: active ? 'rgba(124, 106, 239, 0.1)' : 'var(--app-surface)',
          borderColor: active ? 'var(--app-accent)' : 'var(--app-border)',
          color: active ? 'var(--app-accent)' : 'var(--app-text)',
          boxShadow: active ? '0 0 0 1px var(--app-accent)' : 'none',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {selected ? selected.value : placeholder} <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>▼</span>
      </button>
      {open && !disabled && (
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
          {searchable && (
            <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, background: 'var(--app-card)', zIndex: 1 }}>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--app-border)',
                  background: 'var(--app-surface)',
                  color: 'var(--app-text)',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </div>
          )}
          <div
            onClick={() => {
              onChange('all')
              setOpen(false)
            }}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: value === 'all' ? 700 : 500,
              color: value === 'all' ? 'var(--app-text)' : 'var(--app-text-sec)',
              background: value === 'all' ? 'rgba(255,255,255,.04)' : 'transparent',
              cursor: 'pointer',
              borderBottom: '1px solid var(--app-border)',
            }}
          >
            {allLabel ?? `Tất cả ${placeholder}`}
          </div>
          {filteredOptions.length === 0 && (
            <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--app-text-muted)' }}>
              {searchable && query ? 'Không tìm thấy' : 'Không có lựa chọn'}
            </div>
          )}
          {filteredOptions.map((opt) => {
            const checked = opt.value === value
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
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
                {opt.row}
              </div>
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

  // Sprints/members hiển thị: nếu không chọn project nào → all; nếu chọn 1+ project → union
  // sprints/members của các project được chọn.
  const scopedSprints = useMemo(() => {
    if (filters.modules.length === 0) return sprints
    if (hasProjectMap) {
      const seen = new Set<string>()
      const out: typeof sprints = []
      for (const m of filters.modules) {
        for (const s of projectMap[m]?.sprints ?? []) {
          if (!seen.has(s.id)) {
            seen.add(s.id)
            out.push(s)
          }
        }
      }
      return out
    }
    return sprints.filter((s) =>
      tasks.some((t) => filters.modules.includes(t.module) && t.sprint?.id === s.id),
    )
  }, [filters.modules, sprints, hasProjectMap, projectMap, tasks])

  const scopedMembers = useMemo(() => {
    if (filters.modules.length === 0) return team
    if (hasProjectMap) {
      const seen = new Set<number>()
      const out: typeof team = []
      for (const m of filters.modules) {
        for (const mb of projectMap[m]?.members ?? []) {
          if (!seen.has(mb.id)) {
            seen.add(mb.id)
            out.push(mb)
          }
        }
      }
      return out
    }
    return team.filter((m) => tasks.some((t) => filters.modules.includes(t.module) && t.assignee?.id === m.id))
  }, [filters.modules, team, hasProjectMap, projectMap, tasks])

  // Active sprint ID — chỉ show khi đúng 1 project được chọn.
  const activeSprintId =
    filters.modules.length === 1 && hasProjectMap ? projectMap[filters.modules[0]]?.activeSprintId : undefined

  const filteredCount = useMemo(() => applyFilters(tasks, filters, search).length, [tasks, filters, search])
  const active = hasActiveFilter(filters)

  const onModulesChange = (mods: string[]) => {
    // Đổi project → sprint + members hiện tại có thể không còn trong scope mới.
    set({ modules: mods, sprint: 'all', members: [] })
  }

  const moduleOptions: MSOption[] = useMemo(
    () =>
      modules.map((m) => ({
        value: m,
        row: <span>{m}</span>,
      })),
    [modules],
  )

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

      <MultiSelect
        options={moduleOptions}
        value={filters.modules}
        onChange={onModulesChange}
        placeholder="Project"
        selectedLabel={(n, first) => (n === 0 ? 'Project' : n === 1 && first ? first.value : `${n} project`)}
        minWidth={220}
        searchable
        searchPlaceholder="Tìm project..."
      />

      <SingleSelect
        options={scopedSprints.map((s) => {
          const isActive = s.id === activeSprintId
          const suffix = isActive ? '  🎯 Active' : s.status === 'active' ? ' ●' : ''
          return {
            value: s.id,
            row: (
              <>
                <span>{s.name}</span>
                {suffix && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--app-text-muted)' }}>{suffix}</span>}
              </>
            ),
          }
        })}
        value={sprintInScope ? filters.sprint : 'all'}
        onChange={(v) => set({ sprint: v })}
        placeholder="Sprint"
        allLabel="Tất cả Sprint"
        minWidth={220}
        disabled={scopedSprints.length === 0}
      />

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
        searchable
        searchPlaceholder="Tìm assignee..."
        searchKey={(o) => {
          const m = scopedMembers.find((x) => String(x.id) === o.value)
          return `${m?.name ?? ''} ${m?.role ?? ''}`
        }}
      />

      <SingleSelect
        options={PRIORITIES.map((p) => ({
          value: p,
          row: <span>{p}</span>,
        }))}
        value={filters.priority}
        onChange={(v) => set({ priority: v })}
        placeholder="Priority"
        allLabel="Tất cả Priority"
      />

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
