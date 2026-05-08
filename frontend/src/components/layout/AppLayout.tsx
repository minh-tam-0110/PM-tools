import type { ReactNode } from 'react'
import { T } from '@/lib/constants'

export function AppLayout({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
        background: T.bg,
        color: T.text,
        minHeight: '100vh',
        paddingBottom: 40,
      }}
    >
      {header}
      <div
        style={{
          width: '100%',
          padding: '0 clamp(16px, 2vw, 40px)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
