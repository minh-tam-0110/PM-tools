/** Bridge giữa iframe Review 360° + manual JSON ↔ taskStore. */
import { useCallback, useEffect, useRef } from 'react'
import { ALLOWED_ORIGINS, REVIEW_360_URL } from '@/lib/constants'
import { normalizeImported } from '@/lib/normalize'
import { useConnStore, useTaskStore } from '@/stores'
import { bridgeApi } from '@/lib/api'

export type ImportResult = { ok: true; count: number } | { ok: false; err: string }
export type RefreshResult = { ok: true; count: number } | { ok: false; err: string }

export function useDataBridge() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const src = useConnStore((s) => s.src)

  // Register postMessage handler một lần
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!ALLOWED_ORIGINS.includes(e.origin as (typeof ALLOWED_ORIGINS)[number])) return
      try {
        const m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (!m?.type) return
        if (m.type === 'WOLFFUN_DATA') {
          const n = normalizeImported(m)
          useTaskStore.getState().setAll(n)
          useConnStore.getState().setSrc('iframe')
          useConnStore.getState().setIframeSt('connected')
          useConnStore.getState().touchSync()
        } else if (m.type === 'WOLFFUN_AUTH_OK') {
          useConnStore.getState().setIframeSt('connected')
        } else if (m.type === 'WOLFFUN_ERROR') {
          useConnStore.getState().setIframeSt('error')
        }
      } catch {
        /* swallow malformed */
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Auto-load cached scrape khi mount — reload trang không mất data
  useEffect(() => {
    let cancelled = false
    bridgeApi
      .last()
      .then((r) => {
        if (cancelled || !r) return
        // Chỉ load nếu store rỗng — tránh ghi đè data người dùng vừa import/scrape
        if (useTaskStore.getState().tasks.length > 0) return
        const norm = normalizeImported({ tasks: r.tasks, projects: r.projects, activeSprintsMap: r.activeSprintsMap })
        useTaskStore.getState().setAll(norm)
        useConnStore.getState().setSrc('be')
        if (r.hash) useConnStore.getState().setHash(r.hash)
        if (r.extractedAt) useConnStore.getState().touchSync(new Date(r.extractedAt))
      })
      .catch(() => {
        /* BE không chạy / chưa có cache → ignore */
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Poll bg-worker status: realtime sync khi background scrape xong.
  // Khi `last_run` advance → update lastSync + pull cached scrape mới (skip nếu hash unchanged).
  useEffect(() => {
    let cancelled = false
    let prevLastRun: string | null = null

    const poll = async () => {
      try {
        const st = await bridgeApi.bgStatus()
        if (cancelled) return
        useConnStore.getState().setBgSt(st)
        if (!st.last_run || st.last_run === prevLastRun) return
        prevLastRun = st.last_run
        // Bg-worker chỉ quản BE source. Nếu user đang dùng iframe/manual → không override.
        const currentSrc = useConnStore.getState().src
        if (currentSrc === 'iframe' || currentSrc === 'manual') return
        // last_run advanced → sync timestamp + fetch new cache
        useConnStore.getState().touchSync(new Date(st.last_run))
        const r = await bridgeApi.last()
        if (cancelled || !r) return
        const prevHash = useConnStore.getState().lastHash
        if (r.hash && prevHash === r.hash) return // data không đổi — skip re-render
        const norm = normalizeImported({ tasks: r.tasks, projects: r.projects, activeSprintsMap: r.activeSprintsMap })
        useTaskStore.getState().setAll(norm)
        if (currentSrc === 'none') useConnStore.getState().setSrc('be')
        if (r.hash) useConnStore.getState().setHash(r.hash)
      } catch {
        /* BE down / endpoint missing → ignore */
      }
    }

    poll()
    const id = window.setInterval(poll, 10_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const requestScrape = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ type: 'REQUEST_SCRAPE' }),
      REVIEW_360_URL,
    )
  }, [])

  // Auto-refresh 5 phút khi iframe connected
  useEffect(() => {
    if (src !== 'iframe') return
    timerRef.current = window.setInterval(() => requestScrape(), 5 * 60 * 1000)
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current)
    }
  }, [src, requestScrape])

  /** Trigger lại BE scrape (nếu đã login profile) hoặc iframe REQUEST_SCRAPE. */
  const refresh = useCallback(async (): Promise<RefreshResult> => {
    if (src === 'iframe') {
      requestScrape()
      useConnStore.getState().touchSync()
      return { ok: true, count: useTaskStore.getState().tasks.length }
    }
    // Default: BE scrape (works for src='be', 'none', or 'manual')
    useConnStore.getState().setIframeSt('loading')
    try {
      const r = await bridgeApi.scrape({ fullDesc: true })
      useConnStore.getState().setSrc('be')
      useConnStore.getState().setIframeSt('connected')
      useConnStore.getState().touchSync(r.extractedAt ? new Date(r.extractedAt) : undefined)
      // Skip re-normalize + re-render nếu hash không đổi
      const prevHash = useConnStore.getState().lastHash
      if (r.hash && prevHash === r.hash) {
        return { ok: true, count: useTaskStore.getState().tasks.length }
      }
      const norm = normalizeImported({ tasks: r.tasks, projects: r.projects, activeSprintsMap: r.activeSprintsMap })
      useTaskStore.getState().setAll(norm)
      if (r.hash) useConnStore.getState().setHash(r.hash)
      return { ok: true, count: norm.tasks.length }
    } catch (e) {
      useConnStore.getState().setIframeSt('error')
      return { ok: false, err: e instanceof Error ? e.message : String(e) }
    }
  }, [src, requestScrape])

  const importJSON = useCallback((str: string): ImportResult => {
    try {
      const d = JSON.parse(str)
      const n = normalizeImported(d)
      useTaskStore.getState().setAll(n)
      useConnStore.getState().setSrc('manual')
      useConnStore.getState().touchSync()
      return { ok: true, count: n.tasks.length }
    } catch (e) {
      return { ok: false, err: e instanceof Error ? e.message : String(e) }
    }
  }, [])

  return { iframeRef, refresh, requestScrape, importJSON }
}
