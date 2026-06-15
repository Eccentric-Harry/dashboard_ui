import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail'
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip'
import type { AppPath } from '../dashboard/quantified-self-dashboard/data'
import { TasksDashboard } from './tasks-overview/tasks-dashboard'
import './tasks-overview/tasks-overview.css'

type TasksOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath, search?: string) => void
  searchParams: URLSearchParams
}

function TasksOverview({ activePath, onNavigate, searchParams }: TasksOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Tasks overview">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <TasksDashboard searchParams={searchParams} onNavigate={onNavigate} />
      </div>
    </main>
  )
}

export { TasksOverview }
