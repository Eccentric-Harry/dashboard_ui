import type { AppPath } from '../dashboard/quantified-self-dashboard/data'

import { RouteOverviewFrame } from './RouteOverviewFrame'

type NutritionOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function NutritionOverview({ activePath, onNavigate }: NutritionOverviewProps) {
  return (
    <RouteOverviewFrame
      activePath={activePath}
      eyebrow="Nutrition route"
      title="Nutrition Overview"
      body="Dummy nutrition content for now. The route is ready for meal, protein, and habit widgets once the backend exists."
      onNavigate={onNavigate}
    />
  )
}

export { NutritionOverview }
