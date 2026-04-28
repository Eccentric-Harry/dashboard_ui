import { DashboardStage } from './quantified-self-dashboard/dashboard-stage'
import type { AppPath } from './quantified-self-dashboard/data'

type QuantifiedSelfDashboardProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
}

function QuantifiedSelfDashboard({ activePath, onNavigate }: QuantifiedSelfDashboardProps) {
  return (
    <main className="dashboard-shell">
      <DashboardStage activePath={activePath} onNavigate={onNavigate} />
    </main>
  )
}

export { QuantifiedSelfDashboard }
