import { SideRail } from '@/components/layout/side-rail'
import { TopChip } from '@/components/layout/top-chip'
import type { AppPath } from '@/app/routes'

import { MindOverviewDashboard } from './mind-overview-dashboard'

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
