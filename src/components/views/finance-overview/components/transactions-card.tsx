/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Receipt, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getConsistentColor } from '../utils'

export interface TransactionProp {
  id: string
  merchant: string
  detail: string
  category: string
  amount: string
  tone: 'income' | 'expense' | string
  icon: LucideIcon
  rawAmount: number
  rawDate: string
  rawType: string
}

interface TransactionsCardProps {
  transactions?: TransactionProp[]
  loading?: boolean
  onEdit?: (transaction: TransactionProp) => void
  onDelete?: (transaction: TransactionProp) => void
  /** Entrance-stagger index; drives the `--i` animation delay. */
  stagger?: number
}

const PAGE_SIZE = 12

export const getPastelBG = (colorHex: string) => {
  const hex = colorHex.toLowerCase()
  if (hex === '#4684ff') return '#e6f0ff'
  if (hex === '#ff6c61') return '#ffebee'
  if (hex === '#039855') return '#e6fcf0'
  if (hex === '#10b981') return '#e6faf4'
  if (hex === '#7a5af8') return '#f3e8ff'
  if (hex === '#0ba5ec') return '#ecf8ff'
  if (hex === '#f97316') return '#fff4e6'
  if (hex === '#dd2590') return '#fff0f6'
  if (hex === '#8b5cf6') return '#f7f4ff'
  if (hex === '#12b76a') return '#e6faf0'
  if (hex === '#32d583') return '#f0fdf4'

  try {
    const c = hex.replace('#', '')
    const r = parseInt(c.substring(0, 2), 16)
    const g = parseInt(c.substring(2, 4), 16)
    const b = parseInt(c.substring(4, 6), 16)
    const pr = Math.round(r * 0.08 + 255 * 0.92)
    const pg = Math.round(g * 0.08 + 255 * 0.92)
    const pb = Math.round(b * 0.08 + 255 * 0.92)
    return `rgb(${pr}, ${pg}, ${pb})`
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return '#f3f4f6'
  }
}

/**
 * "Today" / "Yesterday" / "Sat 2 Aug" for a day header.
 *
 * Compared on local Y-M-D parts rather than by differencing timestamps: a plain
 * `(a - b) / 86400000` calculation drifts across a DST boundary and can label
 * yesterday as today, which is exactly the kind of bug nobody notices until the
 * clocks change.
 */
const dayLabel = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso

  const date = new Date(y, m - 1, d)
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.round((startOfToday.getTime() - date.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

type DayGroup = {
  key: string
  label: string
  /** Net of the day: income counted up, expenses down. */
  net: number
  rows: TransactionProp[]
}

/**
 * Groups an already-sorted page of transactions by calendar day.
 *
 * Grouping happens *after* pagination on purpose — the page boundary stays a
 * fixed PAGE_SIZE rows, so pages don't jump around in height, and a day that straddles
 * two pages simply gets its header repeated. Grouping before pagination would
 * mean variable-length pages and a much more disruptive change to the control.
 */
const groupByDay = (rows: TransactionProp[]): DayGroup[] => {
  const groups: DayGroup[] = []

  rows.forEach((tx) => {
    const key = tx.rawDate
    let group = groups.find((g) => g.key === key)
    if (!group) {
      group = { key, label: dayLabel(key), net: 0, rows: [] }
      groups.push(group)
    }
    group.rows.push(tx)
    group.net += tx.tone === 'income' ? tx.rawAmount : -tx.rawAmount
  })

  return groups
}

const formatNet = (net: number): string => {
  const sign = net > 0 ? '+' : net < 0 ? '−' : ''
  return `${sign}₹${Math.abs(net).toLocaleString('en-IN')}`
}

function TransactionsCard({
  transactions = [],
  loading = false,
  onEdit,
  onDelete,
  stagger = 0,
}: TransactionsCardProps) {
  const [page, setPage] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE)

  // A category filter can shrink the list under the current page — without this
  // the card would render a blank page with no way back except paginating.
  const safePage = Math.min(page, Math.max(1, totalPages))
  const start = (safePage - 1) * PAGE_SIZE
  const paginated = transactions.slice(start, start + PAGE_SIZE)

  const groups = useMemo(() => groupByDay(paginated), [paginated])

  return (
    <section
      className="finance-card finance-transactions-card"
      style={{ '--i': stagger } as CSSProperties}
    >
      <div className="finance-section-head compact">
        <div>
          <span className="finance-eyebrow">Ledger</span>
          <h2>Recent Transactions</h2>
          <p>{transactions.length} transactions recorded</p>
        </div>
        <button
          className={`finance-transaction-action-btn ${isEditMode ? 'active' : ''}`}
          onClick={() => setIsEditMode(!isEditMode)}
          aria-label="Toggle edit mode"
          aria-pressed={isEditMode}
          style={{
            background: isEditMode ? 'rgba(20, 24, 22, 0.06)' : 'transparent',
            padding: '0',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minWidth: '32px',
            minHeight: '32px',
            border: 'none',
            boxShadow: 'none',
          }}
        >
          <Pencil size={14} strokeWidth={2.5} />
        </button>
      </div>
      <div className="finance-transaction-table" role="table" aria-label="Recent transactions">
        <div className="finance-transaction-row header" role="row">
          <span role="columnheader">Merchant</span>
          <span role="columnheader">Category</span>
          <span role="columnheader">Amount (INR)</span>
        </div>
        <div className="finance-transaction-list" role="rowgroup">
          {loading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <div className="finance-transaction-row" key={`loader-${idx}`} role="row" style={{ pointerEvents: 'none' }}>
                <div className="finance-transaction-merchant" role="cell">
                  <div className="skeleton-shimmer skeleton-circle" style={{ width: '30px', height: '30px', borderRadius: '50%' }} />
                  <div style={{ flex: 1, marginLeft: '11px' }}>
                    <div className="skeleton-shimmer skeleton-rect" style={{ width: '120px', height: '12px', borderRadius: '3px' }} />
                    <div className="skeleton-shimmer skeleton-rect" style={{ width: '60px', height: '8px', marginTop: '6px', borderRadius: '2px' }} />
                  </div>
                </div>
                <div className="finance-transaction-category" role="cell">
                  <div className="skeleton-shimmer skeleton-rect" style={{ width: '80px', height: '18px', borderRadius: '9999px' }} />
                </div>
                <div className="finance-transaction-amount-group" role="cell">
                  <div className="skeleton-shimmer skeleton-rect" style={{ width: '60px', height: '14px', borderRadius: '3px' }} />
                </div>
              </div>
            ))
          ) : paginated.length === 0 ? (
            <div className="fin-empty">
              <span className="fin-empty-glyph">
                <Receipt size={20} strokeWidth={2.2} />
              </span>
              <p className="fin-empty-title">Nothing logged yet</p>
              <p className="fin-empty-sub">
                Add your first transaction and this ledger will start tracking your
                spend, day by day.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div className="fin-day-group" key={group.key}>
                <div className="fin-day-head">
                  <span className="fin-day-label">{group.label}</span>
                  <span className={`fin-day-total${group.net > 0 ? ' is-positive' : ''}`}>
                    {formatNet(group.net)}
                  </span>
                </div>
                {group.rows.map((tx, index) => {
                  const { merchant, detail, category, amount, tone, icon: Icon } = tx
                  const accent = getConsistentColor(category)
                  return (
                    <div
                      className="finance-transaction-row"
                      key={tx.id || `${merchant}-${detail}-${index}`}
                      role="row"
                      style={{
                        '--row-accent': accent,
                        '--row-accent-soft': getPastelBG(accent),
                        '--row-accent-ink': accent,
                      } as CSSProperties}
                    >
                      <div className="finance-transaction-merchant" role="cell">
                        <span>
                          <Icon size={14} strokeWidth={2.3} />
                        </span>
                        <p>
                          <b>{merchant}</b>
                          <small>{detail}</small>
                        </p>
                      </div>
                      <div className="finance-transaction-category" role="cell">
                        <em>{category}</em>
                      </div>
                      <div className="finance-transaction-amount-group" role="cell">
                        <strong className={tone}>
                          {amount}
                        </strong>
                        {isEditMode && (
                          /* Hover/focus styling now lives in finance-playful.css.
                             This previously ran through onMouseEnter/onMouseLeave
                             handlers mutating element.style, which never fired for
                             keyboard users and couldn't carry the route's spring. */
                          <div className="finance-transaction-actions" style={{ gap: '6px' }}>
                            {onEdit && (
                              <button
                                type="button"
                                className="fin-row-action"
                                onClick={() => onEdit(tx)}
                                aria-label={`Edit ${merchant}`}
                              >
                                <Pencil size={12} />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                type="button"
                                className="fin-row-action is-danger"
                                onClick={() => onDelete(tx)}
                                aria-label={`Delete ${merchant}`}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
        {!loading && totalPages > 1 && (
          <div className="finance-pagination">
            <button
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
              className="pagination-btn"
              type="button"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="pagination-info">
              Page {safePage} of {totalPages}
            </span>
            <button
              disabled={safePage === totalPages}
              onClick={() => setPage(safePage + 1)}
              className="pagination-btn"
              type="button"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export { TransactionsCard }
