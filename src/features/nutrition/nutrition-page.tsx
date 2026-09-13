import { SideRail } from '@/components/layout/side-rail'
import { TopChip } from '@/components/layout/top-chip'
import type { AppPath } from '@/app/routes'

import { NutritionOverviewDashboard } from './'

type NutritionOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function NutritionOverview({ activePath, onNavigate }: NutritionOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Nutrition overview">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <NutritionOverviewDashboard />
      </div>
    </main>
  )
}

export { NutritionOverview }
