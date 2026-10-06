import { useCallback, useEffect, useRef, useState } from 'react'
import { celebrationActions } from '@/store/celebration-store'
import { localToday } from '@/lib/finance-ledger'
import type { ShoppingItem } from '@/types/shopping'
import { AddBar } from './components/add-bar'
import { BasketCard } from './components/basket-card'
import { BuyAgainCard } from './components/buy-again-card'
import { CheckoutModal } from './components/checkout-modal'
import { EditModal } from './components/edit-modal'
import { GroceryList } from './components/grocery-list'
import { UndoBar } from './components/undo-bar'
import { useShoppingList } from './use-shopping-list'

/** How long a ticked item shows struck-through before it moves to the basket. */
const LEAVE_MS = 240

interface GroceriesViewProps {
  /** A product link was typed into the add bar — the shell opens it on the Wishlist tab. */
  onLink: (url: string) => void
}

function GroceriesSkeleton() {
  return (
    <section className="shopping-card shopping-list-card" aria-hidden="true">
      {[3, 2, 3].map((rows, index) => (
        <div key={index} className="shopping-section">
          <div className="shopping-skel-line is-head" />
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="shopping-skel-line" />
          ))}
        </div>
      ))}
    </section>
  )
}

/**
 * Groceries: type what you need (it files itself by aisle and learns your corrections), tick
 * things off in the shop, then "Done shopping" — which can log the trip in Finance. "Buy again"
 * keeps the usual things one tap away.
 */
export function GroceriesView({ onLink }: GroceriesViewProps) {
  const list = useShoppingList()
  const { aisles, basket, tally } = list
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(() => new Set())

  // The dock's quick-add bubble (phones) lands in the add bar.
  useEffect(() => {
    const focus = () => inputRef.current?.focus()
    window.addEventListener('mobile-quick-add', focus)
    return () => window.removeEventListener('mobile-quick-add', focus)
  }, [])

  const toggle = useCallback(
    async (item: ShoppingItem) => {
      if (item.checked) {
        await list.setChecked(item, false)
        return
      }
      if (leaving.has(item.id)) return
      setLeaving((prev) => new Set(prev).add(item.id))
      await new Promise((resolve) => window.setTimeout(resolve, LEAVE_MS))
      const completed = await list.setChecked(item, true)
      setLeaving((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      if (completed) {
        celebrationActions.celebrate({
          anchor: listRef.current,
          label: 'Shopping list complete',
          once: { key: 'shopping-list', scope: localToday() },
        })
      }
    },
    [leaving, list],
  )

  return (
    <div className="shopping-groceries">
      <div className="shopping-main" ref={listRef}>
        <AddBar inputRef={inputRef} suggestions={list.suggestions} onAdd={list.addItems} onLink={onLink} />
        {list.loading ? (
          <GroceriesSkeleton />
        ) : list.failed ? (
          <section className="shopping-card shopping-list-card is-empty">
            <p className="shopping-empty-title">Couldn&rsquo;t load your list</p>
            <p className="shopping-empty-text">Check your connection and try again.</p>
            <button type="button" className="shopping-ghost-btn" onClick={() => void list.reload()}>
              Retry
            </button>
          </section>
        ) : (
          <GroceryList
            aisles={aisles}
            leaving={leaving}
            hasBasket={basket.length > 0}
            onToggle={toggle}
            onEdit={setEditing}
            onRemove={list.removeItem}
          />
        )}
      </div>

      <aside className="shopping-side">
        <BasketCard
          items={basket}
          tally={tally}
          onToggle={toggle}
          onEdit={setEditing}
          onRemove={list.removeItem}
          onDone={() => setCheckoutOpen(true)}
        />
        <BuyAgainCard
          suggestions={list.suggestions}
          onAdd={(s) => void list.addSuggestion(s)}
          onForget={(s) => void list.forgetSuggestion(s)}
        />
      </aside>

      <UndoBar undo={list.undo} onUndo={() => void list.applyUndo()} />
      <EditModal item={editing} onClose={() => setEditing(null)} onSave={list.updateItem} onRemove={list.removeItem} />
      <CheckoutModal open={checkoutOpen} count={basket.length} onClose={() => setCheckoutOpen(false)} onCheckout={list.checkout} />
    </div>
  )
}
