import { create } from 'zustand'
import type { CreateTaskInput, Member, ProjectGroup, Sprint, Task } from '@/lib/types'
import { fmtDate } from '@/lib/utils'

type State = {
  tasks: Task[]
  team: Member[]
  sprints: Sprint[]
  /** BE-organized: project name → {sprints, members}. Empty nếu data source là manual JSON cũ. */
  projectMap: Record<string, ProjectGroup>
  setAll: (p: {
    tasks: Task[]
    team?: Member[] | null
    sprints?: Sprint[] | null
    projectMap?: Record<string, ProjectGroup> | null
  }) => void
  add: (input: CreateTaskInput) => Task
  update: (id: string, patch: Partial<Task>) => void
  remove: (id: string) => void
  selectedTaskId: string | null
  setSelectedTask: (id: string | null) => void
}

export const useTaskStore = create<State>((set, get) => ({
  tasks: [],
  team: [],
  sprints: [],
  projectMap: {},
  selectedTaskId: null,
  setSelectedTask: (id) => set({ selectedTaskId: id }),
  setAll: ({ tasks, team, sprints, projectMap }) =>
    set((s) => ({
      tasks,
      team: team && team.length ? team : s.team,
      sprints: sprints && sprints.length ? sprints : s.sprints,
      projectMap: projectMap && Object.keys(projectMap).length ? projectMap : s.projectMap,
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
