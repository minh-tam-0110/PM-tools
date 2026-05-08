import type { CSSProperties, ReactNode } from 'react'
import { T } from '@/lib/constants'

type Props = { children: ReactNode; style?: CSSProperties; glow?: boolean }

export function Card({ children, style, glow }: Props) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${glow ? 'rgba(124,106,239,0.3)' : T.border}`,
        borderRadius: 14,
        padding: 22,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
