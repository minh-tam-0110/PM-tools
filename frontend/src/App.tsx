import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Header } from '@/components/shared/Header'
import { FilterBar } from '@/components/shared/FilterBar'
import type { TabId } from '@/components/layout/TabBar'
import { useDataBridge } from '@/hooks/useDataBridge'

import { OverviewView } from '@/features/overview/OverviewView'
import { ChartsView } from '@/features/charts/ChartsView'
import { CalendarView } from '@/features/calendar/CalendarView'
import { TeamView } from '@/features/team/TeamView'
import { ProjectsView } from '@/features/projects/ProjectsView'
import { KanbanView } from '@/features/kanban/KanbanView'
import { ConnectionPanel } from '@/features/connection/ConnectionPanel'
import { CreateTaskModal } from '@/features/create-task/CreateTaskModal'
import { TaskDetailModal } from '@/components/shared/TaskDetailModal'

export function App() {
  const bridge = useDataBridge()
  const [view, setView] = useState<TabId>('overview')
  const [showConn, setShowConn] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <AppLayout
      header={
        <Header
          view={view}
          onView={setView}
          onRefresh={bridge.refresh}
          onConnect={() => setShowConn(true)}
          onCreate={() => setShowCreate(true)}
        />
      }
    >
      <FilterBar />

      {view === 'overview' && <OverviewView />}
      {view === 'charts' && <ChartsView />}
      {view === 'calendar' && <CalendarView />}
      {view === 'team' && <TeamView />}
      {view === 'projects' && <ProjectsView />}
      {view === 'kanban' && <KanbanView />}

      {showConn && (
        <ConnectionPanel
          iframeRef={bridge.iframeRef}
          onImportJSON={bridge.importJSON}
          onClose={() => setShowConn(false)}
        />
      )}
      {showCreate && (
        <CreateTaskModal iframeRef={bridge.iframeRef} onClose={() => setShowCreate(false)} />
      )}
      <TaskDetailModal />
    </AppLayout>
  )
}
