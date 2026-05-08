/** Connection modal — BE bridge / Auto iframe / Manual JSON. Spec: docs/features/connection.md */
import { useEffect, useState } from 'react'
import { REVIEW_360_URL, T } from '@/lib/constants'
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

const SAMPLE = JSON.stringify(
  [
    {
      id: 'TASK-001',
      title: 'Fix login bug',
      assignee: 'Minh Trí',
      status: 'In Progress',
      priority: 'High',
      module: 'Backend API',
      deadline: '2026-05-12',
      sprint: 'Sprint 21',
      sp: 5,
    },
    {
      id: 'TASK-002',
      title: 'Design new HUD',
      assignee: 'Đức Anh',
      status: 'To Do',
      priority: 'Medium',
      module: 'UI/HUD',
      deadline: '2026-05-15',
      sprint: 'Sprint 21',
      sp: 3,
    },
  ],
  null,
  2,
)

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
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: 640,
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 28,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>Kết nối Review 360°</div>
            <div style={{ fontSize: 12, color: T.textSec, marginTop: 2 }}>Cào data về dashboard</div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
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
                background: tab === t.id ? T.accent : 'transparent',
                color: tab === t.id ? '#fff' : T.textSec,
              }}
            >
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'be' && <BeBridgeTab onClose={onClose} />}

        {tab === 'iframe' && (
          <div>
            <div style={infoBox}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Cách hoạt động:</div>
              <div style={{ fontSize: 12, color: T.textSec, lineHeight: 1.7 }}>
                Iframe load trực tiếp <code>wolffun-review.web.app</code> + lắng nghe <code>postMessage</code>.
                <br />
                <span style={{ color: T.warn, fontSize: 11, display: 'block', marginTop: 8 }}>
                  ⚠ Firebase thường block iframe (X-Frame-Options). Nếu lỗi, dùng tab "BE Bridge" hoặc "Manual JSON".
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: iframeStColor(iframeSt) }} />
              <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{iframeStLabel(iframeSt)}</span>
              <button onClick={() => setIframeSt('loading')} style={primaryBtn}>
                {iframeSt === 'connected' ? 'Reconnect' : 'Kết nối'}
              </button>
            </div>

            {iframeSt === 'loading' && (
              <div style={{ marginTop: 16, borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.border}` }}>
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
          <div>
            <div style={{ fontSize: 12, color: T.textSec, marginBottom: 12, lineHeight: 1.6 }}>
              Paste mảng JSON từ Review 360°. Tool tự map các field phổ biến: id, title/name/summary, assignee, status, priority,
              deadline/dueDate, sprint, sp/storyPoints...
            </div>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              placeholder={SAMPLE}
              style={textarea}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <button onClick={() => setJson(SAMPLE)} style={ghostBtn}>Xem mẫu</button>
              <button onClick={() => setRes(onImportJSON(json))} style={successBtn}>Import</button>
            </div>
            {res && (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 8,
                  fontSize: 12,
                  background: res.ok ? T.okSoft : T.dangerSoft,
                  color: res.ok ? T.ok : T.danger,
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
      const r = await bridgeApi.scrape()
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
    <div>
      <div style={infoBox}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Cách hoạt động:</div>
        <div style={{ fontSize: 12, color: T.textSec, lineHeight: 1.7 }}>
          1. <b>Login</b> — backend mở Chromium headed, bạn login Wolffun trong popup.
          <br />
          2. Cookie/session lưu lại ở <code>backend/data/review360_state.json</code>.
          <br />
          3. <b>Scrape</b> — backend chạy headless, đọc DOM <code>/my-work</code>, return tasks.
          <br />
          <span style={{ color: T.warn, fontSize: 11, display: 'block', marginTop: 8 }}>
            ⚠ Cần chạy backend (<code>python run.py --dev</code>) và cài Playwright (<code>playwright install chromium</code>).
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: hasState ? T.ok : T.textMuted }} />
        <span style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>
          {hasState ? `Đã lưu session (${cookies} cookies)` : 'Chưa login'}
        </span>
        <button onClick={refreshStatus} style={{ ...ghostBtn, marginLeft: 'auto' }}>↻</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={doLogin} disabled={!!busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
          {busy === 'login' ? 'Đang login...' : '🔐 Login (mở Chromium)'}
        </button>
        <button onClick={doScrape} disabled={!hasState || !!busy} style={{ ...successBtn, opacity: !hasState || busy ? 0.6 : 1 }}>
          {busy === 'scrape' ? 'Scraping...' : '📥 Scrape /my-work'}
        </button>
        <button onClick={doDump} disabled={!hasState || !!busy} style={{ ...ghostBtn, opacity: !hasState || busy ? 0.6 : 1 }}>
          {busy === 'dump' ? '...' : '🛠 Dump DOM (debug)'}
        </button>
      </div>

      {msg && (
        <div
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 8,
            fontSize: 12,
            background: msg.kind === 'ok' ? T.okSoft : T.dangerSoft,
            color: msg.kind === 'ok' ? T.ok : T.danger,
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
  return s === 'connected' ? T.ok : s === 'loading' ? T.warn : s === 'error' ? T.danger : T.textMuted
}

function iframeStLabel(s: string): string {
  return s === 'connected' ? 'Đã kết nối' : s === 'loading' ? 'Đang kết nối...' : s === 'error' ? 'Lỗi' : 'Chưa kết nối'
}

// ── styles ─────────────────────────────────────────────────────────────────

const closeBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: T.surface,
  color: T.text,
  cursor: 'pointer',
  fontSize: 16,
}

const tabBar: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  marginBottom: 20,
  background: T.surface,
  borderRadius: 8,
  padding: 3,
}

const tabBtn: React.CSSProperties = {
  flex: 1,
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
}

const infoBox: React.CSSProperties = {
  background: T.surface,
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  background: T.accent,
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const successBtn: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  background: T.ok,
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const ghostBtn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: T.surface,
  color: T.textSec,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const textarea: React.CSSProperties = {
  width: '100%',
  height: 200,
  background: T.bg,
  color: T.text,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  padding: 12,
  fontSize: 12,
  fontFamily: 'monospace',
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
}
