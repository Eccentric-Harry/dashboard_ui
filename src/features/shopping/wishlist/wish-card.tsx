import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  Hourglass,
  MoreHorizontal,
  Pencil,
  PiggyBank,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Wind,
} from 'lucide-react'
import { inr } from '@/lib/insights/engine'
import { cn } from '@/lib/utils'
import { budgetFit, COOLING_OFF_DAYS, coolingOff, goalProgress, priceChange, storeHue } from '@/lib/wishlist'
import type { SavingsGoal } from '@/types/finance'
import type { WishlistItem } from '@/types/wishlist'

interface WishPhotoProps {
  wish: Pick<WishlistItem, 'imageUrl' | 'store' | 'name'>
  className?: string
}

/**
 * The product's photo, straight from the store's CDN — nothing is downloaded or kept. No
 * referrer is sent (some CDNs refuse hotlinks that carry one); a photo that won't load falls
 * back to the store's monogram, so a card never shows a broken image.
 */
export function WishPhoto({ wish, className }: WishPhotoProps) {
  const [failed, setFailed] = useState<string | null>(null)
  const src = wish.imageUrl && failed !== wish.imageUrl ? wish.imageUrl : null
  const hue = storeHue(wish.store)
  return (
    <span className={cn('wish-photo', !src && 'is-empty', className)} style={{ '--store-hue': hue } as CSSProperties}>
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(src)} />
      ) : (
        <span className="wish-photo-fallback" aria-hidden="true">
          <ShoppingBag size={26} strokeWidth={1.8} />
          {wish.store && <b>{wish.store}</b>}
        </span>
      )}
    </span>
  )
}

interface WishCardProps {
  wish: WishlistItem
  goal: SavingsGoal | undefined
  budgetLeft: number | null
  today: string
  onBuy: (wish: WishlistItem) => void
  onSaveFor: (wish: WishlistItem) => void
  onOpenGoal: (goalId: string) => void
  onEdit: (wish: WishlistItem) => void
  onRefresh: (wish: WishlistItem) => Promise<void>
  onLetGo: (wish: WishlistItem) => void
  onDelete: (wish: WishlistItem) => void
}

/**
 * One product: its photo and store, the price (and how it has moved since it was added), where
 * it stands — the 30-day cooling-off for wants, a savings jar once you're saving for it, whether
 * it fits what's left of this month's budget — and what you can do next.
 */
export function WishCard({ wish, goal, budgetLeft, today, onBuy, onSaveFor, onOpenGoal, onEdit, onRefresh, onLetGo, onDelete }: WishCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [menuOpen])

  const cooling = coolingOff(wish, today)
  const change = priceChange(wish)
  const fit = goal ? null : budgetFit(wish.price, budgetLeft)
  const target = goal ? goal.targetAmount ?? goal.listPrice : null
  const progress = goal ? goalProgress(goal.saved, target) : null

  const runMenu = (action: () => void) => () => {
    setMenuOpen(false)
    action()
  }

  return (
    <article className={cn('wish-card', menuOpen && 'is-menu-open', wish.priority === 'NEED' && 'is-need')}>
      <div className="wish-card-media">
        {wish.url ? (
          <a href={wish.url} target="_blank" rel="noopener noreferrer" className="wish-photo-link" aria-label={`Open ${wish.name} on ${wish.store ?? 'the store'}`}>
            <WishPhoto wish={wish} />
          </a>
        ) : (
          <WishPhoto wish={wish} />
        )}
        <span className="wish-store-chip" style={{ '--store-hue': storeHue(wish.store) } as CSSProperties}>
          <span className="wish-store-dot" aria-hidden="true">
            {(wish.store ?? '?').charAt(0).toUpperCase()}
          </span>
          {wish.store ?? 'Anywhere'}
        </span>
        {wish.priority === 'NEED' && <span className="wish-need-chip">Need</span>}
      </div>

      <div className="wish-card-body">
        <button type="button" className="wish-name" onClick={() => onEdit(wish)} title="Edit">
          {wish.name}
        </button>

        <div className="wish-price-row">
          {wish.price != null ? (
            <strong className="wish-price">{inr(wish.price)}</strong>
          ) : (
            <button type="button" className="wish-price is-missing" onClick={() => onEdit(wish)}>
              Add a price
            </button>
          )}
          {change && (
            <span className={cn('wish-change', `is-${change.direction}`)} title={`Was ${inr(wish.firstPrice ?? 0)} when you added it`}>
              {change.direction === 'down' ? <ArrowDownRight size={12} strokeWidth={2.6} /> : <ArrowUpRight size={12} strokeWidth={2.6} />}
              {inr(change.delta)}
            </span>
          )}
        </div>

        {wish.note && <p className="wish-note">{wish.note}</p>}

        <div className="wish-status">
          {goal && progress != null ? (
            <button type="button" className="wish-goal" onClick={() => onOpenGoal(goal.id)} title="Open in Finance">
              <span className="wish-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(progress * 100)}%` }} />
              </span>
              <span className="wish-status-text">
                <PiggyBank size={12} strokeWidth={2.4} /> {inr(goal.saved)} of {inr(target ?? 0)} saved
              </span>
            </button>
          ) : cooling ? (
            <div className={cn('wish-cooling', cooling.ready && 'is-ready')}>
              <span className="wish-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(cooling.progress * 100)}%` }} />
              </span>
              <span className="wish-status-text">
                <Hourglass size={12} strokeWidth={2.4} />
                {cooling.ready ? 'Still want it? Time to decide' : `Day ${cooling.days + 1} of ${COOLING_OFF_DAYS} · cooling off`}
              </span>
            </div>
          ) : null}
          {fit && (
            <span className={cn('wish-fit', `is-${fit}`)}>
              {fit === 'fits' ? 'Fits what’s left this month' : `${inr((wish.price ?? 0) - (budgetLeft ?? 0))} over this month’s budget`}
            </span>
          )}
        </div>
      </div>

      <footer className="wish-actions">
        <button type="button" className="wish-buy" onClick={() => onBuy(wish)}>
          <ShoppingBag size={13} strokeWidth={2.4} /> Bought it
        </button>
        {!goal && (
          <button type="button" className="wish-icon-btn is-wide-only" onClick={() => onSaveFor(wish)} title="Save up for it (creates a goal in Finance)" aria-label={`Save up for ${wish.name}`}>
            <PiggyBank size={15} strokeWidth={2.2} />
          </button>
        )}
        {wish.url && (
          <a className="wish-icon-btn is-wide-only" href={wish.url} target="_blank" rel="noopener noreferrer" title={`Open on ${wish.store ?? 'the store'}`} aria-label={`Open on ${wish.store ?? 'the store'}`}>
            <ExternalLink size={14} strokeWidth={2.2} />
          </a>
        )}
        <div className="wish-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="wish-icon-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More"
          >
            <MoreHorizontal size={15} strokeWidth={2.2} />
          </button>
          {menuOpen && (
            <div className="wish-menu" role="menu">
              {!goal && (
                <button type="button" role="menuitem" className="is-narrow-only" onClick={runMenu(() => onSaveFor(wish))}>
                  <PiggyBank size={13} strokeWidth={2.2} /> Save up for it
                </button>
              )}
              {wish.url && (
                <a role="menuitem" className="is-narrow-only" href={wish.url} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
                  <ExternalLink size={13} strokeWidth={2.2} /> Open on {wish.store ?? 'the store'}
                </a>
              )}
              <button type="button" role="menuitem" onClick={runMenu(() => onEdit(wish))}>
                <Pencil size={13} strokeWidth={2.2} /> Edit
              </button>
              {wish.url && (
                <button
                  type="button"
                  role="menuitem"
                  disabled={checking}
                  onClick={runMenu(() => {
                    setChecking(true)
                    void onRefresh(wish).finally(() => setChecking(false))
                  })}
                >
                  <RefreshCw size={13} strokeWidth={2.2} /> Check the price
                </button>
              )}
              <button type="button" role="menuitem" onClick={runMenu(() => onLetGo(wish))}>
                <Wind size={13} strokeWidth={2.2} /> Let it go
              </button>
              <button type="button" role="menuitem" className="is-danger" onClick={runMenu(() => onDelete(wish))}>
                <Trash2 size={13} strokeWidth={2.2} /> Delete
              </button>
            </div>
          )}
        </div>
      </footer>
      {checking && <span className="wish-checking" role="status">Checking the price…</span>}
    </article>
  )
}
