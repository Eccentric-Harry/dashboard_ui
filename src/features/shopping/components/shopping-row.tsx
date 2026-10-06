import { Check, Pencil, Trash2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ShoppingItem } from '@/types/shopping'

interface ShoppingRowProps {
  item: ShoppingItem
  /** Mid-flight "just ticked" state: struck through and fading before it moves to the basket. */
  leaving?: boolean
  /** Basket rows are muted and tick back onto the list. */
  inBasket?: boolean
  /** The aisle's icon, shown at the end of a basket row so a flat list still says where it came from. */
  aisleIcon?: LucideIcon
  onToggle: (item: ShoppingItem) => void
  onEdit: (item: ShoppingItem) => void
  onRemove: (item: ShoppingItem) => void
}

function ShoppingRow({ item, leaving = false, inBasket = false, aisleIcon: AisleIcon, onToggle, onEdit, onRemove }: ShoppingRowProps) {
  const done = inBasket || leaving
  return (
    <li className={cn('shopping-row', done && 'is-done', leaving && 'is-leaving')}>
      <button
        type="button"
        className="shopping-row-main"
        onClick={() => onToggle(item)}
        aria-pressed={item.checked}
        aria-label={inBasket ? `Put ${item.name} back on the list` : `Mark ${item.name} as bought`}
      >
        <span className="shopping-check" aria-hidden="true">
          <Check size={12} strokeWidth={3.2} />
        </span>
        <span className="shopping-row-text">
          <span className="shopping-row-name">{item.name}</span>
          {item.note && <span className="shopping-row-note">{item.note}</span>}
        </span>
        {item.quantity && <span className="shopping-qty">{item.quantity}</span>}
        {AisleIcon && <AisleIcon size={12} strokeWidth={2.3} className="shopping-row-aisle" aria-hidden="true" />}
      </button>
      <span className="shopping-row-actions">
        <button type="button" className="shopping-icon-btn" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}>
          <Pencil size={13} strokeWidth={2.2} />
        </button>
        <button type="button" className="shopping-icon-btn is-danger" onClick={() => onRemove(item)} aria-label={`Remove ${item.name}`}>
          <Trash2 size={13} strokeWidth={2.2} />
        </button>
      </span>
    </li>
  )
}

export { ShoppingRow }
