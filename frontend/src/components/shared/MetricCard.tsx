import type { ReactNode } from 'react'
import { T } from '@/lib/constants'

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
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: '18px 20px',
        flex: 1,
        minWidth: 150,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color || T.accent }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div
            style={{
              fontSize: 11,
              color: T.textMuted,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: color || T.text, letterSpacing: -1, lineHeight: 1 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 11, color: T.textSec, marginTop: 5 }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize: 18, opacity: 0.5 }}>{icon}</div>}
      </div>
    </div>
  )
}
