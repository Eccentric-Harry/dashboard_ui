import { useEffect, useState } from 'react'
import { Gift, Link2, Plus } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { inr } from '@/lib/insights/engine'
import { localToday } from '@/lib/finance-ledger'
import { cn } from '@/lib/utils'
import { coolingOff } from '@/lib/wishlist'
import type { AppPath } from '@/app/routes'
import type { WishlistItem } from '@/types/wishlist'
import { UndoBar } from '../components/undo-bar'
import { useFinanceGlance } from './use-finance-glance'
import { useWishlist } from './use-wishlist'
import { WishBuyModal } from './wish-buy-modal'
import { WishCard } from './wish-card'
import { WishClosed } from './wish-closed'
import { WishModal } from './wish-modal'

type Filter = 'all' | 'need' | 'ready' | 'saving'

interface WishlistViewProps {
  /** A link handed over from the grocery bar: opens the add dialog with it. */
  pendingLink: string | null
  onPendingConsumed: () => void
  onNavigate: (pathname: AppPath, search?: string) => void
}

function WishlistSkeleton() {
  return (
    <div className="wish-grid" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="wish-card is-skeleton">
          <div className="wish-photo shopping-skel-block" />
          <div className="wish-card-body">
            <div className="shopping-skel-line" />
            <div className="shopping-skel-line is-short" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The wishlist: product cards from any store, each with a photo linked from the store, the price
 * and how it has moved, and where it stands. Wants wait out a 30-day cooling-off before "time to
 * decide"; letting go is a first-class outcome (and what it kept in the bank is counted). "Bought
 * it" and "Save up for it" hand the money side to Finance.
 */
export function WishlistView({ pendingLink, onPendingConsumed, onNavigate }: WishlistViewProps) {
  const wl = useWishlist()
  const finance = useFinanceGlance()
  const today = localToday()
  const [filter, setFilter] = useState<Filter>('all')
  const [modal, setModal] = useState<{ wish: WishlistItem | null; link: string | null } | null>(null)
  const [buying, setBuying] = useState<WishlistItem | null>(null)
  const [saving, setSaving] = useState<WishlistItem | null>(null)
  const [deleting, setDeleting] = useState<WishlistItem | null>(null)
  const [emptyLink, setEmptyLink] = useState('')

  useEffect(() => {
    if (!pendingLink) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModal({ wish: null, link: pendingLink })
    onPendingConsumed()
  }, [pendingLink, onPendingConsumed])

  useEffect(() => {
    const open = () => setModal((current) => current ?? { wish: null, link: null })
    window.addEventListener('mobile-quick-add', open)
    return () => window.removeEventListener('mobile-quick-add', open)
  }, [])

  const counts = {
    all: wl.open.length,
    need: wl.open.filter((w) => w.priority === 'NEED').length,
    ready: wl.open.filter((w) => coolingOff(w, today)?.ready).length,
    saving: wl.open.filter((w) => w.savingsGoalId && finance.goalsById.has(w.savingsGoalId)).length,
  }
  const shown = wl.open.filter((w) =>
    filter === 'need'
      ? w.priority === 'NEED'
      : filter === 'ready'
        ? coolingOff(w, today)?.ready
        : filter === 'saving'
          ? w.savingsGoalId != null
          : true,
  )

  const openGoal = (goalId: string) => onNavigate('/finance', `?goal=${encodeURIComponent(goalId)}`)
  const { totals } = wl

  return (
    <div className="wish-view">
      <section className="shopping-card wish-summary">
        <div className="wish-stat">
          <span>On the list</span>
          <b>{totals.open}</b>
          <small>
            {totals.openValue > 0 ? inr(totals.openValue) : 'nothing priced yet'}
            {totals.unpriced > 0 && totals.openValue > 0 ? ` + ${totals.unpriced} unpriced` : ''}
          </small>
        </div>
        <div className="wish-stat">
          <span>Left this month</span>
          {finance.budgetLeft != null ? (
            <>
              <b>{inr(finance.budgetLeft)}</b>
              <small>of your {inr(finance.monthlyBudget ?? 0)} budget</small>
            </>
          ) : (
            <>
              <b className="is-muted">—</b>
              <button type="button" className="wish-stat-link" onClick={() => onNavigate('/finance')}>
                Set a budget in Finance
              </button>
            </>
          )}
        </div>
        <div className="wish-stat">
          <span>Let go</span>
          <b>{totals.letGo > 0 ? inr(totals.letGoValue) : '—'}</b>
          <small>{totals.letGo > 0 ? `not spent on ${totals.letGo} ${totals.letGo === 1 ? 'thing' : 'things'}` : 'nothing yet'}</small>
        </div>
        <button type="button" className="add-pill wish-add-pill" onClick={() => setModal({ wish: null, link: null })}>
          <span className="add-pill-ic" aria-hidden="true">
            <Plus size={14} strokeWidth={2.75} />
          </span>
          Add a wish
        </button>
      </section>

      {wl.open.length > 0 && (
        <div className="wish-filters" role="tablist" aria-label="Show">
          {(
            [
              ['all', 'All'],
              ['need', 'Needs'],
              ['ready', 'Time to decide'],
              ['saving', 'Saving for'],
            ] as [Filter, string][]
          )
            .filter(([key]) => key === 'all' || counts[key] > 0)
            .map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={filter === key} className={cn('wish-filter', filter === key && 'is-active')} onClick={() => setFilter(key)}>
                {label}
                <span>{counts[key]}</span>
              </button>
            ))}
        </div>
      )}

      {wl.loading ? (
        <WishlistSkeleton />
      ) : wl.failed ? (
        <section className="shopping-card shopping-list-card is-empty">
          <p className="shopping-empty-title">Couldn&rsquo;t load your wishlist</p>
          <button type="button" className="shopping-ghost-btn" onClick={() => void wl.reload()}>
            Retry
          </button>
        </section>
      ) : wl.open.length === 0 ? (
        <section className="shopping-card wish-empty">
          <span className="shopping-empty-icon" aria-hidden="true">
            <Gift size={20} strokeWidth={2.2} />
          </span>
          <p className="shopping-empty-title">Keep what you&rsquo;re thinking of buying here</p>
          <p className="shopping-empty-text">
            Paste a product link from any store. The photo stays on the store&rsquo;s site — only the link is saved. Wants wait 30
            days before it&rsquo;s time to decide.
          </p>
          <form
            className="wish-empty-form"
            onSubmit={(e) => {
              e.preventDefault()
              setModal({ wish: null, link: emptyLink.trim() || null })
              setEmptyLink('')
            }}
          >
            <Link2 size={14} strokeWidth={2.3} />
            <input value={emptyLink} onChange={(e) => setEmptyLink(e.target.value)} placeholder="https://www.decathlon.in/p/…" aria-label="Product link" />
            <button type="submit">Add</button>
          </form>
        </section>
      ) : (
        <div className="wish-grid">
          {shown.map((wish) => (
            <WishCard
              key={wish.id}
              wish={wish}
              goal={wish.savingsGoalId ? finance.goalsById.get(wish.savingsGoalId) : undefined}
              budgetLeft={finance.budgetLeft}
              today={today}
              onBuy={setBuying}
              onSaveFor={(w) => (w.price ? setSaving(w) : setModal({ wish: w, link: null }))}
              onOpenGoal={openGoal}
              onEdit={(w) => setModal({ wish: w, link: null })}
              onRefresh={wl.refresh}
              onLetGo={(w) => void wl.letGo(w)}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <WishClosed wishes={wl.closed} onReopen={(w) => void wl.reopen(w)} />

      <UndoBar undo={wl.undo} onUndo={() => void wl.applyUndo()} />

      <WishModal
        open={modal !== null}
        wish={modal?.wish ?? null}
        initialLink={modal?.link}
        onClose={() => setModal(null)}
        onPreview={wl.preview}
        onSave={(payload, id) => (id ? wl.update(id, payload) : wl.create(payload))}
        onDelete={(w) => {
          setModal(null)
          setDeleting(w)
        }}
      />
      <WishBuyModal
        wish={buying}
        goal={buying?.savingsGoalId ? finance.goalsById.get(buying.savingsGoalId) : undefined}
        budgetLeft={finance.budgetLeft}
        onClose={() => setBuying(null)}
        onBuy={wl.buy}
      />
      <ConfirmDialog
        open={saving !== null}
        tone="accent"
        title="Save up for it?"
        message={
          saving
            ? `Creates a "Saving for" goal in Finance — ${inr(saving.price ?? 0)} for ${saving.name}${saving.imageUrl ? ', with this photo' : ''}. You set the pace there.`
            : ''
        }
        confirmLabel="Start saving"
        onConfirm={() => {
          const wish = saving
          setSaving(null)
          if (wish) void wl.saveFor(wish)
        }}
        onCancel={() => setSaving(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete from wishlist"
        message={deleting ? `Delete "${deleting.name}"? To keep it in your history instead, let it go.` : ''}
        onConfirm={() => {
          const wish = deleting
          setDeleting(null)
          if (wish) void wl.remove(wish)
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
