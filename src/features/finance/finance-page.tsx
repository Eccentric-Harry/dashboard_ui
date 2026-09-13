import { SideRail } from '@/components/layout/side-rail'
import { TopChip } from '@/components/layout/top-chip'
import type { AppPath } from '@/app/routes'

import { FinanceOverviewDashboard } from './'

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
