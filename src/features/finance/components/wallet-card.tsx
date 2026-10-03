// Where the money stands — beside the spending hero on the first row.
//
// The balance is the card's one figure, with how much it moved this month — and, once
// savings goals exist, how much sits set aside for them, so balance + set aside matches
// what the bank app shows. Under it, Copilot's "net this month": money in against money
// out on one bar, out split into what was spent, what was only moved (sent home, lent)
// and what was saved for a goal — transfers lower the balance but are never spending.
// The card's one well is the payday plan around payday (what each goal asks this
// cycle), and the bills row the rest of the month.

import type { CSSProperties } from 'react'
import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, Pencil, PiggyBank, Repeat } from 'lucide-react'
import type { MoneySummary } from '@/lib/finance-ledger'
import { inr } from '@/lib/insights/engine'
import { cn } from '@/lib/utils'
import { Money } from './money'

export interface BillsGlance {
  hasBills: boolean
  /** Still due this month (overdue included). */
  dueTotal: number
  dueCount: number
  /** The soonest unpaid bill, or the next renewal when everything is paid. */
  next: { name: string; date: string; overdue: boolean } | null
}

/** Savings goals as the wallet sees them. */
export interface GoalsGlance {
  /** Held across live goals (not yet spent). */
  setAside: number
  count: number
  /** This cycle's set-asides still to do; shown in the well around payday. */
  payday: { total: number; first: { name: string; amount: number; keptAt: string | null } | null; count: number } | null
}

interface WalletCardProps {
  balance: number | null
  summary: MoneySummary
  monthName: string
  bills: BillsGlance
  goals: GoalsGlance
  loading: boolean
  onEditBalance: () => void
  onJumpToBills: () => void
  onPaydayPlan: () => void
  stagger?: number
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })

function WalletCard({
  balance,
  summary,
  monthName,
  bills,
  goals,
  loading,
  onEditBalance,
  onJumpToBills,
  onPaydayPlan,
  stagger = 0,
}: WalletCardProps) {
  // Goal money netted on one side: a month that set aside more than it took back shows
  // "saved" going out; a month that drew a goal down (the purchase month) shows it coming in.
  const goalNet = summary.setAside - summary.takenOut
  const saved = Math.max(goalNet, 0)
  const fromGoals = Math.max(-goalNet, 0)
  const movedOut = summary.transferOut - summary.setAside
  const moneyIn = summary.income + (summary.transferIn - summary.takenOut) + fromGoals
  const moneyOut = summary.spending + movedOut + saved
  const scale = Math.max(moneyIn, moneyOut, 1)
  const moved = moneyIn > 0 || moneyOut > 0
  const kept = moneyIn - moneyOut

  const billState = !bills.next
    ? null
    : bills.next.overdue
      ? { title: `${inr(bills.dueTotal)} due`, note: `${bills.next.name} is overdue`, tone: 'over' }
      : bills.dueTotal > 0
        ? { title: `${inr(bills.dueTotal)} due`, note: `${bills.next.name} · ${shortDate(bills.next.date)}`, tone: 'watch' }
        : { title: 'All paid', note: `next ${bills.next.name} · ${shortDate(bills.next.date)}`, tone: 'good' }

  return (
    <section className="finance-card fin-wallet" style={{ '--i': stagger } as CSSProperties} aria-label="Wallet">
      <header className="fin-wallet-head">
        <span className="finance-eyebrow">Wallet</span>
        <button type="button" className="fin-icon-btn" onClick={onEditBalance} aria-label="Update balance" title="Update balance">
          <Pencil size={13} strokeWidth={2.4} />
        </button>
      </header>

      {loading ? (
        <div className="fin-wallet-body">
          <span className="skeleton-rect skeleton-shimmer" style={{ width: 170, height: 36 }} />
          <span className="skeleton-rect skeleton-shimmer" style={{ width: 130, height: 20, marginTop: 10, borderRadius: 999 }} />
          <span className="skeleton-rect skeleton-shimmer" style={{ width: '100%', height: 64, marginTop: 'auto', borderRadius: 12 }} />
        </div>
      ) : (
        <div className="fin-wallet-body">
          <div className="fin-wallet-balance">
            <span className="fin-hero-label">Balance</span>
            <strong>{balance == null ? '—' : <Money value={balance} sign={balance < 0 ? '−' : ''} />}</strong>
            <span className="fin-wallet-chips">
              {moved && (
                <span className={cn('fin-wallet-net', summary.net >= 0 ? 'is-up' : 'is-down')}>
                  {summary.net >= 0 ? <ArrowUpRight size={12} strokeWidth={2.6} /> : <ArrowDownRight size={12} strokeWidth={2.6} />}
                  {summary.net >= 0 ? '+' : '−'}
                  {inr(Math.abs(summary.net))} in {monthName}
                </span>
              )}
              {goals.setAside > 0 && (
                <span className="fin-wallet-net is-saved" title="Held for your savings goals — not in the balance above">
                  <PiggyBank size={12} strokeWidth={2.4} />
                  {inr(goals.setAside)} set aside
                </span>
              )}
            </span>
          </div>

          <div className="fin-flow">
            <dl className="fin-flow-stats">
              <div>
                <dt>Money in</dt>
                <dd>{inr(moneyIn)}</dd>
              </div>
              <div>
                <dt>Money out</dt>
                <dd>{inr(moneyOut)}</dd>
              </div>
            </dl>
            {/* One bar for the month's money: what was spent, what was only moved, and
                what was kept — out of whichever side is larger. */}
            <span
              className="fin-flow-track"
              role="img"
              aria-label={`Spent ${inr(summary.spending)}, moved ${inr(movedOut)}, saved ${inr(saved)}, kept ${inr(Math.max(kept, 0))}`}
            >
              <i className="is-spent" style={{ width: `${(summary.spending / scale) * 100}%` }} />
              {movedOut > 0 && <i className="is-moved" style={{ width: `${(movedOut / scale) * 100}%` }} />}
              {saved > 0 && <i className="is-saved" style={{ width: `${(saved / scale) * 100}%` }} />}
              {kept > 0 && <i className="is-kept" style={{ width: `${(kept / scale) * 100}%` }} />}
            </span>
            {moved ? (
              <p className="fin-flow-key">
                <span className="is-spent">Spent {inr(summary.spending)}</span>
                {movedOut > 0 && <span className="is-moved">Moved {inr(movedOut)}</span>}
                {saved > 0 && <span className="is-saved">Saved {inr(saved)}</span>}
                {kept > 0 && <span className="is-kept">Kept {inr(kept)}</span>}
                {moneyIn === 0 && <span>No income logged</span>}
              </p>
            ) : (
              <p className="fin-flow-key"><span>Nothing in or out yet this month</span></p>
            )}
          </div>

          {goals.payday?.first ? (
            <button type="button" className="fin-wallet-bills is-payday" onClick={onPaydayPlan}>
              <span className="fin-wallet-bills-ic" aria-hidden="true">
                <PiggyBank size={14} strokeWidth={2.3} />
              </span>
              <span className="fin-wallet-bills-main">
                <b>Payday · set aside {inr(goals.payday.total)}</b>
                <small>
                  {inr(goals.payday.first.amount)} to {goals.payday.first.name}
                  {goals.payday.first.keptAt && ` · ${goals.payday.first.keptAt}`}
                  {goals.payday.count > 1 && ` · ${goals.payday.count - 1} more`}
                </small>
              </span>
              <ChevronRight size={15} strokeWidth={2.4} aria-hidden="true" />
            </button>
          ) : billState && (
            <button type="button" className={cn('fin-wallet-bills', `is-${billState.tone}`)} onClick={onJumpToBills}>
              <span className="fin-wallet-bills-ic" aria-hidden="true">
                {billState.tone === 'good' ? <Check size={13} strokeWidth={2.8} /> : <Repeat size={13} strokeWidth={2.4} />}
              </span>
              <span className="fin-wallet-bills-main">
                <b>Bills · {billState.title}</b>
                <small>{billState.note}</small>
              </span>
              <ChevronRight size={15} strokeWidth={2.4} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export { WalletCard }
