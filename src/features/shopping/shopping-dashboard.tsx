import { useEffect } from 'react'
import { useWishlistStore, wishlistActions } from '@/store/wishlist-store'
import { inr } from '@/lib/insights/engine'
import { wishTotals } from '@/lib/wishlist'
import type { AppPath } from '@/app/routes'
import { WishlistView } from './wishlist/wishlist-view'

interface ShoppingDashboardProps {
  searchParams?: URLSearchParams
  onNavigate: (pathname: AppPath, search?: string) => void
}

/**
 * /shopping — Dedicated wishlist dashboard for curated items you're considering,
 * featuring price intelligence, a 30-day cooling-off rule, branded marketplace tags,
 * and direct integration with your monthly budget.
 */
export function ShoppingDashboard({ onNavigate }: ShoppingDashboardProps) {
  const wishes = useWishlistStore.use.wishes().data

  useEffect(() => {
    void wishlistActions.loadWishes()
  }, [])

  const totals = wishTotals(wishes)

  const subtitle =
    totals.open === 0
      ? 'Things you’re thinking of buying'
      : `${totals.open} ${totals.open === 1 ? 'item' : 'items'}${totals.openValue > 0 ? ` · ${inr(totals.openValue)}` : ''}`

  return (
    <div className="shopping-dashboard">
      <header className="shopping-header">
        <div className="shopping-title">
          <h1>Wishlist</h1>
          <p>{subtitle}</p>
        </div>
      </header>

      <WishlistView pendingLink={null} onPendingConsumed={() => {}} onNavigate={onNavigate} />
    </div>
  )
}
