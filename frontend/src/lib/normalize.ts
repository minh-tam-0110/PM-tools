/** Single source of truth: map raw data (Review 360° / manual JSON) → canonical. */
import type { ImportPayload, Member, Priority, Sprint, SprintStatus, Status, Task } from './types'
import { fmtDate, hashS, initials } from './utils'

function mapStatus(v: unknown): Status {
  if (typeof v !== 'string' || !v) return 'Backlog'
  const l = v.toLowerCase()
  if (l.includes('done') || l.includes('complete') || l.includes('closed')) return 'Done'
  if (l.includes('review') || l.includes('testing') || l.includes('qa')) return 'Review'
  if (l.includes('progress') || l.includes('doing') || l.includes('active')) return 'In Progress'
  if (l.includes('todo') || l.includes('to do') || l.includes('open') || l.includes('new')) return 'To Do'
  return 'Backlog'
}

function mapPriority(v: unknown): Priority {
  if (v == null) return 'Medium'
  const l = String(v).toLowerCase()
  if (l.includes('critical') || l.includes('urgent') || l === '1') return 'Critical'
  if (l.includes('high') || l === '2') return 'High'
  if (l.includes('low') || l === '4') return 'Low'
  return 'Medium'
}

function mapSprintStatus(v: unknown): SprintStatus {
  const l = String(v ?? '').toLowerCase()
  if (l === 'completed' || l === 'closed' || l === 'done') return 'completed'
  if (l === 'upcoming' || l === 'planned') return 'upcoming'
  return 'active'
}

function normAssignee(v: unknown, role?: string): Member {
  if (typeof v === 'string') {
    return { id: hashS(v), name: v, role: role ?? '', av: initials(v) }
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    const name = (o.name as string) ?? (o.fullName as string) ?? 'Unassigned'
    return {
      id: typeof o.id === 'number' ? o.id : hashS(name),
      name,
      role: (o.role as string) ?? '',
      av: (o.av as string) ?? initials(name),
    }
  }
  return { id: 0, name: 'Unassigned', role: '', av: '??' }
}

function normSprint(v: unknown, fallback?: Partial<Sprint>): Sprint {
  if (typeof v === 'string') {
    return {
      id: 's' + hashS(v),
      name: v,
      start: fallback?.start ?? '',
      end: fallback?.end ?? '',
      status: fallback?.status ?? 'active',
      committed: 0,
      completed: 0,
    }
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    return {
      id: (o.id as string) ?? 's' + hashS((o.name as string) ?? ''),
      name: (o.name as string) ?? 'Backlog',
      start: (o.start as string) ?? '',
      end: (o.end as string) ?? '',
      status: mapSprintStatus(o.status),
      committed: Number(o.committed ?? 0) || 0,
      completed: Number(o.completed ?? 0) || 0,
    }
  }
  return { id: 's0', name: 'Backlog', start: '', end: '', status: 'active', committed: 0, completed: 0 }
}

function normDeadline(v: unknown): string {
  // Trả về "YYYY-MM-DD" local-time, hoặc "" nếu không parse được.
  // Scraper có thể trả "" (không có deadline), "YYYY-MM-DD", hoặc ISO với time —
  // ta cần normalize về 1 dạng để calendar key-match đúng.
  if (typeof v !== 'string' || !v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const d = new Date(v)
  if (!isNaN(d.getTime())) return fmtDate(d)
  return ''
}

function defaultProgress(st: Status): number {
  if (st === 'Done') return 100
  if (st === 'Review') return 85
  if (st === 'In Progress') return 30
  return 0
}

export function normTask(raw: unknown, idx: number = 0, today: Date = new Date()): Task {
  const o = (raw ?? {}) as Record<string, unknown>
  const status = mapStatus(o.status)
  const rawDeadline = (o.deadline as string) ?? (o.dueDate as string) ?? (o.due as string) ?? ''
  const deadline = normDeadline(rawDeadline)
  const sprintStatus = mapSprintStatus(o.sprintStatus)
  return {
    id: (o.id as string) ?? (o.taskId as string) ?? `T-${String(idx + 1).padStart(3, '0')}`,
    title: (o.title as string) ?? (o.name as string) ?? (o.summary as string) ?? 'Untitled',
    assignee: normAssignee(o.assignee, o.role as string | undefined),
    sprint: normSprint(o.sprint, { start: o.sprintStart as string, end: o.sprintEnd as string, status: sprintStatus }),
    status,
    priority: mapPriority(o.priority),
    module: (o.module as string) ?? (o.category as string) ?? (o.label as string) ?? 'General',
    deadline,
    isOverdue: status !== 'Done' && new Date(deadline) < today,
    progress: typeof o.progress === 'number' ? o.progress : typeof o.percent === 'number' ? o.percent : defaultProgress(status),
    sp: Number(o.sp ?? o.storyPoints ?? o.points ?? 3) || 3,
    source: 'imported',
    description: o.desc as string | undefined,
  }
}

export type NormalizedImport = {
  tasks: Task[]
  team: Member[] | null
  sprints: Sprint[] | null
}

export function normalizeImported(raw: ImportPayload, today: Date = new Date()): NormalizedImport {
  const arr = Array.isArray(raw) ? raw : (raw?.tasks ?? [])
  const tasks = arr.map((t, i) => normTask(t, i, today))

  // Derive team từ tasks: rebuild ID cho stable match với filter dropdown.
  const teamMap = new Map<string, Member>()
  for (const t of tasks) {
    if (t.assignee?.name && !teamMap.has(t.assignee.name)) {
      teamMap.set(t.assignee.name, { ...t.assignee, id: teamMap.size + 1 })
    }
  }
  // Re-tag mỗi task's assignee.id để match team list IDs (filter compatibility).
  for (const t of tasks) {
    const m = teamMap.get(t.assignee?.name)
    if (m) t.assignee = { ...t.assignee, id: m.id }
  }

  const sprintMap = new Map<string, Sprint>()
  for (const t of tasks) {
    if (t.sprint?.name && !sprintMap.has(t.sprint.name)) {
      sprintMap.set(t.sprint.name, { ...t.sprint, id: 's' + sprintMap.size })
    }
  }
  for (const t of tasks) {
    const s = sprintMap.get(t.sprint?.name ?? '')
    if (s) t.sprint = { ...t.sprint, id: s.id }
  }

  return {
    tasks,
    team: teamMap.size ? Array.from(teamMap.values()) : null,
    sprints: sprintMap.size ? Array.from(sprintMap.values()) : null,
  }
}
