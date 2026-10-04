// "Plan & numbers" on a goal's showcase page, folded by default. One card, not three: short
// columns split by hairlines — the pace you'd set aside and when that makes it yours,
// whether it fits a typical month (one bar and one sentence instead of a five-row table),
// and the price — then every set-aside, once there are more than "Getting closer" shows. Each figure appears once, and
// there are no advice paragraphs (insight text on /finance goes unread).

import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ShoppingBag, Wallet } from 'lucide-react'
import type { LedgerEntry } from '@/lib/finance-ledger'
import { inr } from '@/lib/insights/engine'
import { landingDate, type GoalPlan, type MonthCapacity } from '@/lib/finance-goals'
import { cn } from '@/lib/utils'
import { compactInr, fullDate } from '../goal-copy'
import { Money } from './money'

interface GoalNumbersProps {
  plan: GoalPlan
  rows: LedgerEntry[]
  capacity: MonthCapacity
  /** Room left for this goal after the goals funded before it; null = take-home unknown. */
  room: number | null
  fundedBefore: number
  today: string
  payday: number
  open: boolean
  onToggle: () => void
  onAddIncome: () => void
  onSavePace: (patch: { targetDate?: string; plannedMonthly?: number }) => void
  onEdit: () => void
  onNewGoal: () => void
  onFundFirst: () => void
  onOpenEntry: (entry: LedgerEntry) => void
}

const needOf = (plan: GoalPlan): number => plan.monthlyNeed ?? plan.goal.plannedMonthly ?? 0

export function GoalNumbers(props: GoalNumbersProps) {
  const { plan, rows, open, onToggle, onOpenEntry, onNewGoal } = props
  const { goal } = plan
  const saving = plan.state !== 'bought' && plan.state !== 'ready' && plan.target != null
  const columns = (saving ? 2 : 0) + (goal.kind === 'PURCHASE' ? 1 : 0)
  const sorted = useMemo(() => [...rows].sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at), [rows])

  return (
    <section id="fin-goal-numbers" className={cn('finance-card fin-goal-numbers', open && 'is-open')} aria-label="Plan and numbers">
      <button type="button" className="fin-goal-numbers-toggle" aria-expanded={open} onClick={onToggle}>
        <span>
          <b>Plan & numbers</b>
          {!open && <small>{summary(plan, props.room)}</small>}
        </span>
        <ChevronDown size={16} strokeWidth={2.4} aria-hidden="true" />
      </button>

      {open && (
        <div className="fin-goal-numbers-body">
          {columns > 0 && (
            <div className="fin-goal-cols" style={{ '--cols': columns } as CSSProperties}>
              {saving && <PaceColumn {...props} />}
              {saving && <MonthColumn {...props} />}
              {goal.kind === 'PURCHASE' && <PriceColumn {...props} />}
            </div>
          )}

          {plan.state === 'bought' && (
            <div className="fin-goal-numbers-next">
              <p>
                {goal.contributions > 0
                  ? `You kept a ${inr(goal.setAside / goal.contributions)}-a-set-aside habit going. Point it at the next thing.`
                  : 'Saved and bought. Keep the habit — point it at the next thing.'}
              </p>
              <button type="button" className="fin-soft-btn is-small" onClick={onNewGoal}>
                Start the next goal
              </button>
            </div>
          )}

          {/* "Getting closer" already shows the latest three; the full list earns a place past that. */}
          {sorted.length > 3 && (
            <div className="fin-goal-numbers-list">
              <span className="fin-goal-col-label">
                Set-asides · {goal.contributions}
                {goal.takenOut > 0 && ` · ${inr(goal.takenOut)} taken out`}
              </span>
              <ul className="fin-goal-rows is-compact is-split">
                {sorted.map((r) => (
                  <GoalRow key={r.id || `${r.day}-${r.amount}`} r={r} onOpenEntry={onOpenEntry} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/** The folded line: the monthly figure and whether it fits, and the price. */
function summary(plan: GoalPlan, room: number | null): string {
  const bits: string[] = []
  const need = needOf(plan)
  if (plan.state === 'bought') {
    if (plan.goal.boughtFor != null) bits.push(`Paid ${inr(plan.goal.boughtFor)}`)
  } else if (need > 0 && plan.state !== 'ready') {
    bits.push(`${inr(need)} a month`)
    if (room != null) bits.push(need <= room ? 'fits' : `${inr(need - room)} short`)
  }
  if (plan.goal.kind === 'PURCHASE' && plan.state !== 'bought') bits.push(`price ${inr(plan.goal.listPrice ?? plan.target ?? 0)}`)
  return bits.join(' · ') || 'Pace, your month and the price'
}

// ── Pace ──────────────────────────────────────────────────────────────────────

function PaceColumn({ plan, today, payday, onSavePace }: GoalNumbersProps) {
  const { goal } = plan
  const remaining = plan.remaining ?? 0
  const base = Math.round(plan.monthlyNeed ?? goal.plannedMonthly ?? plan.pace ?? (remaining > 0 ? remaining / 6 : 5000))
  const max = Math.max(1000, Math.ceil(Math.max(remaining, base * 2) / 1000) * 1000)
  const step = max > 50000 ? 500 : 100
  const [monthly, setMonthly] = useState<number | null>(null)
  // Round the starting point *up*, so it never reads as landing later than the plan does.
  const value = monthly ?? Math.min(max, Math.max(step, Math.ceil(base / step) * step))
  const landing = useMemo(
    () => (remaining > 0 ? landingDate(remaining, value, today, payday, plan.thisCycle >= value) : today),
    [remaining, value, today, payday, plan.thisCycle],
  )
  const changed = monthly != null && Math.abs(value - base) >= step

  return (
    <div className="fin-goal-col fin-goal-pace">
      <span className="fin-goal-col-label">Pace</span>
      <p className="fin-goal-col-figure">
        <Money value={value} />
        <small>a month</small>
      </p>
      <p className="fin-goal-col-line">{landing ? <>Yours by <b>{fullDate(landing)}</b></> : 'Never at this pace'}</p>
      <input
        type="range"
        min={step}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setMonthly(Number(e.target.value))}
        aria-label="Amount to set aside each month"
      />
      <div className="fin-goal-col-foot">
        {changed && landing ? (
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
        ) : (
          <small>Drag to try another amount</small>
        )}
      </div>
    </div>
  )
}

// ── Your month ────────────────────────────────────────────────────────────────

function MonthColumn({ plan, capacity, room, fundedBefore, onAddIncome, onFundFirst }: GoalNumbersProps) {
  const need = needOf(plan)
  if (capacity.takeHome == null || room == null) {
    return (
      <div className="fin-goal-col">
        <span className="fin-goal-col-label">Your month</span>
        <button type="button" className="fin-goal-income-cta" onClick={onAddIncome}>
          <Wallet size={16} strokeWidth={2.2} />
          <span>
            <b>Add your take-home</b>
            <small>Then this shows whether {inr(need)} a month fits.</small>
          </span>
        </button>
      </div>
    )
  }

  const takeHome = capacity.takeHome
  const free = room - need
  // Whatever the month spends that isn't spending or money sent home (bills, say).
  const other = Math.max(0, takeHome - room - capacity.spending - capacity.sentHome - fundedBefore)
  const segments = [
    { key: 'spend', label: 'Spending', value: capacity.spending },
    { key: 'other', label: 'Bills', value: other },
    { key: 'home', label: 'Sent home', value: capacity.sentHome },
    { key: 'first', label: 'Other goals', value: fundedBefore },
    { key: 'goal', label: 'This goal', value: need },
  ].filter((s) => s.value >= 1)
  const scale = Math.max(takeHome, takeHome - free)

  return (
    <div className="fin-goal-col fin-goal-month">
      <span className="fin-goal-col-label">Your month</span>
      <p className={cn('fin-goal-col-verdict', free >= 0 ? 'is-good' : 'is-watch')}>
        {free >= 0 ? (
          <>
            Fits — <b>{inr(free)}</b> stays free
          </>
        ) : (
          <>
            <b>{inr(-free)}</b> short each month
          </>
        )}
      </p>
      <div className="fin-goal-month-bar" role="img" aria-label={segments.map((s) => `${s.label} ${inr(s.value)}`).join(', ')}>
        {segments.map((s) => (
          <i key={s.key} className={`is-${s.key}`} style={{ width: `${(s.value / scale) * 100}%` }} title={`${s.label} ${inr(s.value)}`} />
        ))}
        {free < 0 && <span className="fin-goal-month-limit" style={{ left: `${(takeHome / scale) * 100}%` }} title="Take-home" />}
      </div>
      <ul className="fin-goal-month-key">
        {segments.map((s) => (
          <li key={s.key}>
            <i className={`is-${s.key}`} aria-hidden="true" />
            {s.label} <b>{compactInr(s.value)}</b>
            {s.key === 'first' && (
              <button type="button" className="fin-text-btn" onClick={onFundFirst}>
                fund this first
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="fin-goal-col-foot">
        <small>
          Of {inr(takeHome)} take-home
          {capacity.monthsOfHistory < 2 && ' · sharpens as months fill in'} ·{' '}
          <button type="button" className="fin-text-btn" onClick={onAddIncome}>
            edit
          </button>
        </small>
      </div>
    </div>
  )
}

// ── Price ─────────────────────────────────────────────────────────────────────

function PriceColumn({ plan, onEdit }: GoalNumbersProps) {
  const { goal } = plan
  const list = goal.listPrice ?? plan.target ?? 0
  const offs = [
    { label: 'Old-phone exchange', value: goal.exchangeValue ?? 0 },
    { label: 'Card offer', value: goal.cardOffer ?? 0 },
  ].filter((o) => o.value > 0)
  const bought = plan.state === 'bought'

  return (
    <div className="fin-goal-col fin-goal-pricecol">
      <span className="fin-goal-col-label">
        {bought ? 'Paid' : 'Price'}
        {!bought && (
          <button type="button" className="fin-text-btn" onClick={onEdit}>
            edit
          </button>
        )}
      </span>
      <p className="fin-goal-col-figure">
        <Money value={bought ? goal.boughtFor ?? list : list} />
      </p>
      {bought ? (
        goal.boughtOn && <p className="fin-goal-col-line">On {fullDate(goal.boughtOn)}</p>
      ) : offs.length > 0 ? (
        <>
          <ul className="fin-goal-offs">
            {offs.map((o) => (
              <li key={o.label}>
                {o.label} <b>−{inr(o.value)}</b>
              </li>
            ))}
          </ul>
          <p className="fin-goal-col-line">
            You need <b>{inr(plan.target ?? list)}</b>
          </p>
        </>
      ) : (
        <p className="fin-goal-col-line">
          No exchange or card offer yet ·{' '}
          <button type="button" className="fin-text-btn" onClick={onEdit}>
            add one
          </button>
        </p>
      )}
    </div>
  )
}

// ── A ledger row ──────────────────────────────────────────────────────────────

export function GoalRow({ r, onOpenEntry }: { r: LedgerEntry; onOpenEntry: (entry: LedgerEntry) => void }) {
  const purchase = r.kind === 'spending'
  const out = r.kind === 'transfer-in'
  return (
    <li>
      <button type="button" onClick={() => onOpenEntry(r)} disabled={!r.id}>
        <span className={cn('fin-goal-row-ic', purchase ? 'is-buy' : out ? 'is-out' : 'is-in')} aria-hidden="true">
          {purchase ? <ShoppingBag size={13} strokeWidth={2.3} /> : out ? <ArrowDownLeft size={13} strokeWidth={2.4} /> : <ArrowUpRight size={13} strokeWidth={2.4} />}
        </span>
        <span className="fin-goal-row-main">
          <b>{r.description || (purchase ? 'Purchase' : out ? 'Taken out' : 'Set aside')}</b>
          <small>
            {fullDate(r.day)}
            {purchase && ` · ${r.category}`}
          </small>
        </span>
        <strong className={cn(purchase ? 'is-buy' : out ? 'is-out' : 'is-in')}>
          {purchase ? '' : out ? '−' : '+'}
          {inr(r.amount)}
        </strong>
      </button>
    </li>
  )
}
