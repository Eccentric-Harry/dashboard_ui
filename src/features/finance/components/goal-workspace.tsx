// One savings goal, full page (`/finance?goal=<id>`) — deep content you work in gets its
// own view, not a sheet. Nutrition's grammar per card: an eyebrow, a serif finding line,
// one figure and one visual.
//
// - Hero: what's left to go and whether it's on pace, the saved figure, a progress
//   capsule with the plan's tick, the next set-aside, and the goal over time.
// - Plan: drag what you'd set aside each month and see where it lands; under it the
//   month's waterfall — take-home, a typical month of spending and money sent home, the
//   goals funded first — so "can I afford this pace?" has a real answer.
// - Money in this goal: every row that moved it, each one editable.
// - What it really costs (purchases): price, exchange, card offer, and a word on EMI.

import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, Lightbulb, Pencil, ShoppingBag, Wallet } from 'lucide-react'
import type { LedgerEntry } from '@/lib/finance-ledger'
import { inr } from '@/lib/insights/engine'
import {
  DAYS_PER_MONTH,
  KIND_LABEL,
  landingDate,
  nearAppleLaunch,
  shortDate,
  monthYear,
  type GoalColor,
  type GoalPlan,
  type MonthCapacity,
} from '@/lib/finance-goals'
import { cn } from '@/lib/utils'
import { findingLine, statusLine } from '../goal-copy'
import { goalIcon } from '../goal-icons'
import { GoalChart } from './goal-chart'
import { GoalJar } from './goal-jar'
import { Money } from './money'

interface GoalWorkspaceProps {
  plan: GoalPlan | null
  color: GoalColor
  /** This goal's ledger rows (all loaded months). */
  rows: LedgerEntry[]
  capacity: MonthCapacity
  /** Room left for this goal after the goals funded before it; null = take-home unknown. */
  room: number | null
  /** Goals funded before this one each month. */
  fundedBefore: number
  owed: number
  today: string
  payday: number
  paydayKnown: boolean
  loading: boolean
  onBack: () => void
  onEdit: () => void
  onSetAside: () => void
  onTakeOut: () => void
  onBuy: () => void
  onOpenEntry: (entry: LedgerEntry) => void
  onAddIncome: () => void
  /** Saves a new pace from the simulator: a new date, or a new monthly amount. */
  onSavePace: (patch: { targetDate?: string; plannedMonthly?: number }) => void
  /** After a purchase: start the next goal and keep the habit. */
  onNewGoal: () => void
  /** Move this goal to the front of the funding order. */
  onFundFirst: () => void
}

const fullDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })

function GoalWorkspace(props: GoalWorkspaceProps) {
  const { plan, color, loading, onBack } = props

  if (!plan) {
    return (
      <div className="fin-goal-ws">
        <div className="fin-goal-ws-bar">
          <button type="button" className="fin-goal-back" onClick={onBack}>
            <ChevronLeft size={16} strokeWidth={2.4} /> Finance
          </button>
        </div>
        <div className="finance-card fin-goal-missing">
          {loading ? (
            <span className="skeleton-rect skeleton-shimmer" style={{ width: '60%', height: 24 }} />
          ) : (
            <>
              <h2>That goal isn't here any more</h2>
              <p>It may have been archived. Your money in it is still in the ledger.</p>
              <button type="button" className="fin-soft-btn" onClick={onBack}>Back to finance</button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('fin-goal-ws', `fin-goal--${color}`)}>
      <div className="fin-goal-ws-bar">
        <button type="button" className="fin-goal-back" onClick={onBack}>
          <ChevronLeft size={16} strokeWidth={2.4} /> Finance
        </button>
        <span className="fin-goal-ws-spacer" aria-hidden="true" />
        <button type="button" className="fin-icon-btn" onClick={props.onEdit} aria-label="Edit goal" title="Edit goal">
          <Pencil size={13} strokeWidth={2.4} />
        </button>
      </div>

      <div className="finance-dashboard-grid fin-bento fin-goal-ws-grid">
        <GoalHero {...props} plan={plan} />
        <PlanCard {...props} plan={plan} />
        <HistoryCard {...props} plan={plan} />
        {plan.goal.kind === 'PURCHASE' && <PriceCard {...props} plan={plan} />}
      </div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function GoalHero({ plan, rows, today, payday, paydayKnown, onSetAside, onTakeOut, onBuy }: GoalWorkspaceProps & { plan: GoalPlan }) {
  const { goal } = plan
  const finding = findingLine(plan)
  const status = statusLine(plan)
  const tone = plan.state === 'behind' ? 'watch' : plan.state === 'paused' || plan.state === 'open' ? 'neutral' : 'good'
  const pct = plan.progress != null ? Math.round(plan.progress * 100) : null
  const pacePct = plan.expectedByNow != null && plan.target ? Math.min(100, (plan.expectedByNow / plan.target) * 100) : null
  const saving = plan.state !== 'bought' && plan.state !== 'paused'

  const meta: string[] = []
  if (plan.state === 'bought') {
    if (goal.boughtOn) meta.push(`Bought ${fullDate(goal.boughtOn)}`)
  } else {
    if (plan.monthlyNeed && plan.state !== 'ready') meta.push(`${inr(plan.monthlyNeed)} ${goal.targetDate ? 'each payday' : 'a month'}`)
    if (plan.paydaysLeft != null && plan.paydaysLeft > 0 && plan.state !== 'ready') {
      meta.push(`${plan.paydaysLeft} payday${plan.paydaysLeft === 1 ? '' : 's'} left`)
    }
    if (plan.projectedDate && plan.state !== 'ready') {
      meta.push(`${plan.paceSource === 'history' ? 'at your pace' : 'on this plan'}: ${monthYear(plan.projectedDate)}`)
    }
    if (!paydayKnown && saving) meta.push(`payday assumed the ${payday === 1 ? '1st' : payday}`)
  }

  return (
    <section className={cn('finance-card fin-goal-hero', `is-${tone}`)} style={{ '--i': 0 } as CSSProperties} aria-label={goal.name}>
      <header className="fin-goal-hero-top">
        <GoalJar icon={goalIcon(goal)} progress={plan.progress} size={44} stroke={4} />
        <div>
          <span className="finance-eyebrow">
            {KIND_LABEL[goal.kind]}
            {goal.keptAt && ` · kept at ${goal.keptAt}`}
          </span>
          <h1 className="fin-goal-hero-name">{goal.name}</h1>
        </div>
        <span className={cn('fin-goal-chip', `is-${status.tone}`)}>{plan.state === 'on-track' && plan.dueThisCycle >= 1 ? 'On track' : status.text.split(' · ')[0]}</span>
      </header>

      <h2 className="fin-hero-title fin-goal-finding">
        {finding.amount != null && <span className={cn('fin-hero-amount', `is-${tone}`)}>{inr(finding.amount)} </span>}
        {finding.text}
      </h2>

      <div className="fin-hero-figure">
        <div>
          <span className="fin-hero-label">{plan.state === 'bought' ? 'Paid' : 'Set aside'}</span>
          <strong>
            <Money value={plan.state === 'bought' ? goal.boughtFor ?? plan.saved : plan.saved} />
          </strong>
        </div>
        {plan.target != null && plan.state !== 'bought' && (
          <span className="fin-goal-of">
            of {inr(plan.target)}
            {pct != null && <b>{pct}%</b>}
          </span>
        )}
      </div>

      {plan.target != null && plan.state !== 'bought' && (
        <span className="fin-meter fin-goal-meter" role="img" aria-label={`${pct}% saved`}>
          <span className="fin-meter-track">
            <i className="fin-meter-fill" style={{ width: `${Math.min(100, (plan.progress ?? 0) * 100)}%` }} />
            {pacePct != null && pacePct > 0 && pacePct < 100 && <span className="fin-meter-pace" style={{ left: `${pacePct}%` }} title="Where the plan expects you" />}
          </span>
        </span>
      )}
      {meta.length > 0 && (
        <p className="fin-hero-meta">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </p>
      )}

      <div className="fin-goal-hero-actions">
        {plan.state === 'ready' && (
          <button type="button" className="fin-goal-primary" onClick={onBuy}>
            <ShoppingBag size={14} strokeWidth={2.4} /> Record the purchase
          </button>
        )}
        {saving && plan.state !== 'ready' && (
          <button type="button" className="fin-goal-primary" onClick={onSetAside}>
            <ArrowUpRight size={14} strokeWidth={2.4} />
            {plan.dueThisCycle >= 1 ? `Set aside ${inr(plan.dueThisCycle)}` : 'Set aside'}
          </button>
        )}
        {saving && plan.saved > 0 && (
          <button type="button" className="fin-soft-btn" onClick={onTakeOut}>
            <ArrowDownLeft size={13} strokeWidth={2.4} /> Take out
          </button>
        )}
        {saving && plan.state !== 'ready' && goal.kind !== 'SAFETY_NET' && (
          <button type="button" className="fin-soft-btn" onClick={onBuy}>
            <ShoppingBag size={13} strokeWidth={2.4} /> Bought it
          </button>
        )}
      </div>

      <div className="fin-goal-hero-chart">
        <GoalChart plan={plan} rows={rows} today={today} />
      </div>
    </section>
  )
}

// ── Plan: simulator + waterfall ──────────────────────────────────────────────

function PlanCard({
  plan,
  capacity,
  room,
  fundedBefore,
  owed,
  today,
  payday,
  onAddIncome,
  onSavePace,
  onNewGoal,
  onFundFirst,
}: GoalWorkspaceProps & { plan: GoalPlan }) {
  const { goal } = plan
  const remaining = plan.remaining ?? 0
  const base = Math.round(plan.monthlyNeed ?? goal.plannedMonthly ?? plan.pace ?? (remaining > 0 ? remaining / 6 : 5000))
  const max = Math.max(1000, Math.ceil(Math.max(remaining, base * 2) / 1000) * 1000)
  const step = max > 50000 ? 500 : 100
  const [monthly, setMonthly] = useState<number | null>(null)
  // Round the starting point *up*, so it never reads as landing later than the plan does.
  const value = monthly ?? Math.min(max, Math.max(step, Math.ceil(base / step) * step))
  const done = plan.state === 'bought' || plan.state === 'ready' || plan.target == null

  const landing = useMemo(
    () => (remaining > 0 ? landingDate(remaining, value, today, payday, plan.thisCycle >= value) : today),
    [remaining, value, today, payday, plan.thisCycle],
  )
  const need = plan.monthlyNeed ?? goal.plannedMonthly ?? 0
  const fits = room != null && need > 0 ? need <= room : null
  const atRoom = room != null && room > 0 && remaining > 0 ? landingDate(remaining, room, today, payday, false) : null
  const changed = monthly != null && Math.abs(value - base) >= step

  const levers: string[] = []
  if ((fits === false || plan.state === 'behind') && atRoom) levers.push(`At the ${inr(room ?? 0)} a month you can spare, it lands ${monthYear(atRoom)}.`)
  if (owed > 0 && plan.state !== 'bought') levers.push(`${inr(owed)} is owed to you — earmark it for ${goal.name} when it comes back.`)
  if (goal.kind === 'PURCHASE' && !goal.exchangeValue && !goal.cardOffer && plan.state !== 'bought') {
    levers.push('An old-phone exchange or a card offer brings the target down — add them to the price.')
  }
  if (nearAppleLaunch(goal, plan.projectedDate)) levers.push('That lands near Apple’s September launch — the current model usually gets cheaper right after.')

  return (
    <section className="finance-card fin-goal-plan" style={{ '--i': 1 } as CSSProperties} aria-label="Plan">
      <div className="finance-section-head compact">
        <div>
          <span className="finance-eyebrow">Plan</span>
          <h2>{done ? 'Your month' : 'Can I afford this pace?'}</h2>
        </div>
      </div>

      {!done && (
        <div className="fin-goal-sim">
          <div className="fin-goal-sim-read">
            <span>Set aside</span>
            <strong>{inr(value)}</strong>
            <em>a month → lands {landing ? <b>{fullDate(landing)}</b> : 'never at this pace'}</em>
          </div>
          <input
            type="range"
            min={step}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setMonthly(Number(e.target.value))}
            aria-label="Amount to set aside each month"
          />
          <div className="fin-goal-sim-foot">
            <small>
              {goal.targetDate ? `Your date: ${fullDate(goal.targetDate)} · needs ${inr(need)}/mo` : `Your plan: ${inr(need)}/mo`}
            </small>
            {changed && landing && (
              <button
                type="button"
                className="fin-soft-btn is-small"
                onClick={() => {
                  onSavePace(goal.targetDate ? { targetDate: landing } : { plannedMonthly: value })
                  setMonthly(null)
                }}
              >
                Make this the plan
              </button>
            )}
          </div>
        </div>
      )}

      {capacity.takeHome == null ? (
        <button type="button" className="fin-goal-income-cta" onClick={onAddIncome}>
          <Wallet size={16} strokeWidth={2.2} />
          <span>
            <b>Add your take-home</b>
            <small>Then this shows whether {inr(need || value)} a month fits after rent, bills, spending and money sent home.</small>
          </span>
        </button>
      ) : (
        <div className="fin-goal-waterfall">
          <dl>
            <div>
              <dt>
                Take-home
                <button type="button" className="fin-text-btn" onClick={onAddIncome}>
                  {capacity.takeHomeSource === 'logged' ? 'from your income · set' : 'edit'}
                </button>
              </dt>
              <dd>{inr(capacity.takeHome)}</dd>
            </div>
            <div>
              <dt>Spending in a typical month</dt>
              <dd>−{inr(capacity.spending)}</dd>
            </div>
            {capacity.sentHome > 0 && (
              <div>
                <dt>Sent home & lent</dt>
                <dd>−{inr(capacity.sentHome)}</dd>
              </div>
            )}
            {fundedBefore > 0 && (
              <div>
                <dt>
                  Goals funded first
                  <button type="button" className="fin-text-btn" onClick={onFundFirst}>
                    fund this first
                  </button>
                </dt>
                <dd>−{inr(fundedBefore)}</dd>
              </div>
            )}
            <div className="is-total">
              <dt>Room for {goal.name}</dt>
              <dd className={cn((room ?? 0) < 0 && 'is-short')}>{inr(room ?? 0)}</dd>
            </div>
          </dl>
          {!done && need > 0 && (
            <p className={cn('fin-goal-verdict', fits ? 'is-good' : 'is-watch')}>
              {fits
                ? `Fits — ${inr(need)} a month leaves ${inr((room ?? 0) - need)} free.`
                : (room ?? 0) <= 0
                  ? `Your typical month has no room left — something has to give, or the date moves.`
                  : `${inr(need - (room ?? 0))} a month more than you can spare.`}
            </p>
          )}
          {capacity.monthsOfHistory < 2 && (
            <small className="fin-form-hint">Based on {capacity.monthsOfHistory === 0 ? 'your budget' : 'one month'} so far — it sharpens as months fill in.</small>
          )}
        </div>
      )}

      {levers.length > 0 && (
        <ul className="fin-goal-levers">
          {levers.map((l) => (
            <li key={l}>
              <Lightbulb size={13} strokeWidth={2.2} aria-hidden="true" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
      {done && plan.state === 'ready' && (
        <p className="fin-goal-verdict is-good">You've saved all of it. Record the purchase when you buy — it won't touch your budget.</p>
      )}
      {plan.state === 'bought' && (
        <div className="fin-goal-next">
          <p>
            {goal.contributions > 0
              ? `You kept a ${inr(goal.setAside / goal.contributions)}-a-set-aside habit going. Keep it — point it at the next thing.`
              : 'Saved and bought. Keep the habit — point it at the next thing.'}
          </p>
          <button type="button" className="fin-soft-btn" onClick={onNewGoal}>
            Start the next goal
          </button>
        </div>
      )}
    </section>
  )
}

// ── Money in this goal ───────────────────────────────────────────────────────

function HistoryCard({ plan, rows, onOpenEntry }: GoalWorkspaceProps & { plan: GoalPlan }) {
  const sorted = [...rows].sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at)
  const wide = plan.goal.kind !== 'PURCHASE'
  return (
    <section className={cn('finance-card fin-goal-history', wide && 'is-wide')} style={{ '--i': 2 } as CSSProperties} aria-label="Money in this goal">
      <div className="finance-section-head compact">
        <div>
          <span className="finance-eyebrow">Ledger</span>
          <h2>Money in this goal</h2>
          <p>
            {plan.goal.contributions} set-aside{plan.goal.contributions === 1 ? '' : 's'}
            {plan.goal.takenOut > 0 && ` · ${inr(plan.goal.takenOut)} taken out`}
            {plan.goal.firstContributionDate && ` · since ${shortDate(plan.goal.firstContributionDate)}`}
          </p>
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className="fin-goal-empty">Nothing set aside yet. The first set-aside starts the line above.</p>
      ) : (
        <ul className="fin-goal-rows">
          {sorted.map((r) => {
            const purchase = r.kind === 'spending'
            const out = r.kind === 'transfer-in'
            return (
              <li key={r.id || `${r.day}-${r.amount}`}>
                <button type="button" onClick={() => onOpenEntry(r)} disabled={!r.id}>
                  <span className={cn('fin-goal-row-ic', purchase ? 'is-buy' : out ? 'is-out' : 'is-in')} aria-hidden="true">
                    {purchase ? <ShoppingBag size={13} strokeWidth={2.3} /> : out ? <ArrowDownLeft size={13} strokeWidth={2.4} /> : <ArrowUpRight size={13} strokeWidth={2.4} />}
                  </span>
                  <span className="fin-goal-row-main">
                    <b>{r.description || (purchase ? 'Purchase' : out ? 'Taken out' : 'Set aside')}</b>
                    <small>{fullDate(r.day)}{purchase && ` · ${r.category}`}</small>
                  </span>
                  <strong className={cn(purchase ? 'is-buy' : out ? 'is-out' : 'is-in')}>
                    {purchase ? '' : out ? '−' : '+'}
                    {inr(r.amount)}
                  </strong>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ── What it really costs ─────────────────────────────────────────────────────

function PriceCard({ plan, onEdit }: GoalWorkspaceProps & { plan: GoalPlan }) {
  const { goal } = plan
  const list = goal.listPrice ?? plan.target ?? 0
  const perDay = plan.monthlyNeed ? plan.monthlyNeed / DAYS_PER_MONTH : null
  return (
    <section className="finance-card fin-goal-price" style={{ '--i': 3 } as CSSProperties} aria-label="What it really costs">
      <div className="finance-section-head compact">
        <div>
          <span className="finance-eyebrow">Price</span>
          <h2>What it really costs</h2>
        </div>
        <button type="button" className="fin-icon-btn" onClick={onEdit} aria-label="Edit price" title="Edit price">
          <Pencil size={13} strokeWidth={2.4} />
        </button>
      </div>
      <dl className="fin-goal-price-list">
        <div>
          <dt>Price</dt>
          <dd>{inr(list)}</dd>
        </div>
        <div>
          <dt>Old-phone exchange</dt>
          <dd>{goal.exchangeValue ? `−${inr(goal.exchangeValue)}` : '—'}</dd>
        </div>
        <div>
          <dt>Card offer / cashback</dt>
          <dd>{goal.cardOffer ? `−${inr(goal.cardOffer)}` : '—'}</dd>
        </div>
        <div className="is-total">
          <dt>You need</dt>
          <dd>{inr(plan.target ?? list)}</dd>
        </div>
      </dl>
      <p className="fin-goal-note">
        Exchange value is usually the biggest lever — often worth more than any interest the savings earn.
        {perDay != null && ` Every ₹1,000 off the price is about ${Math.max(1, Math.round(1000 / perDay))} days sooner.`}
      </p>
      <p className="fin-goal-note">
        "No-cost" EMI isn't free: it often drops the cash discount, adds 18% GST on the interest part and a
        processing fee. Saving first keeps the discount.
      </p>
    </section>
  )
}

export { GoalWorkspace }
