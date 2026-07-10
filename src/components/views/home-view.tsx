import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail'
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip'
import type { AppPath } from '../dashboard/quantified-self-dashboard/data'

import { HomeOverviewDashboard } from './home-overview/home-overview-dashboard'

type HomeOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath, search?: string) => void
}

function HomeOverview({ activePath, onNavigate }: HomeOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Home overview">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <HomeOverviewDashboard onNavigate={onNavigate} />
      </div>
    </main>
  )
}

export { HomeOverview }
