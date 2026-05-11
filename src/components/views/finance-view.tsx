import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail'
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip'
import type { AppPath } from '../dashboard/quantified-self-dashboard/data'

import { FinanceOverviewDashboard } from './finance-overview'

type FinanceOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function FinanceOverview({ activePath, onNavigate }: FinanceOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Finance overview">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <FinanceOverviewDashboard />
      </div>
    </main>
  )
}

export { FinanceOverview }
