import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail'
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip'
import type { AppPath } from '../dashboard/quantified-self-dashboard/data'

import { CalendarOverviewDashboard } from './calendar-overview/calendar-overview-dashboard'

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
        <TopChip />
        <CalendarOverviewDashboard searchParams={searchParams} onNavigate={onNavigate} />
      </div>
    </main>
  )
}

export { CalendarOverview }
