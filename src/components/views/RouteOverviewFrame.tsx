import { DateTiles, SideRail, TopChip } from '../dashboard/quantified-self-dashboard/dashboard-stage'
import type { AppPath } from '../dashboard/quantified-self-dashboard/data'

type RouteOverviewFrameProps = {
  activePath: AppPath
  eyebrow: string
  title: string
  body: string
  onNavigate: (pathname: AppPath) => void
}

function RouteOverviewFrame({ activePath, eyebrow, title, body, onNavigate }: RouteOverviewFrameProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label={title}>
        <DateTiles />
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <section className="route-view" aria-labelledby={`${activePath.slice(1)}-overview-title`}>
          <div className="route-card">
            <p className="route-eyebrow">{eyebrow}</p>
            <h1 id={`${activePath.slice(1)}-overview-title`}>{title}</h1>
            <p>{body}</p>
          </div>
        </section>
      </div>
    </main>
  )
}

export { RouteOverviewFrame }
