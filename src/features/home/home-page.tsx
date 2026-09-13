import { SideRail } from '@/components/layout/side-rail'
import { TopChip } from '@/components/layout/top-chip'
import type { AppPath } from '@/app/routes'

import { HomeOverviewDashboard } from './home-overview-dashboard'

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
