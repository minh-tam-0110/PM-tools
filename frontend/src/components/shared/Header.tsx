import { useEffect, useState } from 'react'
import { bridgeApi, type BgWorkerStatus } from '@/lib/api'
import { T } from '@/lib/constants'
import { useConnStore, useFilterStore } from '@/stores'
import { TabBar, type TabId } from '@/components/layout/TabBar'

type Props = {
  view: TabId
  onView: (v: TabId) => void
  onRefresh: () => void
  onConnect: () => void
  onCreate: () => void
}

export function Header({ view, onView, onRefresh, onConnect, onCreate }: Props) {
  const src = useConnStore((s) => s.src)
  const iframeSt = useConnStore((s) => s.iframeSt)
  const lastSync = useConnStore((s) => s.lastSync)
  const search = useFilterStore((s) => s.search)
  const setSearch = useFilterStore((s) => s.setSearch)
  const busy = iframeSt === 'loading'

  const [bgSt, setBgSt] = useState<BgWorkerStatus | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Poll bg-worker status every 10s
  useEffect(() => {
    const poll = () => bridgeApi.bgStatus().then(setBgSt).catch(() => {})
    poll()
    const id = setInterval(poll, 10_000)
    return () => clearInterval(id)
  }, [])

  // Tick countdown every 1s from last_run + interval
  useEffect(() => {
    if (!bgSt?.last_run || !bgSt.interval) { setCountdown(null); return }
    const tick = () => {
      const next = new Date(bgSt.last_run!).getTime() + bgSt.interval * 1000
      setCountdown(Math.max(0, Math.round((next - Date.now()) / 1000)))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [bgSt?.last_run, bgSt?.interval])

  const scraping = busy || (bgSt?.in_progress ?? false)

  const fmtCountdown = (s: number) => {
    if (s <= 0) return 'đang chờ...'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }

  const dotColor =
    src === 'iframe' ? T.ok
    : src === 'be' ? T.ok
    : src === 'manual' ? T.info
    : T.warn
  const label =
    src === 'iframe' ? 'Live Connected'
    : src === 'be' ? 'BE Scraped'
    : src === 'manual' ? 'Manual Import'
    : 'No Data'

  return (
    <div
      style={{
        background: `linear-gradient(135deg,${T.surface},${T.card})`,
        borderBottom: `1px solid ${T.border}`,
        padding: '20px clamp(16px, 2vw, 40px) 16px',
        marginBottom: 20,
      }}
    >
      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: dotColor,
                  boxShadow: `0 0 8px ${dotColor}`,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: src === 'iframe' || src === 'be' ? T.ok : T.textSec,
                  fontWeight: 600,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </span>
              {lastSync && (
                <span style={{ fontSize: 10, color: T.textMuted }}>
                  • {lastSync.toLocaleTimeString('vi-VN')}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>
              Project Task Progress
            </h1>
            <p style={{ fontSize: 12, color: T.textSec, marginTop: 2 }}>
              Wolffun Game — Review 360° Integration
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Tìm task, người..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '7px 10px 7px 30px',
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.bg,
                  color: T.text,
                  fontSize: 12,
                  width: 180,
                  outline: 'none',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 9,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: T.textMuted,
                  fontSize: 13,
                }}
              >
                ⌕
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                {scraping && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: -3,
                      borderRadius: 11,
                      border: `2px solid transparent`,
                      borderTopColor: T.info,
                      borderRightColor: T.info,
                      animation: 'spin-ring 0.75s linear infinite',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <button
                  onClick={onRefresh}
                  disabled={scraping}
                  title="Re-scrape Review 360°"
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: `1px solid ${scraping ? T.info : T.border}`,
                    background: scraping ? 'rgba(96,165,250,0.08)' : T.surface,
                    color: scraping ? T.info : T.textSec,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: scraping ? 'not-allowed' : 'pointer',
                  }}
                >
                  {scraping ? '⟳ Scraping...' : '↻ Refresh'}
                </button>
              </div>
              {!scraping && countdown !== null && (
                <span style={{ fontSize: 10, color: T.textMuted, whiteSpace: 'nowrap' }}>
                  next: {fmtCountdown(countdown)}
                </span>
              )}
              {scraping && (
                <span style={{ fontSize: 10, color: T.info, whiteSpace: 'nowrap' }}>
                  đang scrape...
                </span>
              )}
            </div>
            <button
              onClick={onConnect}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: `1px solid ${T.accent}`,
                background: T.accentSoft,
                color: T.accent,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔗 Kết nối
            </button>
            <button
              onClick={onCreate}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: 'none',
                background: T.accent,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✚ Tạo Task
            </button>
          </div>
        </div>

        <TabBar value={view} onChange={onView} />
      </div>
    </div>
  )
}
