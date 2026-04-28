import { DateTiles } from './components/date-tiles'
import { SideRail } from './components/side-rail'
import { TopChip } from './components/top-chip'
import { RunnerCardPanel } from './components/runner-card-panel'
import { IndicatorCard } from './components/indicator-card'
import { CalendarCard } from './components/calendar-card'
import { SavingsCard } from './components/savings-card'
import { EarningsCard } from './components/earnings-card'
import { ProductsCard } from './components/products-card'
import { CostStack } from './components/cost-stack'
import { MonthSwitch } from './components/month-switch'

import { type AppPath } from './data'

type DashboardStageProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function DashboardStage({ activePath, onNavigate }: DashboardStageProps) {
  return (
    <div className="dashboard-stage" aria-label="2024 charts dashboard">
      <DateTiles />
      <SideRail activePath={activePath} onNavigate={onNavigate} />
      <TopChip />
      <RunnerCardPanel />
      <IndicatorCard />
      <CalendarCard />
      <SavingsCard />
      <EarningsCard />
      <ProductsCard />
      <CostStack />
      <MonthSwitch />
    </div>
  )
}

export { DashboardStage, DateTiles, SideRail, TopChip }
