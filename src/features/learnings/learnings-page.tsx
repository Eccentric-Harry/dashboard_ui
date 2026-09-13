import { SideRail } from '@/components/layout/side-rail'
import { TopChip } from '@/components/layout/top-chip'
import type { AppPath } from '@/app/routes'

import { LearningsOverviewDashboard } from './learnings-overview-dashboard'
import { useFocusStore } from '@/store/focus-store'

type LearningsOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath, search?: string) => void
  searchParams: URLSearchParams
}

function LearningsOverview({ activePath, onNavigate, searchParams }: LearningsOverviewProps) {
  const isFocusMode = useFocusStore.use.isFocusMode()

  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Learnings overview">
        {!isFocusMode && <SideRail activePath={activePath} onNavigate={onNavigate} />}
        <TopChip />
        <LearningsOverviewDashboard searchParams={searchParams} onNavigate={onNavigate} />
      </div>
    </main>
  )
}

export { LearningsOverview }
