import type { ReactNode } from 'react'

type Props = { children: ReactNode; color: string; bg: string; small?: boolean }

export function Badge({ children, color, bg, small }: Props) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: small ? '1px 6px' : '3px 9px',
        borderRadius: 5,
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        color,
        background: bg,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
