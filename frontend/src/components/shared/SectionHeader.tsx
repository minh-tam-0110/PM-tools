import type { ReactNode } from 'react'

type Props = { children: ReactNode; sub?: ReactNode; right?: ReactNode }

export function SectionHeader({ children, sub, right }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--app-text)', letterSpacing: '-0.5px' }}>{children}</div>
        {sub && <div style={{ fontSize: 13, color: 'var(--app-text-muted)', marginTop: 4 }}>{sub}</div>}
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}
