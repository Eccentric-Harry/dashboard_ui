import type { AppPath } from '@/app/routes'

import { GoalsOverviewDashboard } from './goals-overview-dashboard'
import { QuietPathWorld } from './worlds/quiet-path/quiet-path-world'
import { LighthouseWorld } from './lighthouse/lighthouse-world'

type GoalsOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath, search?: string) => void
  searchParams: URLSearchParams
}

/**
 * /goals is the one route that steps outside the app's frame: no side rail, no mobile
 * dock, no HUD gutters — the camp takes the whole screen, with its own small way out.
 * (App.tsx skips the HUD and profile chip for this route.) `?world=<goalId>` swaps the
 * camp for that goal's own world — a query param rather than a route, like
 * /learnings?pursuit=, so dark gating and PWA search persistence carry over.
 * `?program=lighthouse` is The Lighthouse, the 90-day program (design/LIGHTHOUSE_90_PLAN.md),
 * reached from the lighthouse on the camp's horizon.
 */
function GoalsOverview({ onNavigate, searchParams }: GoalsOverviewProps) {
  if (searchParams.get('program')) {
    return <LighthouseWorld onBack={() => onNavigate('/goals')} onLeave={(path) => onNavigate(path)} />
  }
  const worldGoalId = searchParams.get('world')
  if (worldGoalId) {
    // The Quiet Path is the only world so far; every world key resolves here by goal.
    return <QuietPathWorld key={worldGoalId} goalId={worldGoalId} onBack={() => onNavigate('/goals')} />
  }
  return (
    <GoalsOverviewDashboard
      onExit={() => onNavigate('/home')}
      onOpenWorld={(goalId) => onNavigate('/goals', `?world=${encodeURIComponent(goalId)}`)}
      onOpenLighthouse={() => onNavigate('/goals', '?program=lighthouse')}
    />
  )
}

export { GoalsOverview }
