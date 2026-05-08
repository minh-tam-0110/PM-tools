/** Typed fetch wrappers. Mọi gọi BE đi qua đây. */
import type { Task } from './types'

const BASE = '/api'

export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API ${status}: ${body}`)
  }
}

async function http<T>(method: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(BASE + url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new ApiError(r.status, await r.text())
  if (r.status === 204) return undefined as T
  return (await r.json()) as T
}

export const dashboardApi = {
  health: () => http<{ status: string }>('GET', '/dashboard/health'),
}

export const tasksApi = {
  list: () => http<Task[]>('GET', '/tasks'),
  create: (t: Partial<Task>) => http<Task>('POST', '/tasks', t),
  update: (id: string, patch: Partial<Task>) => http<Task>('PUT', `/tasks/${id}`, patch),
  remove: (id: string) => http<void>('DELETE', `/tasks/${id}`),
}

export type BridgeStatus =
  | { exists: false }
  | { exists: true; path?: string; cookies?: number; origins?: number; bytes?: number; error?: string }

export type BridgeScrapeResult = {
  url: string
  title: string
  extractedAt: string
  count: number
  tasks: unknown[]
  hash?: string
}

export const bridgeApi = {
  status: () => http<BridgeStatus>('GET', '/bridge/status'),
  login: () => http<{ ok: boolean; saved_to: string }>('POST', '/bridge/login'),
  scrape: () => http<BridgeScrapeResult>('POST', '/bridge/scrape'),
  /** GET cached last scrape. Trả null nếu BE chưa có (HTTP 204). */
  last: async (): Promise<BridgeScrapeResult | null> => {
    const r = await fetch(BASE + '/bridge/last')
    if (r.status === 204) return null
    if (!r.ok) throw new ApiError(r.status, await r.text())
    return (await r.json()) as BridgeScrapeResult
  },
  dumpHtml: () => http<{ url: string; bytes: number; saved_to: string }>('POST', '/bridge/dump-html'),
}
