/** Canonical types — UI components luôn nhận shape này. */

export type Status = 'Backlog' | 'To Do' | 'In Progress' | 'Review' | 'Done'
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'
export type SprintStatus = 'upcoming' | 'active' | 'completed'

export type Member = {
  id: number
  name: string
  role: string
  av: string
}

export type Sprint = {
  id: string
  name: string
  start: string
  end: string
  status: SprintStatus
  committed: number
  completed: number
}

export type Task = {
  id: string
  title: string
  assignee: Member
  sprint: Sprint
  status: Status
  priority: Priority
  module: string
  deadline: string
  isOverdue: boolean
  progress: number
  sp: number
  source: 'sample' | 'imported' | 'created'
  description?: string
}

export type Filters = {
  sprint: string
  member: string
  priority: string
  module: string
}

export type ConnSrc = 'sample' | 'iframe' | 'manual' | 'be'
export type IframeStatus = 'idle' | 'loading' | 'connected' | 'error'

export type ImportPayload =
  | unknown[]
  | { tasks?: unknown[]; team?: unknown[]; sprints?: unknown[] }

export type CreateTaskInput = {
  title: string
  assignee: Member
  sprint: Sprint
  status: Status
  priority: Priority
  module: string
  deadline: string
  sp: number
  desc?: string
}
