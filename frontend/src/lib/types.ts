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
  source: 'imported' | 'created'
  description?: string
}

export type Filters = {
  sprint: string
  members: string[]
  priority: string
  module: string
  statuses: string[]
}

/** Per-project group — BE đã sắp xếp, FE chỉ đọc. */
export type ProjectGroup = {
  name: string
  sprints: Sprint[]
  members: Member[]
  /** Sprint ID đang "In Progress" (lấy từ /my-projects Sprint Release panel). Undefined nếu không xác định. */
  activeSprintId?: string
}

export type ConnSrc = 'none' | 'iframe' | 'manual' | 'be'
export type IframeStatus = 'idle' | 'loading' | 'connected' | 'error'

export type ImportPayload =
  | unknown[]
  | {
      tasks?: unknown[]
      team?: unknown[]
      sprints?: unknown[]
      projects?: unknown[]
      activeSprintsMap?: Record<string, string>
    }

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
