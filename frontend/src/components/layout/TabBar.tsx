import { T } from '@/lib/constants'

export type TabId = 'overview' | 'charts' | 'calendar' | 'team' | 'projects' | 'kanban'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Tổng quan', icon: '◫' },
  { id: 'charts', label: 'Charts', icon: '📊' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'team', label: 'Members', icon: '◉' },
  { id: 'projects', label: 'Projects', icon: '⌘' },
  { id: 'kanban', label: 'Kanban', icon: '▦' },
]

export function TabBar({ value, onChange }: { value: TabId; onChange: (t: TabId) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        background: T.surface,
        borderRadius: 10,
        padding: 3,
        border: `1px solid ${T.border}`,
        flexWrap: 'wrap',
      }}
    >
      {TABS.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: active ? T.accent : 'transparent',
              color: active ? '#fff' : T.textSec,
              transition: 'all .2s',
            }}
          >
            {t.icon} {t.label}
          </button>
        )
      })}
    </div>
  )
}
