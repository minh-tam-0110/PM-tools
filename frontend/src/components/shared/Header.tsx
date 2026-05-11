import { useEffect, useState } from 'react'
import { bridgeApi, type BgWorkerStatus } from '@/lib/api'
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
    src === 'iframe' ? 'var(--app-ok, #34D399)'
    : src === 'be' ? 'var(--app-ok, #34D399)'
    : src === 'manual' ? 'var(--app-info, #60A5FA)'
    : 'var(--app-warn, #FBBF24)'
  const label =
    src === 'iframe' ? 'Live Connected'
    : src === 'be' ? 'BE Scraped'
    : src === 'manual' ? 'Manual Import'
    : 'No Data'

  return (
    <header
      className="glass-panel"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '16px clamp(16px, 3vw, 40px)',
        borderBottom: '1px solid var(--app-glass-border)',
        marginBottom: 24,
      }}
    >
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: dotColor,
                  boxShadow: `0 0 10px ${dotColor}`,
                  animation: scraping ? 'pulse-glow 1.5s infinite' : 'none',
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: src === 'iframe' || src === 'be' ? 'var(--app-ok, #34D399)' : 'var(--app-text-sec)',
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </span>
              {lastSync && (
                <span style={{ fontSize: 11, color: 'var(--app-text-muted)' }}>
                  • {lastSync.toLocaleTimeString('vi-VN')}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--app-text)', letterSpacing: '-0.5px' }}>
              Project Task Progress
            </h1>
            <p style={{ fontSize: 13, color: 'var(--app-text-sec)', marginTop: 2 }}>
              Wolffun Game — Review 360° Integration
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Tìm task, người..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-premium"
                style={{
                  padding: '8px 12px 8px 34px',
                  borderRadius: 10,
                  fontSize: 13,
                  width: 220,
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--app-text-muted)',
                  fontSize: 14,
                }}
              >
                ⌕
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <button
                onClick={onRefresh}
                disabled={scraping}
                title="Re-scrape Review 360°"
                className={scraping ? '' : 'btn-outline'}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: scraping ? 'wait' : 'pointer',
                  background: scraping ? 'rgba(96,165,250,0.1)' : undefined,
                  border: scraping ? '1px solid rgba(96,165,250,0.3)' : undefined,
                  color: scraping ? 'var(--app-info, #60A5FA)' : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {scraping ? '⟳ Đang scrape...' : '↻ Refresh'}
              </button>
              {!scraping && countdown !== null && (
                <span style={{ fontSize: 11, color: 'var(--app-text-muted)', whiteSpace: 'nowrap', position: 'absolute', transform: 'translateY(36px)' }}>
                  next: {fmtCountdown(countdown)}
                </span>
              )}
            </div>
            <button
              onClick={onConnect}
              className="btn-outline"
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔗 Kết nối
            </button>
            <button
              onClick={onCreate}
              className="btn-primary"
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Tạo Task
            </button>
          </div>
        </div>

        <TabBar value={view} onChange={onView} />
      </div>
    </header>
  )
}
