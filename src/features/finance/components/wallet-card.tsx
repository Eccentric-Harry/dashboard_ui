// Where the money stands — beside the spending hero on the first row.
//
// The balance is the card's one figure, with how much it moved this month. Under it,
// Copilot's "net this month": money in against money out as two capsules on one scale,
// the out capsule split into what was spent and what was only moved (sent home, lent) —
// transfers lower the balance but are never spending. Bills close the card as one row
// that jumps to the Bills card.

import type { CSSProperties } from 'react'
import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, Pencil, Repeat } from 'lucide-react'
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

interface WalletCardProps {
  balance: number | null
  summary: MoneySummary
  monthName: string
  bills: BillsGlance
  loading: boolean
  onEditBalance: () => void
  onJumpToBills: () => void
  stagger?: number
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })

function WalletCard({ balance, summary, monthName, bills, loading, onEditBalance, onJumpToBills, stagger = 0 }: WalletCardProps) {
  const moneyIn = summary.income + summary.transferIn
  const moneyOut = summary.spending + summary.transferOut
  const scale = Math.max(moneyIn, moneyOut, 1)
  const moved = moneyIn > 0 || moneyOut > 0

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
            {moved && (
              <span className={cn('fin-wallet-net', summary.net >= 0 ? 'is-up' : 'is-down')}>
                {summary.net >= 0 ? <ArrowUpRight size={12} strokeWidth={2.6} /> : <ArrowDownRight size={12} strokeWidth={2.6} />}
                {summary.net >= 0 ? '+' : '−'}
                {inr(Math.abs(summary.net))} in {monthName}
              </span>
            )}
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
              aria-label={`Spent ${inr(summary.spending)}, moved ${inr(summary.transferOut)}, kept ${inr(Math.max(summary.net, 0))}`}
            >
              <i className="is-spent" style={{ width: `${(summary.spending / scale) * 100}%` }} />
              {summary.transferOut > 0 && <i className="is-moved" style={{ width: `${(summary.transferOut / scale) * 100}%` }} />}
              {summary.net > 0 && <i className="is-kept" style={{ width: `${(summary.net / scale) * 100}%` }} />}
            </span>
            {moved ? (
              <p className="fin-flow-key">
                <span className="is-spent">Spent {inr(summary.spending)}</span>
                {summary.transferOut > 0 && <span className="is-moved">Moved {inr(summary.transferOut)}</span>}
                {summary.net > 0 && <span className="is-kept">Kept {inr(summary.net)}</span>}
                {moneyIn === 0 && <span>No income logged</span>}
              </p>
            ) : (
              <p className="fin-flow-key"><span>Nothing in or out yet this month</span></p>
            )}
          </div>

          {billState && (
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
