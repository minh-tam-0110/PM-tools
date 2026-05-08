import { create } from 'zustand'
import type { CreateTaskInput, Member, Sprint, Task } from '@/lib/types'
import { fmtDate } from '@/lib/utils'

type State = {
  tasks: Task[]
  team: Member[]
  sprints: Sprint[]
  setAll: (p: { tasks: Task[]; team?: Member[] | null; sprints?: Sprint[] | null }) => void
  add: (input: CreateTaskInput) => Task
  update: (id: string, patch: Partial<Task>) => void
  remove: (id: string) => void
}

export const useTaskStore = create<State>((set, get) => ({
  tasks: [],
  team: [],
  sprints: [],
  setAll: ({ tasks, team, sprints }) =>
    set((s) => ({
      tasks,
      team: team && team.length ? team : s.team,
      sprints: sprints && sprints.length ? sprints : s.sprints,
    })),
  add: (input) => {
    const today = new Date()
    const t: Task = {
      id: `T-${String(get().tasks.length + 1).padStart(3, '0')}`,
      title: input.title,
      assignee: input.assignee,
      sprint: input.sprint,
      status: input.status,
      priority: input.priority,
      module: input.module,
      deadline: input.deadline || fmtDate(today),
      isOverdue: input.status !== 'Done' && new Date(input.deadline) < today,
      progress:
        input.status === 'Done' ? 100
        : input.status === 'Review' ? 85
        : input.status === 'In Progress' ? 30
        : 0,
      sp: input.sp,
      source: 'created',
      description: input.desc,
    }
    set((s) => ({ tasks: [...s.tasks, t] }))
    return t
  },
  update: (id, patch) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  remove: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
}))
