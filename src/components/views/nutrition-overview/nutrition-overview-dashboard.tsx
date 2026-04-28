import { MacroBalanceCard } from './components/macro-balance-card'
import { NutritionHeader } from './components/nutrition-header'
import { ProteinCompletenessCard } from './components/protein-completeness-card'
import { ProteinTrendCard } from './components/protein-trend-card'
import { QuickLogCard } from './components/quick-log-card'

import './nutrition-overview.css'

function NutritionOverviewDashboard() {
  return (
    <section className="nutrition-dashboard" aria-label="Nutrition overview dashboard">
      <NutritionHeader />
      <div className="nutrition-dashboard-grid">
        <MacroBalanceCard />
        <ProteinTrendCard />
        <ProteinCompletenessCard />
        <QuickLogCard />
      </div>
    </section>
  )
}

export { NutritionOverviewDashboard }
