/** Calendar tab — Week/Month grid. Spec: docs/features/calendar.md */
import { useMemo, useState, useRef, useEffect } from 'react'
import _ from 'lodash'
import { useFilterStore, useTaskStore } from '@/stores'
import { applyFilters } from '@/lib/filter'
import { fmtDate, sameDay } from '@/lib/utils'
import { prioC, PRIORITIES, stOf } from '@/lib/constants'
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
  const setSelectedTask = useTaskStore((s) => s.setSelectedTask)
  const filters = useFilterStore((s) => s.filters)
  const search = useFilterStore((s) => s.search)
  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [off, setOff] = useState(0)
  const [showNoDeadline, setShowNoDeadline] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showNoDeadline) return
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowNoDeadline(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNoDeadline])

  const base = new Date(TODAY)
  if (mode === 'week') base.setDate(base.getDate() + off * 7)
  else base.setMonth(base.getMonth() + off)

  const ft = useMemo(() => applyFilters(tasks, filters, search), [tasks, filters, search])
  const byDate = useMemo(() => _.groupBy(ft, 'deadline'), [ft])
  const noDeadlineTasks = byDate[''] ?? []
  const noDeadlineCount = noDeadlineTasks.length

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
    borderRadius: 8,
    border: `1px solid var(--app-border)`,
    background: 'var(--app-surface)',
    color: 'var(--app-text)',
    cursor: 'pointer' as const,
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  }

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card hoverable={false} style={{ padding: '16px 24px', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-outline" onClick={() => setOff((o) => o - 1)} style={navBtn}>‹</button>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--app-text)', minWidth: 200, textAlign: 'center' }}>{headerLabel}</span>
            <button className="btn-outline" onClick={() => setOff((o) => o + 1)} style={navBtn}>›</button>
            <button
              onClick={() => setOff(0)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: `1px solid var(--app-accent)`,
                background: 'var(--app-accent-glow)',
                color: 'var(--app-accent)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                marginLeft: 8,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'none' }}
            >
              Hôm nay
            </button>
          </div>

          <div style={{ marginRight: 'auto', marginLeft: 12, position: 'relative' }} ref={popoverRef}>
            {noDeadlineCount > 0 && (
              <button
                onClick={() => setShowNoDeadline(!showNoDeadline)}
                title="Bấm để xem danh sách"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: showNoDeadline ? '#fff' : 'var(--app-warn, #FBBF24)',
                  background: showNoDeadline ? 'var(--app-warn, #FBBF24)' : 'rgba(251,191,36,0.1)',
                  border: `1px solid var(--app-warn, #FBBF24)`,
                  padding: '6px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                ⚠ {noDeadlineCount} task không có deadline {showNoDeadline ? '▴' : '▾'}
              </button>
            )}

            {showNoDeadline && (
              <div
                className="animate-fade-in"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: 320,
                  maxHeight: 400,
                  overflowY: 'auto',
                  background: 'var(--app-card)',
                  border: '1px solid var(--app-border)',
                  borderRadius: 12,
                  padding: 12,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  zIndex: 20
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text)', marginBottom: 4, paddingBottom: 8, borderBottom: '1px solid var(--app-border)' }}>
                  Chưa có Deadline
                </div>
                {noDeadlineTasks.slice().sort((a, b) => PRIORITIES.indexOf(a.priority as any) - PRIORITIES.indexOf(b.priority as any)).map(t => (
                  <div key={t.id} className="card-hover" onClick={() => setSelectedTask(t.id)} style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--app-border)', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-muted)' }}>{t.id}</span>
                      <Badge color={prioC[t.priority]?.c ?? 'var(--app-text-muted)'} bg={prioC[t.priority]?.bg ?? 'var(--app-surface)'} small>{t.priority}</Badge>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text)' }}>{t.title}</div>
                    {t.description && (
                      <div style={{ fontSize: 11, color: 'var(--app-text-sec)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
                        {t.description}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Avatar name={t.assignee?.name ?? '?'} initials={t.assignee?.av ?? '?'} size={18} />
                        <span style={{ fontSize: 11, color: 'var(--app-text-sec)', fontWeight: 500 }}>{(t.assignee?.name ?? '').split(' ').pop()}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {t.time && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-muted)', background: 'var(--app-surface)', padding: '2px 6px', borderRadius: 4 }}>{t.time}</span>}
                        <span style={{ fontSize: 11, color: stOf(t.status).c, fontWeight: 600 }}>{t.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 4,
              background: 'var(--app-surface)',
              borderRadius: 8,
              padding: 4,
              border: `1px solid var(--app-border)`,
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
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  background: mode === m.id ? 'var(--app-gradient-primary)' : 'transparent',
                  color: mode === m.id ? '#fff' : 'var(--app-text-sec)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: mode === m.id ? '0 4px 12px rgba(124, 106, 239, 0.3)' : 'none',
                }}
              >
                {m.l}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {mode === 'week' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10 }}>
          {wk.map((day, i) => {
            const k = fmtDate(day)
            const dt = byDate[k] ?? []
            const isT = sameDay(day, TODAY)
            const isWe = i >= 5
            return (
              <div
                key={k}
                className="glass-panel"
                style={{
                  background: isT ? 'var(--app-card-alt)' : 'var(--app-card)',
                  border: `1px solid ${isT ? 'var(--app-accent)' : 'var(--app-border)'}`,
                  borderRadius: 12,
                  minHeight: 320,
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: isT ? '0 0 16px var(--app-accent-glow)' : undefined,
                }}
              >
                <div
                  style={{
                    padding: '12px 12px 8px',
                    borderBottom: `1px solid var(--app-border)`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: isWe ? 'var(--app-pink, #F472B6)' : 'var(--app-text-muted)', fontWeight: 700 }}>{DAY_NAMES[i]}</span>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: isT ? 'var(--app-accent)' : 'var(--app-text)',
                        background: isT ? 'var(--app-accent-glow)' : 'transparent',
                        width: isT ? 32 : 'auto',
                        height: isT ? 32 : 'auto',
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
                        fontSize: 11,
                        fontWeight: 800,
                        color: 'var(--app-text-muted)',
                        background: 'rgba(255,255,255,.06)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {dt.length}
                    </span>
                  )}
                </div>

                <div style={{ padding: 8, flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
                  {dt
                    .slice()
                    .sort((a, b) => PRIORITIES.indexOf(a.priority as any) - PRIORITIES.indexOf(b.priority as any))
                    .map((t) => (
                      <div
                        key={t.id}
                        className="card-hover"
                        onClick={() => setSelectedTask(t.id)}
                        style={{
                          padding: '8px',
                          borderRadius: 8,
                          background: t.isOverdue ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,.03)',
                          border: t.isOverdue ? '1px solid rgba(248,113,113,.2)' : '1px solid transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ color: stOf(t.status).c, fontSize: 11 }}>{stOf(t.status).i}</span>
                          <span style={{ fontSize: 10, color: 'var(--app-text-muted)', fontWeight: 700 }}>{t.id}</span>
                          {t.isOverdue && (
                            <span style={{ fontSize: 9, color: 'var(--app-danger, #F87171)', fontWeight: 800, marginLeft: 'auto' }}>OVERDUE</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--app-text)', lineHeight: 1.4, marginBottom: t.description ? 4 : 8 }}>{t.title}</div>
                        {t.description && (
                          <div style={{ fontSize: 11, color: 'var(--app-text-sec)', marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                            {t.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Avatar name={t.assignee?.name ?? '?'} initials={t.assignee?.av ?? '?'} size={18} />
                            <span style={{ fontSize: 10, color: 'var(--app-text-muted)', fontWeight: 500 }}>{(t.assignee?.name ?? '').split(' ').pop()}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Badge color={prioC[t.priority]?.c ?? 'var(--app-text-muted)'} bg={prioC[t.priority]?.bg ?? 'var(--app-surface)'} small>
                              {t.priority?.[0]}
                            </Badge>
                            {t.time && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--app-text-sec)', fontSize: 10, fontWeight: 700 }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                {t.time}
                              </div>
                            )}
                          </div>
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
        <Card hoverable={false} style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 8 }}>
            {DAY_NAMES.map((d, i) => (
              <div
                key={d}
                style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: i >= 5 ? 'var(--app-pink, #F472B6)' : 'var(--app-text-muted)', padding: '8px 0' }}
              >
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
            {moDates.map((day, idx) => {
              const k = fmtDate(day)
              const dt = byDate[k] ?? []
              const isT = sameDay(day, TODAY)
              const isCur = day.getMonth() === mo
              const overCount = dt.filter((t) => t.isOverdue).length
              return (
                <div
                  key={idx}
                  className={isCur ? "card-hover" : ""}
                  style={{
                    minHeight: 90,
                    padding: 8,
                    borderRadius: 10,
                    background: isT ? 'var(--app-card-alt)' : isCur ? 'var(--app-card)' : 'rgba(255,255,255,.01)',
                    border: `1px solid ${isT ? 'var(--app-accent)' : isCur ? 'var(--app-border)' : 'transparent'}`,
                    opacity: isCur ? 1 : 0.4,
                    boxShadow: isT ? '0 0 12px var(--app-accent-glow)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isT ? 800 : 700,
                        color: isT ? 'var(--app-accent)' : 'var(--app-text)',
                        background: isT ? 'var(--app-accent-glow)' : 'transparent',
                        width: isT ? 26 : 'auto',
                        height: isT ? 26 : 'auto',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {day.getDate()}
                    </span>
                    {overCount > 0 && <span style={{ fontSize: 10, color: 'var(--app-danger, #F87171)', fontWeight: 800 }}>⚠{overCount}</span>}
                  </div>
                  {dt.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: t.isOverdue ? 'rgba(248,113,113,.1)' : stOf(t.status).bg,
                        fontSize: 10,
                        fontWeight: 600,
                        color: t.isOverdue ? 'var(--app-danger, #F87171)' : stOf(t.status).c,
                        marginBottom: 2,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 9 }}>{stOf(t.status).i}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                    </div>
                  ))}
                  {dt.length > 3 && <span style={{ fontSize: 10, color: 'var(--app-text-muted)', fontWeight: 600, paddingLeft: 4 }}>+{dt.length - 3} nữa</span>}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
