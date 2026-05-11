import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail'
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip'
import type { AppPath } from '../dashboard/quantified-self-dashboard/data'

import { LearningsOverviewDashboard } from './learnings-overview/learnings-overview-dashboard'

type LearningsOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
  searchParams: URLSearchParams
}

function LearningsOverview({ activePath, onNavigate, searchParams }: LearningsOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Learnings overview">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <LearningsOverviewDashboard searchParams={searchParams} />
      </div>
    </main>
  )
}

export { LearningsOverview }
