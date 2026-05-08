import { SideRail } from './components/side-rail'
import { TopChip } from './components/top-chip'
import { RunnerCardPanel } from './components/runner-card-panel'
import { CalendarCard } from './components/calendar-card'
import { SavingsCard } from './components/savings-card'
import { EarningsCard } from './components/earnings-card'
import { ProductsCard } from './components/products-card'
import { MonthSwitch } from './components/month-switch'
import { IndicatorCard as NutritionSummaryCard } from './components/nutrition-summary-card'
import type { AppPath } from './data'

type DashboardStageProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function DashboardStage({ activePath, onNavigate }: DashboardStageProps) {
  return (
    <div className="dashboard-stage" aria-label="Dashboard widgets">
      <SideRail activePath={activePath} onNavigate={onNavigate} />
      <TopChip />
      <RunnerCardPanel />
      <CalendarCard />
      <SavingsCard />
      <EarningsCard />
      <ProductsCard />
      <MonthSwitch />
      <NutritionSummaryCard />
    </div>
  )
}

export { DashboardStage, SideRail, TopChip }
