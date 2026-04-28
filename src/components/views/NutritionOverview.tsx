import { DateTiles } from '../dashboard/quantified-self-dashboard/components/date-tiles'
import { SideRail } from '../dashboard/quantified-self-dashboard/components/side-rail'
import { TopChip } from '../dashboard/quantified-self-dashboard/components/top-chip'
import type { AppPath } from '../dashboard/quantified-self-dashboard/data'

import { NutritionOverviewDashboard } from './nutrition-overview'

type NutritionOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function NutritionOverview({ activePath, onNavigate }: NutritionOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Nutrition overview">
        <DateTiles />
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <NutritionOverviewDashboard />
      </div>
    </main>
  )
}

export { NutritionOverview }
