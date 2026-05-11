import type { ReactNode } from 'react'

export function AppLayout({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        minHeight: '100vh',
        paddingBottom: 40,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {header}
      <main
        className="animate-fade-in"
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 1600,
          margin: '0 auto',
          padding: '0 clamp(16px, 3vw, 40px)',
        }}
      >
        {children}
      </main>
    </div>
  )
}
