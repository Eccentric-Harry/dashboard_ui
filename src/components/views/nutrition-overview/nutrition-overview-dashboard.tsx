import { FoodLogCard } from './components/food-log-card'
import { MacroBalanceCard } from './components/macro-balance-card'
import { NutritionHeader } from './components/nutrition-header'
import { ProteinTrendCard } from './components/protein-trend-card'

import './nutrition-overview.css'

function NutritionOverviewDashboard() {
  return (
    <section className="nutrition-dashboard" aria-label="Nutrition overview dashboard">
      <NutritionHeader />
      <div className="nutrition-dashboard-grid">
        <MacroBalanceCard />
        <ProteinTrendCard />
        <FoodLogCard />
      </div>
    </section>
  )
}

export { NutritionOverviewDashboard }
