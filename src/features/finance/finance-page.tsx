import { SideRail } from '@/components/layout/side-rail'
import { TopChip } from '@/components/layout/top-chip'
import type { AppPath } from '@/app/routes'

import { FinanceOverviewDashboard } from './'

type FinanceOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath, search?: string) => void
  searchParams: URLSearchParams
}

function FinanceOverview({ activePath, onNavigate, searchParams }: FinanceOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Finance overview">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <FinanceOverviewDashboard searchParams={searchParams} onNavigate={onNavigate} />
      </div>
    </main>
  )
}

export { FinanceOverview }
