/** Apply filter + search lên danh sách task. */
import type { Filters, Task } from './types'

export function applyFilters(tasks: Task[], f: Filters, search: string = ''): Task[] {
  let r = tasks.filter((t) => {
    if (f.sprint !== 'all' && t.sprint?.id !== f.sprint) return false
    if (f.member !== 'all' && t.assignee?.id !== Number(f.member)) return false
    if (f.priority !== 'all' && t.priority !== f.priority) return false
    if (f.module !== 'all' && t.module !== f.module) return false
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
  member: 'all',
  priority: 'all',
  module: 'all',
}

export const hasActiveFilter = (f: Filters): boolean =>
  Object.values(f).some((v) => v !== 'all')
