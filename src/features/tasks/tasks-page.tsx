import { SideRail } from '@/components/layout/side-rail'
import { TopChip } from '@/components/layout/top-chip'
import type { AppPath } from '@/app/routes'
import { TasksDashboard } from './tasks-dashboard'
import './tasks-overview.css'

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
