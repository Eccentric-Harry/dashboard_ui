// "Saving for" — the savings goals, beside Bills: bills are what's owed, goals are what
// you're putting aside, so the row is about money already spoken for.
//
// Each goal is a jar row (its icon ringed by progress, one status line, what's saved of what
// it needs) with one action: set aside what this payday asks for, or buy it once it's
// ready. The whole row opens the goal's workspace. One quiet line at the foot carries the
// month's one useful nudge — last month's leftover to sweep in, what this month's
// overspend costs the lead goal, or asking for the take-home that makes the plan honest.

import { useState, type CSSProperties } from 'react'
import { ArrowRight, Check, ChevronDown, PiggyBank, Plus, ShoppingBag } from 'lucide-react'
import { inr } from '@/lib/insights/engine'
import { spanWords, type GoalColor, type GoalPlan, type LeftoverOffer } from '@/lib/finance-goals'
import { cn } from '@/lib/utils'
import { byAttention, compactInr, statusLine } from '../goal-copy'
import { goalIcon } from '../goal-icons'
import { GoalJar } from './goal-jar'
import type { WishlistItem } from '@/types/wishlist'

export type GoalNudge =
  | { kind: 'leftover'; offer: LeftoverOffer; plan: GoalPlan }
  | { kind: 'overspend'; over: number; days: number; plan: GoalPlan }
  | { kind: 'income' }

interface SavingForCardProps {
  plans: GoalPlan[]
  colors: Record<string, GoalColor>
  loading: boolean
  /** Still to set aside this pay cycle, across goals. */
  dueTotal: number
  nudge: GoalNudge | null
  onOpen: (goalId: string) => void
  onAdd: () => void
  onSetAside: (plan: GoalPlan, amount?: number, note?: string) => void
  onBuy: (plan: GoalPlan) => void
  onAddIncome: () => void
  /** A couple of priced wishes from /shopping that aren't goals yet. */
  wishes?: WishlistItem[]
  /** Every open wish, for "See all". */
  wishCount?: number
  onSaveForWish?: (wish: WishlistItem) => void
  onOpenWishlist?: () => void
  stagger?: number
}

const VISIBLE = 4

function SavingForCard({
  plans,
  colors,
  loading,
  dueTotal,
  nudge,
  onOpen,
  onAdd,
  onSetAside,
  onBuy,
  onAddIncome,
  wishes = [],
  wishCount = 0,
  onSaveForWish,
  onOpenWishlist,
  stagger = 0,
}: SavingForCardProps) {
  const [expanded, setExpanded] = useState(false)
  const rows = [...plans].sort(byAttention)
  const shown = expanded ? rows : rows.slice(0, VISIBLE)
  const hidden = rows.length - shown.length
  const savedTotal = plans.filter((p) => p.state !== 'bought').reduce((s, p) => s + p.saved, 0)

  return (
    <section className="finance-card fin-goals" style={{ '--i': stagger } as CSSProperties} aria-label="Saving for">
      <div className="finance-section-head compact">
        <div>
          <span className="finance-eyebrow">Goals</span>
          <h2>Saving for</h2>
          <p>
            {plans.length === 0 ? (
              'Name it, give it a date — see what each payday asks'
            ) : (
              <>
                <b className="fin-bills-total">{inr(savedTotal)}</b> set aside
                {dueTotal >= 1 ? ` · ${inr(dueTotal)} due this payday` : ' · nothing due this payday'}
              </>
            )}
          </p>
        </div>
        <div className="fin-bills-head-right">
          <button type="button" className="fin-icon-btn" onClick={onAdd} aria-label="New savings goal" title="New savings goal">
            <Plus size={15} strokeWidth={2.6} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="fin-goal-list">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="fin-goal-row is-skeleton">
              <span className="skeleton-circle skeleton-shimmer" style={{ width: 40, height: 40 }} />
              <span style={{ flex: 1 }}>
                <span className="skeleton-rect skeleton-shimmer" style={{ width: '45%', height: 11 }} />
                <span className="skeleton-rect skeleton-shimmer" style={{ width: '60%', height: 8, marginTop: 6 }} />
              </span>
              <span className="skeleton-rect skeleton-shimmer" style={{ width: 56, height: 26, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <button type="button" className="fin-empty fin-empty--action" onClick={onAdd}>
          <span className="fin-empty-glyph">
            <PiggyBank size={20} strokeWidth={2.2} />
          </span>
          <span className="fin-empty-title">Save for something</span>
          <span className="fin-empty-sub">
            A phone, a trip, a safety net. Set a price and a date — it works out what to set
            aside each payday and tells you honestly if it fits.
          </span>
        </button>
      ) : (
        <>
          <ul className="fin-goal-list">
            {shown.map((plan) => {
              const { goal } = plan
              const status = statusLine(plan)
              const saving = plan.state !== 'bought' && plan.state !== 'paused' && plan.state !== 'ready'
              return (
                <li key={goal.id} className={cn('fin-goal-row', `fin-goal--${colors[goal.id] ?? 'sage'}`, `is-${plan.state}`)}>
                  <button type="button" className="fin-goal-open" onClick={() => onOpen(goal.id)} aria-label={`Open ${goal.name}`}>
                    <GoalJar icon={goalIcon(goal)} progress={plan.progress} />
                    <span className="fin-goal-main">
                      <b>{goal.name}</b>
                      <small className={`is-${status.tone}`}>{status.text}</small>
                    </span>
                    <span className="fin-goal-figure">
                      <strong>{inr(plan.state === 'bought' ? goal.boughtFor ?? plan.saved : plan.saved)}</strong>
                      {plan.target != null && plan.state !== 'bought' && <small>of {inr(plan.target)}</small>}
                    </span>
                  </button>
                  {plan.state === 'ready' ? (
                    <button type="button" className="fin-goal-action is-buy" onClick={() => onBuy(plan)} title={`Record buying ${goal.name}`}>
                      <ShoppingBag size={12} strokeWidth={2.6} /> Buy
                    </button>
                  ) : plan.state === 'bought' ? (
                    <span className="fin-goal-action is-done" aria-label="Bought">
                      <Check size={13} strokeWidth={2.8} />
                    </span>
                  ) : saving ? (
                    <button
                      type="button"
                      className={cn('fin-goal-action', plan.dueThisCycle >= 1 && 'is-due')}
                      onClick={() => onSetAside(plan, plan.dueThisCycle >= 1 ? Math.round(plan.dueThisCycle) : undefined)}
                      title={plan.dueThisCycle >= 1 ? `Set aside ${inr(plan.dueThisCycle)} for ${goal.name}` : `Set money aside for ${goal.name}`}
                    >
                      <Plus size={12} strokeWidth={2.8} />
                      {plan.dueThisCycle >= 1 ? compactInr(plan.dueThisCycle) : 'Add'}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
          {hidden > 0 && (
            <button type="button" className="fin-legend-more" onClick={() => setExpanded(true)}>
              {hidden} more <ChevronDown size={12} strokeWidth={2.6} />
            </button>
          )}
        </>
      )}

      {!loading && wishCount > 0 && onOpenWishlist && (
        <div className="fin-wish-strip">
          <div className="fin-wish-head">
            <span>From your wishlist</span>
            <button type="button" onClick={onOpenWishlist}>
              {wishCount === 1 ? 'Open it' : `See all ${wishCount}`} <ArrowRight size={11} strokeWidth={2.6} />
            </button>
          </div>
          {wishes.length > 0 && (
            <ul className="fin-wish-list">
              {wishes.map((wish) => (
                <li key={wish.id} className="fin-wish-row">
                  <WishThumb wish={wish} />
                  <span className="fin-wish-main">
                    <b>{wish.name}</b>
                    <small>
                      {inr(wish.price ?? 0)}
                      {wish.store ? ` · ${wish.store}` : ''}
                    </small>
                  </span>
                  {onSaveForWish && (
                    <button
                      type="button"
                      className="fin-goal-action"
                      onClick={() => onSaveForWish(wish)}
                      title={`Start a goal for ${wish.name}`}
                    >
                      <PiggyBank size={12} strokeWidth={2.6} /> Save up
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!loading && nudge && <GoalNudgeLine nudge={nudge} onSetAside={onSetAside} onAddIncome={onAddIncome} />}
    </section>
  )
}

/** A wish's photo, linked from the store (never stored) — or a bag when there is none or it won't load. */
function WishThumb({ wish }: { wish: WishlistItem }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="fin-wish-thumb" aria-hidden="true">
      {wish.imageUrl && !failed ? (
        <img src={wish.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <ShoppingBag size={15} strokeWidth={2.2} />
      )}
    </span>
  )
}

function GoalNudgeLine({
  nudge,
  onSetAside,
  onAddIncome,
}: {
  nudge: GoalNudge
  onSetAside: SavingForCardProps['onSetAside']
  onAddIncome: () => void
}) {
  if (nudge.kind === 'leftover') {
    const { offer, plan } = nudge
    return (
      <div className="fin-goal-nudge is-good">
        <p>
          <b>{inr(offer.amount)}</b> left under budget in {offer.monthName}.
        </p>
        <button type="button" onClick={() => onSetAside(plan, offer.amount, offer.note)}>
          Move to {plan.goal.name}
        </button>
      </div>
    )
  }
  if (nudge.kind === 'overspend') {
    return (
      <div className="fin-goal-nudge">
        <p>
          This month's {inr(nudge.over)} over budget ≈ <b>{spanWords(nudge.days)}</b> of {nudge.plan.goal.name} saving.
        </p>
      </div>
    )
  }
  return (
    <div className="fin-goal-nudge">
      <p>Add your take-home to see whether these plans fit.</p>
      <button type="button" onClick={onAddIncome}>Add pay</button>
    </div>
  )
}

export { SavingForCard }
