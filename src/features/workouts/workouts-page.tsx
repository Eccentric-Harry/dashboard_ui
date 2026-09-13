import { SideRail } from '@/components/layout/side-rail'
import { TopChip } from '@/components/layout/top-chip'
import type { AppPath } from '@/app/routes'

import { WorkoutsOverviewDashboard } from './'

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
