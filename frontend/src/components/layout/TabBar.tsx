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
      className="glass-panel"
      style={{
        display: 'inline-flex',
        gap: 4,
        borderRadius: 12,
        padding: 4,
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
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: active ? 'var(--app-gradient-primary)' : 'transparent',
              color: active ? '#fff' : 'var(--app-text-sec)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: active ? '0 4px 12px rgba(124, 106, 239, 0.3)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = 'var(--app-text)'
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = 'var(--app-text-sec)'
            }}
          >
            <span style={{ fontSize: 14, opacity: active ? 1 : 0.7 }}>{t.icon}</span>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
