// Money that moved but wasn't spent — sent home first, then lending and savings.
//
// The reason this card exists: sending money home was being logged as spending, so it
// inflated the budget, the category donut and every "where did it go" insight. Transfers
// now live here instead — they lower the balance, and nothing else.

import { useMemo, type CSSProperties } from 'react'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, HeartHandshake, Plus } from 'lucide-react'
import { FAMILY_CATEGORY, isTransferKind, type LedgerEntry } from '@/lib/finance-ledger'
import type { TransferSummary } from '@/lib/insights/finance'
import { cn } from '@/lib/utils'
import { getConsistentColor, getIconForCategory } from '../utils'

export interface LegacyBucket {
  category: string
  target: string
  direction: 'OUT' | 'IN'
  label: string
  total: number
  count: number
}

interface TransfersCardProps {
  /** The selected month's rows (every kind). */
  monthEntries: LedgerEntry[]
  summary: TransferSummary
  monthLabel: string
  legacy: LegacyBucket[]
  onLogTransfer: () => void
  onReclassify: (bucket: LegacyBucket) => void
  onShowAll: () => void
  stagger?: number
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const compact = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)))
const monthInitial = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' })
const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })

const ROW_LIMIT = 4

function TransfersCard({
  monthEntries,
  summary,
  monthLabel,
  legacy,
  onLogTransfer,
  onReclassify,
  onShowAll,
  stagger = 0,
}: TransfersCardProps) {
  const transfers = useMemo(() => monthEntries.filter((e) => isTransferKind(e.kind)), [monthEntries])
  const peak = Math.max(...summary.familyByMonth.map((m) => m.total), 1)
  const hasHistory = summary.familyByMonth.some((m) => m.total > 0)
  const other = transfers.filter((t) => t.category !== FAMILY_CATEGORY)
  const lentOut = other.filter((t) => t.kind === 'transfer-out').reduce((s, t) => s + t.amount, 0)
  const cameBack = transfers.filter((t) => t.kind === 'transfer-in').reduce((s, t) => s + t.amount, 0)
  const nudge = legacy[0]

  return (
    <section className="finance-card fin-transfers" style={{ '--i': stagger } as CSSProperties}>
      <div className="finance-section-head compact">
        <div>
          <span className="finance-eyebrow">Transfers</span>
          <h2>Sent home</h2>
          <p>
            {summary.familyCount > 0
              ? `${summary.familyCount} transfer${summary.familyCount === 1 ? '' : 's'} in ${monthLabel} · not counted as spending`
              : hasHistory
                ? `Nothing sent home in ${monthLabel} yet`
                : 'Money that moves, but isn’t spending'}
          </p>
        </div>
        <button type="button" className="fin-icon-btn" onClick={onLogTransfer} aria-label="Log a transfer" title="Log money sent home">
          <Plus size={15} strokeWidth={2.6} />
        </button>
      </div>

      {/* The well only earns its space once there's something to show — a ₹0 figure
          in a coloured panel was the loudest thing on the card and said nothing. */}
      {(summary.familyOut > 0 || hasHistory) && (
      <div className="fin-transfers-hero">
        <div className="fin-transfers-figure">
          <strong>{rupees(summary.familyOut)}</strong>
          <small>
            {summary.familyAvg != null
              ? `usual ${rupees(summary.familyAvg)}/month`
              : 'this month'}
          </small>
        </div>
        {hasHistory && (
          <div className="fin-transfers-bars" role="img" aria-label="Money sent home per month">
            {summary.familyByMonth.map((m, i) => {
              const current = i === summary.familyByMonth.length - 1
              return (
                <span key={m.monthKey} className={cn('fin-transfers-bar', current && 'is-current')} title={`${monthInitial(m.monthKey)}: ${rupees(m.total)}`}>
                  <i style={{ height: `${Math.max(m.total > 0 ? 8 : 3, (m.total / peak) * 100)}%` }} />
                  <em>{m.total > 0 ? compact(m.total) : '–'}</em>
                  <small>{monthInitial(m.monthKey)}</small>
                </span>
              )
            })}
          </div>
        )}
      </div>
      )}

      {nudge && (
        <div className="fin-nudge">
          <p>
            <b>{rupees(nudge.total)}</b> in “{nudge.category}” ({nudge.count} row{nudge.count === 1 ? '' : 's'}) is still
            counted as {nudge.direction === 'IN' ? 'income' : 'spending'} — it's money {nudge.label}.
          </p>
          <button type="button" onClick={() => onReclassify(nudge)}>
            Move to transfers <ArrowRight size={12} strokeWidth={2.6} />
          </button>
        </div>
      )}

      {transfers.length > 0 ? (
        <>
          <ul className="fin-transfer-list">
            {transfers.slice(0, ROW_LIMIT).map((t) => {
              const Icon = getIconForCategory(t.category)
              return (
                <li key={t.id || `${t.description}-${t.day}`} style={{ '--chip-hue': getConsistentColor(t.category) } as CSSProperties}>
                  <span className="fin-transfer-icon" aria-hidden="true">
                    <Icon size={13} strokeWidth={2.3} />
                  </span>
                  <span className="fin-transfer-main">
                    <b>{t.description}</b>
                    <small>{t.category} · {shortDate(t.day)}</small>
                  </span>
                  <strong className={cn('fin-transfer-amount', t.kind === 'transfer-in' && 'is-in')}>
                    {t.kind === 'transfer-in' ? <ArrowDownLeft size={11} strokeWidth={2.6} /> : <ArrowUpRight size={11} strokeWidth={2.6} />}
                    {rupees(t.amount)}
                  </strong>
                </li>
              )
            })}
          </ul>
          <div className="fin-transfers-foot">
            <span>
              {lentOut > 0 && `Lent/moved ${rupees(lentOut)}`}
              {lentOut > 0 && cameBack > 0 && ' · '}
              {cameBack > 0 && `back to you ${rupees(cameBack)}`}
            </span>
            {transfers.length > 0 && (
              <button type="button" onClick={onShowAll}>
                {transfers.length > ROW_LIMIT ? `All ${transfers.length}` : 'In ledger'} <ArrowRight size={11} strokeWidth={2.6} />
              </button>
            )}
          </div>
        </>
      ) : (
        !nudge && (
          <button type="button" className="fin-empty fin-empty--action fin-empty--compact" onClick={onLogTransfer}>
            <span className="fin-empty-glyph">
              <HeartHandshake size={18} strokeWidth={2.2} />
            </span>
            <span className="fin-empty-sub">
              Log money you send home as a <b>transfer</b>: it lowers your balance but never counts
              as spending or against your budget.
            </span>
          </button>
        )
      )}
    </section>
  )
}

export { TransfersCard }
