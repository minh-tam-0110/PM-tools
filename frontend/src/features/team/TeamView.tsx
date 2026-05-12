/** Team tab — Per-person breakdown. Spec: docs/features/team.md */
import { useMemo, useState } from 'react'
import _ from 'lodash'
import { useFilterStore, useTaskStore } from '@/stores'
import { applyFilters } from '@/lib/filter'
import { prioC, PRIORITIES, stOf } from '@/lib/constants'
import { Avatar } from '@/components/shared/Avatar'
import { Badge } from '@/components/shared/Badge'
import { Card } from '@/components/shared/Card'
import { ProgressBar } from '@/components/shared/ProgressBar'
import type { Task } from '@/lib/types'

export function TeamView() {
  const tasks = useTaskStore((s) => s.tasks)
  const team = useTaskStore((s) => s.team)
  const projectMap = useTaskStore((s) => s.projectMap)
  const filters = useFilterStore((s) => s.filters)
  const search = useFilterStore((s) => s.search)
  const setSelectedTask = useTaskStore((s) => s.setSelectedTask)

  const ft = useMemo(() => applyFilters(tasks, filters, search), [tasks, filters, search])
  const byPerson = useMemo(() => _.groupBy(ft, (t) => t.assignee?.id), [ft])

  // sprint.id → project name (BE-organized). Sprint không thuộc project nào → "Other".
  const sprintToProject = useMemo(() => {
    const m: Record<string, string> = {}
    for (const [pname, pg] of Object.entries(projectMap)) {
      for (const s of pg.sprints) m[s.id] = pname
    }
    return m
  }, [projectMap])

  // Khi filter Assignee có chọn — chỉ render member được chọn.
  const visibleTeam = useMemo(() => {
    if (filters.members.length === 0) return team
    const sel = new Set(filters.members.map(String))
    return team.filter((m) => sel.has(String(m.id)))
  }, [team, filters.members])

  // Collapsed state per (memberId|project) và per memberId. Default: expanded.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }))
  const [memberCollapsed, setMemberCollapsed] = useState<Record<string, boolean>>({})
  const toggleMember = (id: string | number) =>
    setMemberCollapsed((c) => ({ ...c, [String(id)]: !c[String(id)] }))

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {visibleTeam.map((m) => {
        const mt = byPerson[m.id] ?? []
        const d = mt.filter((t) => t.status === 'Done').length
        const ov = mt.filter((t) => t.isOverdue).length
        const p = mt.length ? Math.round((d / mt.length) * 100) : 0
        const isMemberCollapsed = !!memberCollapsed[String(m.id)]
        const progressColor = p === 100 ? 'var(--app-ok, #34D399)' : p > 60 ? 'var(--app-info, #60A5FA)' : p > 30 ? 'var(--app-warn, #FBBF24)' : 'var(--app-text)'
        
        return (
          <Card key={m.id} hoverable={true}>
            <div
              onClick={() => toggleMember(m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '4px 8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isMemberCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  fontSize: 12,
                  color: 'var(--app-text-muted)',
                }}
              >
                ▼
              </span>
              <div style={{ position: 'relative' }}>
                <div style={{ padding: 4, background: 'var(--app-gradient-primary)', borderRadius: '50%', boxShadow: '0 8px 16px rgba(124, 106, 239, 0.3)' }}>
                  <Avatar name={m.name} initials={m.av} size={56} />
                </div>
                {ov > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 20,
                    height: 20,
                    background: 'var(--app-danger, #F87171)',
                    borderRadius: '50%',
                    border: '2px solid var(--app-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#fff',
                    boxShadow: '0 0 10px rgba(248,113,113,0.5)',
                    animation: 'pulse-glow 2s infinite'
                  }}>
                    !
                  </div>
                )}
              </div>
              <div style={{ flex: 1, padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--app-text)', letterSpacing: '-0.3px' }}>{m.name}</span>
                  {m.role && (
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--app-accent)',
                        background: 'var(--app-accent-glow)',
                        border: '1px solid rgba(124, 106, 239, 0.2)',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase'
                      }}
                    >
                      {m.role}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 600 }}>
                  <span style={{ color: 'var(--app-text)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                    {mt.length} <span style={{ color: 'var(--app-text-sec)', fontWeight: 500 }}>Tasks</span>
                  </span>
                  <span style={{ color: 'var(--app-ok)', background: 'rgba(52,211,153,0.1)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(52,211,153,0.2)' }}>
                    {d} <span style={{ opacity: 0.8, fontWeight: 500 }}>Done</span>
                  </span>
                  {ov > 0 && (
                    <span style={{ color: 'var(--app-danger, #F87171)', background: 'rgba(248,113,113,0.1)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.2)' }}>
                      ⚠ {ov} <span style={{ opacity: 0.8, fontWeight: 500 }}>Overdue</span>
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', paddingRight: 8 }}>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    color: progressColor,
                    letterSpacing: '-1.5px',
                    textShadow: p === 100 ? '0 0 20px rgba(52,211,153,0.4)' : 'none'
                  }}
                >
                  {p}%
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Tiến độ</div>
              </div>
            </div>
            
            <div style={{ 
              height: 4, 
              background: 'rgba(255,255,255,0.05)', 
              borderRadius: 2, 
              marginTop: 20, 
              marginBottom: isMemberCollapsed ? 0 : 24,
              overflow: 'hidden' 
            }}>
              <div style={{
                height: '100%',
                width: `${p}%`,
                background: progressColor,
                borderRadius: 2,
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: `0 0 10px ${progressColor}`
              }} />
            </div>

            {!isMemberCollapsed && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {(() => {
                const grouped = _.groupBy(mt, (t: Task) => sprintToProject[t.sprint?.id] ?? 'Other')
                // Project order: theo projectMap declaration; "Other" cuối cùng.
                const projectOrder = Object.keys(projectMap)
                const PROJECT_COLORS = ['#7C6AEF', '#34D399', '#60A5FA', '#FBBF24', '#F472B6', '#A78BFA', '#38BDF8', '#FB923C']
                const keys = Object.keys(grouped).sort((a, b) => {
                  if (a === 'Other') return 1
                  if (b === 'Other') return -1
                  const ia = projectOrder.indexOf(a)
                  const ib = projectOrder.indexOf(b)
                  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
                })
                return keys.map((pname, index) => {
                  const list = grouped[pname]
                    .slice()
                    .sort((a, b) => PRIORITIES.indexOf(a.priority as any) - PRIORITIES.indexOf(b.priority as any))
                  const key = `${m.id}|${pname}`
                  const isCollapsed = !!collapsed[key]
                  const doneCount = list.filter((t) => t.status === 'Done').length
                  const pColor = pname === 'Other' ? '#9CA3AF' : PROJECT_COLORS[index % PROJECT_COLORS.length]
                  return (
                    <div key={pname} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <button
                        onClick={() => toggle(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 16px',
                          background: `linear-gradient(90deg, ${pColor}1A 0%, transparent 100%)`,
                          border: 'none',
                          borderLeft: `4px solid ${pColor}`,
                          borderRadius: '0 8px 8px 0',
                          cursor: 'pointer',
                          color: 'var(--app-text)',
                          fontSize: 14,
                          fontWeight: 800,
                          textAlign: 'left',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = `linear-gradient(90deg, ${pColor}33 0%, transparent 100%)` }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = `linear-gradient(90deg, ${pColor}1A 0%, transparent 100%)` }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            transition: 'transform .2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                            fontSize: 12,
                            color: pColor,
                          }}
                        >
                          ▼
                        </span>
                        <span style={{ flex: 1, letterSpacing: 0.5 }}>{pname}</span>
                        <Badge color="var(--app-text-muted)" bg="rgba(255,255,255,0.05)" small>
                          {doneCount}/{list.length} Done
                        </Badge>
                      </button>

                      {!isCollapsed && (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 12, borderLeft: `1px dashed ${pColor}40`, marginLeft: 14 }}>
                          {list.map((t) => (
                            <div
                              key={t.id}
                              className="card-hover"
                              onClick={() => setSelectedTask(t.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                padding: '14px 20px',
                                borderRadius: 12,
                                background: t.isOverdue ? 'rgba(248,113,113,.04)' : `linear-gradient(90deg, ${pColor}0A 0%, var(--app-surface) 100%)`,
                                border: t.isOverdue ? '1px solid rgba(248,113,113,.2)' : `1px solid ${pColor}20`,
                                borderLeft: `3px solid ${t.isOverdue ? 'var(--app-danger, #F87171)' : pColor}`,
                                fontSize: 13,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => { if (!t.isOverdue) { e.currentTarget.style.border = `1px solid ${pColor}50`; e.currentTarget.style.borderLeft = `3px solid ${pColor}`; e.currentTarget.style.boxShadow = `0 4px 12px ${pColor}1A` } }}
                              onMouseLeave={(e) => { if (!t.isOverdue) { e.currentTarget.style.border = `1px solid ${pColor}20`; e.currentTarget.style.borderLeft = `3px solid ${pColor}`; e.currentTarget.style.boxShadow = 'none' } }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 90, flexShrink: 0 }}>
                                <span style={{ color: pColor, fontWeight: 800, fontSize: 13, letterSpacing: 0.5 }}>{t.id}</span>
                              </div>

                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
                                <div style={{ color: 'var(--app-text)', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.3px' }}>
                                  {t.title}
                                </div>
                                {t.description && (
                                  <div style={{ color: 'var(--app-text-sec)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {t.description}
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
                                {/* Priority & Time */}
                                <div style={{ width: 140, display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <Badge color={prioC[t.priority]?.c ?? 'var(--app-text-muted)'} bg={prioC[t.priority]?.bg ?? 'rgba(255,255,255,0.05)'} small>
                                    {t.priority}
                                  </Badge>
                                  {t.time && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--app-text-sec)', fontSize: 12, fontWeight: 600 }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                      {t.time}
                                    </div>
                                  )}
                                </div>

                                {/* Status */}
                                <div style={{ width: 110 }}>
                                  <Badge color={stOf(t.status).c} bg={stOf(t.status).bg} small>
                                    <span style={{ marginRight: 6 }}>{stOf(t.status).i}</span> {t.status}
                                  </Badge>
                                </div>

                                {/* Progress */}
                                <div style={{ width: 120 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, color: 'var(--app-text-sec)', fontWeight: 600 }}>Progress</span>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--app-text-muted)' }}>{t.progress}%</span>
                                  </div>
                                  <ProgressBar value={t.progress} color={t.isOverdue ? 'var(--app-danger, #F87171)' : stOf(t.status).c} h={6} />
                                </div>

                                {/* Deadline */}
                                <div
                                  style={{
                                    width: 100,
                                    textAlign: 'right',
                                    color: t.isOverdue ? 'var(--app-danger, #F87171)' : 'var(--app-text-muted)',
                                    fontSize: 13,
                                    fontWeight: t.isOverdue ? 800 : 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: 6,
                                  }}
                                >
                                  <span style={{ fontSize: 14 }}>{t.isOverdue ? '⚠' : '🗓'}</span> {t.deadline || '—'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
