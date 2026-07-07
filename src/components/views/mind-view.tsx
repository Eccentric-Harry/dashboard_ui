import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail'
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip'
import type { AppPath } from '../dashboard/quantified-self-dashboard/data'

import { MindOverviewDashboard } from './mind-overview/mind-overview-dashboard'

type MindOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath, search?: string) => void
}

function MindOverview({ activePath, onNavigate }: MindOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Mind overview">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <MindOverviewDashboard />
      </div>
    </main>
  )
}

export { MindOverview }
