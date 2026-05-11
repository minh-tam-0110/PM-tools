import type { CSSProperties, ReactNode } from 'react'

type Props = { children: ReactNode; style?: CSSProperties; glow?: boolean; hoverable?: boolean }

export function Card({ children, style, glow, hoverable = true }: Props) {
  return (
    <div
      className={`glass-panel ${hoverable ? 'card-hover' : ''}`}
      style={{
        borderRadius: 16,
        padding: 24,
        boxShadow: glow ? '0 0 20px var(--app-accent-glow)' : '0 4px 6px rgba(0,0,0,0.1)',
        border: glow ? '1px solid var(--app-accent)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
