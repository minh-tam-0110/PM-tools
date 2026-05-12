/** Apply filter + search lên danh sách task. */
import type { Filters, Task } from './types'

export function applyFilters(tasks: Task[], f: Filters, search: string = ''): Task[] {
  let r = tasks.filter((t) => {
    if (f.sprint !== 'all' && t.sprint?.id !== f.sprint) return false
    if (f.members.length > 0 && !f.members.includes(String(t.assignee?.id))) return false
    if (f.priority !== 'all' && t.priority !== f.priority) return false
    if (f.modules.length > 0 && !f.modules.includes(t.module)) return false
    if (f.statuses.length > 0 && !f.statuses.includes(t.status)) return false
    return true
  })
  if (search) {
    const q = search.toLowerCase()
    r = r.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.assignee?.name || '').toLowerCase().includes(q),
    )
  }
  return r
}

export const EMPTY_FILTERS: Filters = {
  sprint: 'all',
  members: [],
  priority: 'all',
  modules: [],
  statuses: [],
}

export const hasActiveFilter = (f: Filters): boolean =>
  f.sprint !== 'all' ||
  f.members.length > 0 ||
  f.priority !== 'all' ||
  f.modules.length > 0 ||
  f.statuses.length > 0
