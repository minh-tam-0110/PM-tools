import type { ReactNode } from 'react'

type Props = { children: ReactNode; color: string; bg: string; small?: boolean }

export function Badge({ children, color, bg, small }: Props) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: small ? '2px 8px' : '4px 10px',
        borderRadius: 6,
        fontSize: small ? 11 : 12,
        fontWeight: 700,
        color,
        background: bg,
        border: `1px solid ${color.replace(')', ', 0.2)').replace('rgb', 'rgba')}`, // fallback or if it's hex, just subtle
        whiteSpace: 'nowrap',
        boxShadow: `0 2px 4px ${bg.replace(')', ', 0.5)').replace('rgb', 'rgba')}`,
      }}
    >
      {children}
    </span>
  )
}
