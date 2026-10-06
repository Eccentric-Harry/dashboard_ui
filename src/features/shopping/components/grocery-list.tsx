import { ListChecks } from 'lucide-react'
import type { ShoppingAisle } from '@/lib/shopping'
import type { ShoppingItem } from '@/types/shopping'
import { categoryLook, categoryTone } from '../shopping-categories'
import { ShoppingRow } from './shopping-row'

interface GroceryListProps {
  aisles: ShoppingAisle[]
  leaving: ReadonlySet<string>
  /** Something is in the basket — the empty state says "all done" rather than "nothing yet". */
  hasBasket: boolean
  onToggle: (item: ShoppingItem) => void
  onEdit: (item: ShoppingItem) => void
  onRemove: (item: ShoppingItem) => void
}

/**
 * Everything still to get, in one card: aisle headings in the order a shop is walked, the items
 * under each as hairline rows. One reading column — no masonry to jump around as items move.
 */
function GroceryList({ aisles, leaving, hasBasket, onToggle, onEdit, onRemove }: GroceryListProps) {
  if (aisles.length === 0) {
    return (
      <section className="shopping-card shopping-list-card is-empty">
        <span className="shopping-empty-icon" aria-hidden="true">
          <ListChecks size={20} strokeWidth={2.2} />
        </span>
        <p className="shopping-empty-title">{hasBasket ? 'Everything’s in the basket' : 'Nothing to get'}</p>
        <p className="shopping-empty-text">
          {hasBasket
            ? 'Finish up with Done shopping — it can log what you spent in Finance.'
            : 'Type what you need above, or tap something under Buy again.'}
        </p>
      </section>
    )
  }

  return (
    <section className="shopping-card shopping-list-card" aria-label="To get">
      {aisles.map((aisle) => {
        const look = categoryLook(aisle.category)
        const Icon = look.icon
        const left = aisle.toGet.filter((item) => !leaving.has(item.id)).length
        return (
          <div key={aisle.category} className="shopping-section" role="group" aria-label={look.label}>
            <header className="shopping-section-head">
              <span className="shopping-section-icon" style={categoryTone(look, '2e')} aria-hidden="true">
                <Icon size={13} strokeWidth={2.4} />
              </span>
              <h2>{look.label}</h2>
              <span className="shopping-count">{left}</span>
            </header>
            <ul className="shopping-rows">
              {aisle.toGet.map((item) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  leaving={leaving.has(item.id)}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

export { GroceryList }
