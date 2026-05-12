/** Connection modal — BE bridge / Auto iframe / Manual JSON. Spec: docs/features/connection.md */
import { useEffect, useState } from 'react'
import { REVIEW_360_URL } from '@/lib/constants'
import { useConnStore } from '@/stores'
import { bridgeApi, type BridgeStatus, ApiError } from '@/lib/api'
import { normalizeImported } from '@/lib/normalize'
import { useTaskStore } from '@/stores'
import type { ImportResult } from '@/hooks/useDataBridge'

type Props = {
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  onImportJSON: (str: string) => ImportResult
  onClose: () => void
}

type Tab = 'be' | 'iframe' | 'manual'

export function ConnectionPanel({ iframeRef, onImportJSON, onClose }: Props) {
  const iframeSt = useConnStore((s) => s.iframeSt)
  const setIframeSt = useConnStore((s) => s.setIframeSt)
  const [tab, setTab] = useState<Tab>('be')
  const [json, setJson] = useState('')
  const [res, setRes] = useState<ImportResult | null>(null)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel animate-scale-in"
        style={{
          background: 'var(--app-card)',
          border: `1px solid var(--app-border)`,
          borderRadius: 20,
          width: 640,
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 32,
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--app-text)' }}>Kết nối Review 360°</div>
            <div style={{ fontSize: 13, color: 'var(--app-text-sec)', marginTop: 4, fontWeight: 500 }}>Cào data về dashboard</div>
          </div>
          <button className="btn-outline" onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={tabBar}>
          {([
            { id: 'be' as const, l: '🤖 BE Bridge' },
            { id: 'iframe' as const, l: '🔗 Iframe' },
            { id: 'manual' as const, l: '📋 Manual JSON' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                ...tabBtn,
                background: tab === t.id ? 'var(--app-gradient-primary)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--app-text-sec)',
                boxShadow: tab === t.id ? '0 4px 12px rgba(124, 106, 239, 0.3)' : 'none',
              }}
            >
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'be' && <BeBridgeTab onClose={onClose} />}

        {tab === 'iframe' && (
          <div className="animate-fade-in">
            <div style={infoBox}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--app-text)', marginBottom: 8 }}>Cách hoạt động:</div>
              <div style={{ fontSize: 13, color: 'var(--app-text-sec)', lineHeight: 1.7 }}>
                Iframe load trực tiếp <code>wolffun-review.web.app</code> + lắng nghe <code>postMessage</code>.
                <br />
                <span style={{ color: 'var(--app-warn, #FBBF24)', fontSize: 12, display: 'block', marginTop: 10, fontWeight: 600 }}>
                  ⚠ Firebase thường block iframe (X-Frame-Options). Nếu lỗi, dùng tab "BE Bridge" hoặc "Manual JSON".
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: iframeStColor(iframeSt), boxShadow: `0 0 8px ${iframeStColor(iframeSt)}` }} />
              <span style={{ fontSize: 14, color: 'var(--app-text)', fontWeight: 700 }}>{iframeStLabel(iframeSt)}</span>
              <button className="btn-primary" onClick={() => setIframeSt('loading')} style={{...primaryBtn, marginLeft: 'auto'}}>
                {iframeSt === 'connected' ? 'Reconnect' : 'Kết nối'}
              </button>
            </div>

            {iframeSt === 'loading' && (
              <div style={{ marginTop: 20, borderRadius: 12, overflow: 'hidden', border: `1px solid var(--app-border)` }}>
                <iframe
                  ref={iframeRef}
                  src={REVIEW_360_URL}
                  style={{ width: '100%', height: 400, border: 'none' }}
                  title="Review 360°"
                />
              </div>
            )}
          </div>
        )}

        {tab === 'manual' && (
          <div className="animate-fade-in">
            <div style={{ fontSize: 13, color: 'var(--app-text-sec)', marginBottom: 16, lineHeight: 1.6 }}>
              Paste mảng JSON từ Review 360°. Tool tự map các field phổ biến: id, title/name/summary, assignee, status, priority,
              deadline/dueDate, sprint, sp/storyPoints...
            </div>
            <textarea
              className="input-premium"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder='[{"id":"TASK-001","title":"...","assignee":"...","status":"To Do","priority":"High","module":"...","deadline":"YYYY-MM-DD","sprint":"...","sp":3}]'
              style={textarea}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button className="btn-primary" onClick={() => setRes(onImportJSON(json))} style={{...successBtn, background: 'var(--app-ok, #34D399)'}}>Import</button>
            </div>
            {res && (
              <div
                className="animate-fade-in"
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  background: res.ok ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                  color: res.ok ? 'var(--app-ok, #34D399)' : 'var(--app-danger, #F87171)',
                  border: `1px solid ${res.ok ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`
                }}
              >
                {res.ok ? `✓ Đã import ${res.count} tasks!` : `✕ Lỗi: ${res.err}`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── BE Bridge tab ───────────────────────────────────────────────────────────

function BeBridgeTab({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<BridgeStatus | null>(null)
  const [busy, setBusy] = useState<null | 'login' | 'scrape' | 'dump'>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [fullDesc, setFullDesc] = useState(false)

  const refreshStatus = async () => {
    try {
      setStatus(await bridgeApi.status())
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e) })
    }
  }

  useEffect(() => {
    refreshStatus()
  }, [])

  const doLogin = async () => {
    setBusy('login')
    setMsg({ kind: 'ok', text: 'Chromium đang mở. Login Wolffun trong popup...' })
    try {
      await bridgeApi.login()
      setMsg({ kind: 'ok', text: '✓ Đã lưu session.' })
      await refreshStatus()
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e) })
    } finally {
      setBusy(null)
    }
  }

  const doScrape = async () => {
    setBusy('scrape')
    setMsg({ kind: 'ok', text: 'Đang scrape /my-work...' })
    try {
      const r = await bridgeApi.scrape({ fullDesc })
      const norm = normalizeImported({ tasks: r.tasks })
      useTaskStore.getState().setAll(norm)
      useConnStore.getState().setSrc('be')
      useConnStore.getState().touchSync()
      setMsg({ kind: 'ok', text: `✓ Đã import ${norm.tasks.length} tasks (raw ${r.count}).` })
      setTimeout(onClose, 800)
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e) })
    } finally {
      setBusy(null)
    }
  }

  const doDump = async () => {
    setBusy('dump')
    setMsg({ kind: 'ok', text: 'Đang dump DOM...' })
    try {
      const r = await bridgeApi.dumpHtml()
      setMsg({ kind: 'ok', text: `✓ DOM đã lưu: ${r.saved_to} (${r.bytes} bytes)` })
    } catch (e) {
      setMsg({ kind: 'err', text: errMsg(e) })
    } finally {
      setBusy(null)
    }
  }

  const hasState = status?.exists === true
  const cookies = status?.exists ? status.cookies ?? 0 : 0

  return (
    <div className="animate-fade-in">
      <div style={infoBox}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--app-text)', marginBottom: 8 }}>Cách hoạt động:</div>
        <div style={{ fontSize: 13, color: 'var(--app-text-sec)', lineHeight: 1.7 }}>
          1. <b>Login</b> — backend mở Chromium headed, bạn login Wolffun trong popup.
          <br />
          2. Cookie/session lưu lại ở <code style={{background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: 4}}>backend/data/review360_state.json</code>.
          <br />
          3. <b>Scrape</b> — backend chạy headless, đọc DOM <code style={{background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: 4}}>/my-work</code>, return tasks.
          <br />
          <span style={{ color: 'var(--app-warn, #FBBF24)', fontSize: 12, display: 'block', marginTop: 10, fontWeight: 600 }}>
            ⚠ Cần chạy backend (<code>python run.py --dev</code>) và cài Playwright (<code>playwright install chromium</code>).
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: hasState ? 'var(--app-ok, #34D399)' : 'var(--app-text-muted)', boxShadow: `0 0 8px ${hasState ? 'var(--app-ok, #34D399)' : 'transparent'}` }} />
        <span style={{ fontSize: 14, color: 'var(--app-text)', fontWeight: 700 }}>
          {hasState ? `Đã lưu session (${cookies} cookies)` : 'Chưa login'}
        </span>
        <button className="btn-outline" onClick={refreshStatus} style={{ ...ghostBtn, marginLeft: 'auto' }}>↻ Refresh</button>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer', fontSize: 13, color: 'var(--app-text-sec)' }}>
        <input type="checkbox" checked={fullDesc} onChange={e => setFullDesc(e.target.checked)} style={{ accentColor: 'var(--app-ok, #34D399)', width: 15, height: 15 }} />
        Fetch full descriptions <span style={{ opacity: 0.6 }}>(chậm hơn ~2 phút)</span>
      </label>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={doLogin} disabled={!!busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1, background: 'var(--app-info, #60A5FA)' }}>
          {busy === 'login' ? 'Đang login...' : '🔐 Login'}
        </button>
        <button className="btn-primary" onClick={doScrape} disabled={!hasState || !!busy} style={{ ...successBtn, opacity: !hasState || busy ? 0.6 : 1, background: 'var(--app-ok, #34D399)' }}>
          {busy === 'scrape' ? 'Scraping...' : '📥 Scrape /my-work'}
        </button>
        <button className="btn-outline" onClick={doDump} disabled={!hasState || !!busy} style={{ ...ghostBtn, opacity: !hasState || busy ? 0.6 : 1 }}>
          {busy === 'dump' ? '...' : '🛠 Dump DOM'}
        </button>
      </div>

      {msg && (
        <div
          className="animate-fade-in"
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            background: msg.kind === 'ok' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            color: msg.kind === 'ok' ? 'var(--app-ok, #34D399)' : 'var(--app-danger, #F87171)',
            border: `1px solid ${msg.kind === 'ok' ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`
          }}
        >
          {msg.text}
        </div>
      )}
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────────────

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return `API ${e.status}: ${e.body.slice(0, 200)}`
  return e instanceof Error ? e.message : String(e)
}

function iframeStColor(s: string): string {
  return s === 'connected' ? 'var(--app-ok, #34D399)' : s === 'loading' ? 'var(--app-warn, #FBBF24)' : s === 'error' ? 'var(--app-danger, #F87171)' : 'var(--app-text-muted)'
}

function iframeStLabel(s: string): string {
  return s === 'connected' ? 'Đã kết nối' : s === 'loading' ? 'Đang kết nối...' : s === 'error' ? 'Lỗi' : 'Chưa kết nối'
}

// ── styles ─────────────────────────────────────────────────────────────────

const closeBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: `1px solid var(--app-border)`,
  background: 'var(--app-surface)',
  color: 'var(--app-text)',
  cursor: 'pointer',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const tabBar: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginBottom: 24,
  background: 'var(--app-surface)',
  borderRadius: 10,
  padding: 4,
  border: '1px solid var(--app-border)'
}

const tabBtn: React.CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 700,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
}

const infoBox: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--app-border)',
  borderRadius: 12,
  padding: 16,
  marginBottom: 20,
}

const primaryBtn: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--app-accent)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s',
}

const successBtn: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--app-ok, #34D399)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s',
}

const ghostBtn: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 8,
  border: `1px solid var(--app-border)`,
  background: 'var(--app-surface)',
  color: 'var(--app-text-sec)',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s',
}

const textarea: React.CSSProperties = {
  width: '100%',
  height: 200,
  background: 'var(--app-bg)',
  color: 'var(--app-text)',
  border: `1px solid var(--app-border)`,
  borderRadius: 12,
  padding: 16,
  fontSize: 13,
  fontFamily: 'monospace',
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
}
