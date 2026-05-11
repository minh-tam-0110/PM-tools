type Props = { value: number; color?: string; h?: number }

export function ProgressBar({ value, color, h = 6 }: Props) {
  return (
    <div
      style={{
        flex: 1,
        height: h,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: h,
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
      }}
    >
      <div
        style={{
          width: `${Math.min(value, 100)}%`,
          height: '100%',
          background: color || 'var(--app-gradient-primary)',
          boxShadow: color ? `0 0 8px ${color}` : undefined,
          borderRadius: h,
          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  )
}
