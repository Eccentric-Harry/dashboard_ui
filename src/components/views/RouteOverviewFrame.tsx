import { SideRail, TopChip } from '../dashboard/quantified-self-dashboard/dashboard-stage'
import type { AppPath } from '../dashboard/quantified-self-dashboard/data'

type RouteOverviewFrameProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath) => void
  children: React.ReactNode
  ariaLabel: string
}

function RouteOverviewFrame({ activePath, onNavigate, children, ariaLabel }: RouteOverviewFrameProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label={ariaLabel}>
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        {children}
      </div>
    </main>
  )
}

export { RouteOverviewFrame }
