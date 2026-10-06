import { useEffect, useState } from 'react'
import { Copy, Gift, ListChecks } from 'lucide-react'
import toast from 'react-hot-toast'
import { useShoppingStore } from '@/store/shopping-store'
import { useWishlistStore, wishlistActions } from '@/store/wishlist-store'
import { inr } from '@/lib/insights/engine'
import { listAsText, tallyOf } from '@/lib/shopping'
import { wishTotals } from '@/lib/wishlist'
import { cn } from '@/lib/utils'
import type { AppPath } from '@/app/routes'
import { GroceriesView } from './groceries-view'
import { WishlistView } from './wishlist/wishlist-view'

type Tab = 'groceries' | 'wishlist'

interface ShoppingDashboardProps {
  searchParams: URLSearchParams
  onNavigate: (pathname: AppPath, search?: string) => void
}

/**
 * /shopping — two lists that work differently, so they are two tabs: Groceries (a fast
 * check-off list filed by aisle) and Wishlist (product cards for things you're considering).
 * The tab is `?tab=wishlist`, so it survives a reload and can be linked to from /finance.
 * Both lists load here, once, so the tab counts are right whichever tab opens first.
 */
export function ShoppingDashboard({ searchParams, onNavigate }: ShoppingDashboardProps) {
  const tab: Tab = searchParams.get('tab') === 'wishlist' ? 'wishlist' : 'groceries'
  const items = useShoppingStore.use.items().data
  const shoppingActions = useShoppingStore.use.actions()
  const wishes = useWishlistStore.use.wishes().data
  const [pendingLink, setPendingLink] = useState<string | null>(null)

  useEffect(() => {
    void shoppingActions.loadItems()
    void shoppingActions.loadSuggestions()
    void wishlistActions.loadWishes()
  }, [shoppingActions])

  const go = (next: Tab) => onNavigate('/shopping', next === 'wishlist' ? '?tab=wishlist' : undefined)
  const consumeLink = () => setPendingLink(null)

  const tally = tallyOf(items)
  const totals = wishTotals(wishes)

  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(listAsText(items))
      toast.success('List copied')
    } catch {
      toast.error('Could not copy the list')
    }
  }

  const subtitle =
    tab === 'groceries'
      ? tally.total === 0
        ? 'Nothing on the list yet'
        : tally.toGet === 0
          ? 'Everything’s in the basket'
          : `${tally.toGet} to get${tally.inBasket ? ` · ${tally.inBasket} in the basket` : ''}`
      : totals.open === 0
        ? 'Things you’re thinking of buying'
        : `${totals.open} ${totals.open === 1 ? 'thing' : 'things'}${totals.openValue > 0 ? ` · ${inr(totals.openValue)}` : ''}`

  return (
    <div className="shopping-dashboard">
      <header className="shopping-header">
        <div className="shopping-title">
          <h1>Shopping</h1>
          <p>{subtitle}</p>
        </div>
        <div className="shopping-header-tools">
          {tab === 'groceries' && tally.toGet > 0 && (
            <button type="button" className="shopping-ghost-btn is-icon" onClick={() => void copyList()} title="Copy the list as text" aria-label="Copy list">
              <Copy size={13} strokeWidth={2.3} /> <span className="shopping-copy-label">Copy list</span>
            </button>
          )}
          <div className="shopping-tabs" role="tablist" aria-label="Shopping lists">
            <button type="button" role="tab" aria-selected={tab === 'groceries'} className={cn('shopping-tab', tab === 'groceries' && 'is-active')} onClick={() => go('groceries')}>
              <ListChecks size={14} strokeWidth={2.3} />
              Groceries
              {tally.toGet > 0 && <span>{tally.toGet}</span>}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'wishlist'} className={cn('shopping-tab', tab === 'wishlist' && 'is-active')} onClick={() => go('wishlist')}>
              <Gift size={14} strokeWidth={2.3} />
              Wishlist
              {totals.open > 0 && <span>{totals.open}</span>}
            </button>
          </div>
        </div>
      </header>

      {tab === 'groceries' ? (
        <GroceriesView
          onLink={(url) => {
            setPendingLink(url)
            go('wishlist')
          }}
        />
      ) : (
        <WishlistView pendingLink={pendingLink} onPendingConsumed={consumeLink} onNavigate={onNavigate} />
      )}
    </div>
  )
}
