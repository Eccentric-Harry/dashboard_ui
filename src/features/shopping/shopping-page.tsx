import { SideRail } from '@/components/layout/side-rail'
import { TopChip } from '@/components/layout/top-chip'
import type { AppPath } from '@/app/routes'
import { ShoppingDashboard } from './shopping-dashboard'
import './shopping-overview.css'
import './wishlist/wishlist.css'

type ShoppingOverviewProps = {
  activePath: AppPath
  onNavigate: (pathname: AppPath, search?: string) => void
  searchParams: URLSearchParams
}

function ShoppingOverview({ activePath, onNavigate, searchParams }: ShoppingOverviewProps) {
  return (
    <main className="dashboard-shell">
      <div className="dashboard-stage" aria-label="Shopping list">
        <SideRail activePath={activePath} onNavigate={onNavigate} />
        <TopChip />
        <ShoppingDashboard searchParams={searchParams} onNavigate={onNavigate} />
      </div>
    </main>
  )
}

export { ShoppingOverview }
