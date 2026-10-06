import { useState } from 'react'
import { ChevronDown, RotateCcw } from 'lucide-react'
import { inr } from '@/lib/insights/engine'
import { cn } from '@/lib/utils'
import type { WishlistItem } from '@/types/wishlist'
import { WishPhoto } from './wish-card'

interface WishClosedProps {
  wishes: WishlistItem[]
  onReopen: (wish: WishlistItem) => void
}

const shortDate = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''

/** Bought and let go — the history, collapsed by default. Anything can go back on the list. */
export function WishClosed({ wishes, onReopen }: WishClosedProps) {
  const [open, setOpen] = useState(false)
  if (wishes.length === 0) return null
  return (
    <section className="shopping-card wish-closed" aria-label="Bought and let go">
      <button type="button" className="wish-closed-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <h2>Bought &amp; let go</h2>
        <span className="shopping-count">{wishes.length}</span>
        <ChevronDown size={15} strokeWidth={2.4} className={cn('shopping-chevron', open && 'is-open')} />
      </button>
      {open && (
        <ul className="wish-closed-list">
          {wishes.map((wish) => (
            <li key={wish.id} className="wish-closed-row">
              <WishPhoto wish={wish} className="is-mini" />
              <span className="wish-closed-main">
                <b>{wish.name}</b>
                <small>
                  {wish.status === 'BOUGHT'
                    ? `Bought ${shortDate(wish.boughtOn)}${wish.boughtFor != null ? ` for ${inr(wish.boughtFor)}` : ''}`
                    : `Let go ${shortDate(wish.closedAt)}${wish.price != null ? ` · ${inr(wish.price)} not spent` : ''}`}
                </small>
              </span>
              <span className={cn('wish-closed-tag', wish.status === 'BOUGHT' ? 'is-bought' : 'is-let-go')}>
                {wish.status === 'BOUGHT' ? 'Bought' : 'Let go'}
              </span>
              <button type="button" className="shopping-icon-btn" onClick={() => onReopen(wish)} aria-label={`Put ${wish.name} back on the wishlist`} title="Back on the wishlist">
                <RotateCcw size={13} strokeWidth={2.3} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
