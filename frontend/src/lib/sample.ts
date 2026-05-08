/** Sample data sinh deterministic từ seed — dùng khi chưa có data thực. */
import type { Member, Priority, Sprint, Status, Task } from './types'
import { MODULES, PRIORITIES, STATUSES } from './constants'
import { fmtDate } from './utils'

export const SAMPLE_TEAM: Member[] = [
  { id: 1, name: 'Minh Trí', role: 'Frontend Dev', av: 'MT' },
  { id: 2, name: 'Thanh Hà', role: 'Backend Dev', av: 'TH' },
  { id: 3, name: 'Quốc Bảo', role: 'Game Designer', av: 'QB' },
  { id: 4, name: 'Mai Linh', role: 'QA Engineer', av: 'ML' },
  { id: 5, name: 'Đức Anh', role: 'UI/UX Designer', av: 'DA' },
  { id: 6, name: 'Phương Nhi', role: 'Backend Dev', av: 'PN' },
]

export const SAMPLE_SPRINTS: Sprint[] = [
  { id: 's0', name: 'Sprint 18', start: '2026-03-16', end: '2026-03-29', status: 'completed', committed: 42, completed: 38 },
  { id: 's1', name: 'Sprint 19', start: '2026-03-30', end: '2026-04-12', status: 'completed', committed: 45, completed: 43 },
  { id: 's2', name: 'Sprint 20', start: '2026-04-13', end: '2026-04-26', status: 'completed', committed: 48, completed: 41 },
  { id: 's3', name: 'Sprint 21', start: '2026-04-27', end: '2026-05-10', status: 'active', committed: 50, completed: 32 },
  { id: 's4', name: 'Sprint 22', start: '2026-05-11', end: '2026-05-24', status: 'upcoming', committed: 46, completed: 0 },
]

const TASK_NAMES: Record<string, string[]> = {
  'Battle System': ['Fix damage calc', 'Combo system', 'Balance stats', 'Skill VFX', 'Hit detection', 'Refactor SM', 'Battle replay', 'Turn order fix'],
  'UI/HUD': ['Health bar v2', 'Minimap', 'Tooltip fix', 'Chat UI', 'Loading screen', 'Settings v2', 'Responsive fix', 'Toast system'],
  'Backend API': ['Match query opt', 'Rate limiting', 'Auth refresh', 'Leaderboard API', 'WS events', 'DB migration', 'Concurrency fix', 'Cache layer'],
  Matchmaking: ['ELO fix', 'Rank decay', 'Party queue', 'Timeout fix', 'Region filter', 'Queue optimize', 'Rank display', 'Season reset'],
  'Shop & IAP': ['Bundle UI', 'Purchase valid', 'Daily deals', 'Gift system', 'Receipt verify', 'Coin anim', 'Refund flow', 'Price fix'],
  Analytics: ['Funnel track', 'Event logging', 'A/B framework', 'Retention dash', 'Session track', 'Crash report', 'GDPR export', 'Attribution fix'],
}

function makeSeed(s: number): () => number {
  let h = s
  return () => {
    h = (h * 16807) % 2147483647
    return (h - 1) / 2147483646
  }
}

export function genSample(today: Date = new Date()): Task[] {
  const R = makeSeed(42)
  const tasks: Task[] = []
  let id = 1
  for (const m of SAMPLE_TEAM) {
    const n = 5 + Math.floor(R() * 4)
    for (let i = 0; i < n; i++) {
      const sp = SAMPLE_SPRINTS[1 + Math.floor(R() * (SAMPLE_SPRINTS.length - 1))]
      const st: Status = STATUSES[Math.floor(R() * STATUSES.length)] as Status
      const pr: Priority = PRIORITIES[Math.floor(R() * PRIORITIES.length)] as Priority
      const mod = MODULES[Math.floor(R() * MODULES.length)] as string
      const d = new Date(today)
      d.setDate(d.getDate() + Math.floor(R() * 22) - 7)
      const overdue = st !== 'Done' && d < today
      const prog =
        st === 'Done' ? 100
        : st === 'Review' ? 80 + Math.floor(R() * 20)
        : st === 'In Progress' ? 20 + Math.floor(R() * 55)
        : st === 'To Do' ? Math.floor(R() * 10)
        : 0
      const pts = [1, 2, 3, 5, 8][Math.floor(R() * 5)]
      tasks.push({
        id: `T-${String(id++).padStart(3, '0')}`,
        title: (TASK_NAMES[mod] ?? TASK_NAMES['UI/HUD'])[i % 8],
        assignee: m,
        sprint: sp,
        status: st,
        priority: pr,
        module: mod,
        deadline: fmtDate(d),
        isOverdue: overdue,
        progress: prog,
        sp: pts,
        source: 'sample',
      })
    }
  }
  return tasks
}
