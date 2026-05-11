import type { ReactNode } from 'react'

type Props = {
  label: string
  value: ReactNode
  sub?: string
  color?: string
  icon?: ReactNode
}

export function MetricCard({ label, value, sub, color, icon }: Props) {
  return (
    <div
      className="glass-panel card-hover"
      style={{
        borderRadius: 16,
        padding: '20px 24px',
        flex: 1,
        minWidth: 160,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}
    >
      <div 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: 3, 
          background: color || 'var(--app-accent)',
          boxShadow: `0 0 10px ${color || 'var(--app-accent)'}`,
        }} 
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--app-text-muted)',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: color || 'var(--app-text)', letterSpacing: '-1px', lineHeight: 1 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 12, color: 'var(--app-text-sec)', marginTop: 6 }}>{sub}</div>}
        </div>
        {icon && (
          <div 
            style={{ 
              fontSize: 24, 
              color: color || 'var(--app-text-muted)', 
              opacity: 0.8,
              background: 'rgba(255,255,255,0.05)',
              padding: 8,
              borderRadius: 12,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
