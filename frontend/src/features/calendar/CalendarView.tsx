/** Calendar tab — Week/Month grid. Spec: docs/features/calendar.md */
import { useMemo, useState } from 'react'
import _ from 'lodash'
import { useFilterStore, useTaskStore } from '@/stores'
import { applyFilters } from '@/lib/filter'
import { fmtDate, sameDay } from '@/lib/utils'
import { prioC, PRIORITIES, stOf, T } from '@/lib/constants'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/shared/Badge'
import { Card } from '@/components/shared/Card'

const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const TODAY = new Date()

function getWeek(d: Date): Date[] {
  const dd = new Date(d)
  const day = dd.getDay()
  const mon = new Date(dd)
  mon.setDate(dd.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_unused, i) => {
    const r = new Date(mon)
    r.setDate(mon.getDate() + i)
    return r
  })
}

function getMonth(y: number, m: number): Date[] {
  const f = new Date(y, m, 1)
  const sd = f.getDay() === 0 ? 6 : f.getDay() - 1
  const s = new Date(f)
  s.setDate(1 - sd)
  return Array.from({ length: 42 }, (_unused, i) => {
    const r = new Date(s)
    r.setDate(s.getDate() + i)
    return r
  })
}

export function CalendarView() {
  const tasks = useTaskStore((s) => s.tasks)
  const filters = useFilterStore((s) => s.filters)
  const search = useFilterStore((s) => s.search)
  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [off, setOff] = useState(0)

  const base = new Date(TODAY)
  if (mode === 'week') base.setDate(base.getDate() + off * 7)
  else base.setMonth(base.getMonth() + off)

  const ft = useMemo(() => applyFilters(tasks, filters, search), [tasks, filters, search])
  const byDate = useMemo(() => _.groupBy(ft, 'deadline'), [ft])

  const wk = getWeek(base)
  const mo = base.getMonth()
  const yr = base.getFullYear()
  const moDates = getMonth(yr, mo)
  const headerLabel =
    mode === 'week'
      ? `${wk[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} — ${wk[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
      : base.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

  const navBtn = {
    width: 32,
    height: 32,
    borderRadius: 7,
    border: `1px solid ${T.border}`,
    background: T.surface,
    color: T.text,
    cursor: 'pointer' as const,
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setOff((o) => o - 1)} style={navBtn}>‹</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text, minWidth: 190, textAlign: 'center' }}>{headerLabel}</span>
            <button onClick={() => setOff((o) => o + 1)} style={navBtn}>›</button>
            <button
              onClick={() => setOff(0)}
              style={{
                padding: '5px 12px',
                borderRadius: 7,
                border: `1px solid ${T.accent}`,
                background: T.accentSoft,
                color: T.accent,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                marginLeft: 6,
              }}
            >
              Hôm nay
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 2,
              background: T.surface,
              borderRadius: 7,
              padding: 2,
              border: `1px solid ${T.border}`,
            }}
          >
            {([
              { id: 'week' as const, l: 'Tuần' },
              { id: 'month' as const, l: 'Tháng' },
            ]).map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id)
                  setOff(0)
                }}
                style={{
                  padding: '5px 14px',
                  borderRadius: 5,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  background: mode === m.id ? T.accent : 'transparent',
                  color: mode === m.id ? '#fff' : T.textSec,
                }}
              >
                {m.l}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {mode === 'week' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
          {wk.map((day, i) => {
            const k = fmtDate(day)
            const dt = byDate[k] ?? []
            const isT = sameDay(day, TODAY)
            const isWe = i >= 5
            return (
              <div
                key={k}
                style={{
                  background: isT ? T.cardAlt : T.card,
                  border: `1px solid ${isT ? 'rgba(124,106,239,.35)' : T.border}`,
                  borderRadius: 10,
                  minHeight: 280,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    padding: '10px 10px 6px',
                    borderBottom: `1px solid ${T.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 10, color: isWe ? T.pink : T.textMuted, fontWeight: 600 }}>{DAY_NAMES[i]}</span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: isT ? T.accent : T.text,
                        background: isT ? T.accentSoft : 'transparent',
                        width: isT ? 28 : 'auto',
                        height: isT ? 28 : 'auto',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  {dt.length > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.textMuted,
                        background: 'rgba(255,255,255,.06)',
                        padding: '1px 5px',
                        borderRadius: 3,
                      }}
                    >
                      {dt.length}
                    </span>
                  )}
                </div>

                <div style={{ padding: 6, flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
                  {dt
                    .slice()
                    .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority))
                    .map((t) => (
                      <div
                        key={t.id}
                        style={{
                          padding: '5px 7px',
                          borderRadius: 6,
                          background: t.isOverdue ? T.dangerSoft : 'rgba(255,255,255,.03)',
                          border: t.isOverdue ? '1px solid rgba(248,113,113,.15)' : '1px solid transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                          <span style={{ color: stOf(t.status).c, fontSize: 9 }}>{stOf(t.status).i}</span>
                          <span style={{ fontSize: 9, color: T.textMuted, fontWeight: 600 }}>{t.id}</span>
                          {t.isOverdue && (
                            <span style={{ fontSize: 8, color: T.danger, fontWeight: 700, marginLeft: 'auto' }}>OVERDUE</span>
                          )}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: T.text, lineHeight: 1.3, marginBottom: 3 }}>{t.title}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Avatar name={t.assignee?.name ?? '?'} initials={t.assignee?.av ?? '?'} size={16} />
                            <span style={{ fontSize: 9, color: T.textMuted }}>{(t.assignee?.name ?? '').split(' ').pop()}</span>
                          </div>
                          <Badge color={prioC[t.priority]?.c ?? T.textMuted} bg={prioC[t.priority]?.bg ?? T.surface} small>
                            {t.priority?.[0]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {mode === 'month' && (
        <Card style={{ padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {DAY_NAMES.map((d, i) => (
              <div
                key={d}
                style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: i >= 5 ? T.pink : T.textMuted, padding: '5px 0' }}
              >
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {moDates.map((day, idx) => {
              const k = fmtDate(day)
              const dt = byDate[k] ?? []
              const isT = sameDay(day, TODAY)
              const isCur = day.getMonth() === mo
              const overCount = dt.filter((t) => t.isOverdue).length
              return (
                <div
                  key={idx}
                  style={{
                    minHeight: 72,
                    padding: 5,
                    borderRadius: 6,
                    background: isT ? T.cardAlt : isCur ? T.card : 'rgba(255,255,255,.01)',
                    border: `1px solid ${isT ? 'rgba(124,106,239,.3)' : isCur ? T.border : 'transparent'}`,
                    opacity: isCur ? 1 : 0.3,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isT ? 800 : 600,
                        color: isT ? T.accent : T.text,
                        background: isT ? T.accentSoft : 'transparent',
                        width: isT ? 22 : 'auto',
                        height: isT ? 22 : 'auto',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {day.getDate()}
                    </span>
                    {overCount > 0 && <span style={{ fontSize: 8, color: T.danger, fontWeight: 800 }}>⚠{overCount}</span>}
                  </div>
                  {dt.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '1px 4px',
                        borderRadius: 3,
                        background: t.isOverdue ? 'rgba(248,113,113,.1)' : stOf(t.status).bg,
                        fontSize: 9,
                        color: t.isOverdue ? T.danger : stOf(t.status).c,
                        marginBottom: 1,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <span style={{ fontSize: 7 }}>{stOf(t.status).i}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                    </div>
                  ))}
                  {dt.length > 2 && <span style={{ fontSize: 9, color: T.textMuted }}>+{dt.length - 2}</span>}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
