/** Design tokens + domain constants — KHÔNG hardcode hex ở chỗ khác. */

export const T = {
  bg: '#0C0F17',
  surface: '#111827',
  card: '#151C2C',
  cardAlt: '#1A2236',
  border: '#1F2A40',
  borderLight: '#293550',
  text: '#E8ECF4',
  textSec: '#8B95AB',
  textMuted: '#566075',
  accent: '#7C6AEF',
  accentSoft: 'rgba(124,106,239,0.12)',
  ok: '#34D399',
  okSoft: 'rgba(52,211,153,0.1)',
  warn: '#FBBF24',
  warnSoft: 'rgba(251,191,36,0.1)',
  danger: '#F87171',
  dangerSoft: 'rgba(248,113,113,0.1)',
  info: '#60A5FA',
  infoSoft: 'rgba(96,165,250,0.1)',
  cyan: '#22D3EE',
  pink: '#F472B6',
  bgDim: 'rgba(255,255,255,0.06)',
  shadowLg: '0 8px 30px rgba(0,0,0,0.4)',
} as const

type StCfg = { c: string; bg: string; i: string }
export const stCfg: Record<string, StCfg> = {
  Backlog: { c: '#6B7280', bg: 'rgba(107,114,128,0.1)', i: '○' },
  'To Do': { c: '#A78BFA', bg: 'rgba(167,139,250,0.1)', i: '◔' },
  'In Progress': { c: '#60A5FA', bg: 'rgba(96,165,250,0.1)', i: '◐' },
  Review: { c: '#FBBF24', bg: 'rgba(251,191,36,0.1)', i: '◑' },
  Done: { c: '#34D399', bg: 'rgba(52,211,153,0.1)', i: '●' },
}

export const stOf = (s: string): StCfg => stCfg[s] ?? stCfg.Backlog

type PrioC = { c: string; bg: string }
export const prioC: Record<string, PrioC> = {
  Critical: { c: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  High: { c: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  Medium: { c: '#EAB308', bg: 'rgba(234,179,8,0.1)' },
  Low: { c: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
}

export const STATUSES = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'] as const
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const

/**
 * Origins được phép gửi postMessage cho data bridge. Validate trong useDataBridge.
 * Đọc từ `.env` (VITE_ALLOWED_ORIGINS, comma-separated). Build sẽ fail nếu thiếu.
 */
const _origins = import.meta.env.VITE_ALLOWED_ORIGINS
if (!_origins) throw new Error('Missing VITE_ALLOWED_ORIGINS in .env')
export const ALLOWED_ORIGINS = _origins.split(',').map((s) => s.trim()).filter(Boolean)

const _reviewUrl = import.meta.env.VITE_REVIEW_360_URL
if (!_reviewUrl) throw new Error('Missing VITE_REVIEW_360_URL in .env')
export const REVIEW_360_URL = _reviewUrl
