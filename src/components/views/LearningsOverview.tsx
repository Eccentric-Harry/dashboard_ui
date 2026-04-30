import type { AppPath } from '../dashboard/quantified-self-dashboard/data'
import { DateTiles } from '../dashboard/quantified-self-dashboard/components/date-tiles'
import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail'
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip'

import { LearningsOverviewDashboard } from './learnings-overview/learnings-overview-dashboard'

type LearningsOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath, search?: string) => void
  searchParams: URLSearchParams
}

function LearningsOverview({ activePath, onNavigate, searchParams }: LearningsOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Learnings overview">
        <DateTiles />
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <LearningsOverviewDashboard searchParams={searchParams} />
      </div>
    </main>
  )
}

export { LearningsOverview }
