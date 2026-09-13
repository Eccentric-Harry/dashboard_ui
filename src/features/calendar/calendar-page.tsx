import { SideRail } from '@/components/layout/side-rail'
import type { AppPath } from '@/app/routes'

import { CalendarOverviewDashboard } from './calendar-overview-dashboard'

type CalendarOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath, search?: string) => void
  searchParams: URLSearchParams
}

function CalendarOverview({ activePath, onNavigate, searchParams }: CalendarOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Calendar overview">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <CalendarOverviewDashboard searchParams={searchParams} onNavigate={onNavigate} />
      </div>
    </main>
  )
}

export { CalendarOverview }
