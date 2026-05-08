import type { ReactNode } from 'react'
import { T } from '@/lib/constants'

type Props = { children: ReactNode; sub?: ReactNode; right?: ReactNode }

export function SectionHeader({ children, sub, right }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{children}</div>
        {sub && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}
