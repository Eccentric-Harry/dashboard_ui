import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail'
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip'
import type { AppPath } from '../dashboard/quantified-self-dashboard/data'

import { WorkoutsOverviewDashboard } from './workouts-overview'

type WorkoutsOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function WorkoutsOverview({ activePath, onNavigate }: WorkoutsOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Workouts overview">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <WorkoutsOverviewDashboard />
      </div>
    </main>
  )
}

export { WorkoutsOverview }
