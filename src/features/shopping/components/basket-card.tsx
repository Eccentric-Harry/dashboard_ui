import { useState } from 'react'
import { ChevronDown, ShoppingBasket } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ShoppingTally } from '@/lib/shopping'
import type { ShoppingItem } from '@/types/shopping'
import { categoryLook } from '../shopping-categories'
import { ShoppingRow } from './shopping-row'

interface BasketCardProps {
  items: ShoppingItem[]
  tally: ShoppingTally
  onToggle: (item: ShoppingItem) => void
  onEdit: (item: ShoppingItem) => void
  onRemove: (item: ShoppingItem) => void
  onDone: () => void
}

const RADIUS = 19
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * The trip in progress: how far through the list you are, what's already in the basket (one tap
 * puts an item back), and "Done shopping", which empties it and can log the shop in Finance.
 */
function BasketCard({ items, tally, onToggle, onEdit, onRemove, onDone }: BasketCardProps) {
  const [open, setOpen] = useState(true)
  const empty = items.length === 0
  return (
    <section className="shopping-card shopping-basket" aria-label="Basket">
      <header className="shopping-basket-head">
        <div className="shopping-ring" role="img" aria-label={`${tally.inBasket} of ${tally.total} in the basket`}>
          <svg viewBox="0 0 46 46" width="46" height="46" aria-hidden="true">
            <circle className="shopping-ring-track" cx="23" cy="23" r={RADIUS} />
            <circle
              className="shopping-ring-fill"
              cx="23"
              cy="23"
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - tally.done)}
            />
          </svg>
          <ShoppingBasket size={16} strokeWidth={2.3} className="shopping-ring-glyph" />
        </div>
        <div className="shopping-basket-title">
          <h2>Basket</h2>
          <p>
            {tally.total === 0
              ? 'Tick items as you shop'
              : tally.toGet === 0
                ? `All ${tally.total} picked up`
                : `${tally.inBasket} of ${tally.total} picked up`}
          </p>
        </div>
        {!empty && (
          <button
            type="button"
            className="shopping-icon-btn"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? 'Hide basket items' : 'Show basket items'}
          >
            <ChevronDown size={15} strokeWidth={2.4} className={cn('shopping-chevron', open && 'is-open')} />
          </button>
        )}
      </header>

      {!empty && open && (
        <ul className="shopping-rows shopping-basket-rows">
          {items.map((item) => (
            <ShoppingRow
              key={item.id}
              item={item}
              inBasket
              aisleIcon={categoryLook(item.category).icon}
              onToggle={onToggle}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}

      <button type="button" className="shopping-done-btn" onClick={onDone} disabled={empty}>
        Done shopping
      </button>
    </section>
  )
}

export { BasketCard }
