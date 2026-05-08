import { T } from '@/lib/constants'

type PayloadItem = { name: string; value: number; color: string }
type Props = { active?: boolean; payload?: PayloadItem[]; label?: string }

export function ChartTooltip({ active, payload, label }: Props) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.borderLight}`,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        boxShadow: '0 8px 30px rgba(0,0,0,.4)',
      }}
    >
      <div style={{ fontWeight: 700, color: T.text, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <span style={{ color: T.textSec }}>{p.name}:</span>
          <span style={{ color: T.text, fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}
