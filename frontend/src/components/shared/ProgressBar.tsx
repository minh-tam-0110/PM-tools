import { T } from '@/lib/constants'

type Props = { value: number; color?: string; h?: number }

export function ProgressBar({ value, color, h = 5 }: Props) {
  return (
    <div
      style={{
        flex: 1,
        height: h,
        background: T.bgDim,
        borderRadius: h,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.min(value, 100)}%`,
          height: '100%',
          background: color || T.accent,
          borderRadius: h,
          transition: 'width .5s',
        }}
      />
    </div>
  )
}
