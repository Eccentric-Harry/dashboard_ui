import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Receipt, Repeat, Search, X } from 'lucide-react'
import { isTransferKind, signedAmount, type LedgerEntry, type TxKind } from '@/lib/finance-ledger'
import { cn } from '@/lib/utils'
import { getConsistentColor, getIconForCategory } from '../utils'

export type LedgerFilter = 'all' | 'spending' | 'income' | 'transfers'

interface TransactionsCardProps {
  /** The selected month's rows, newest first (every kind). */
  entries: LedgerEntry[]
  loading?: boolean
  onOpen?: (entry: LedgerEntry) => void
  /** Category picked on the Spending donut — shown as a removable chip, never silent. */
  categoryFilter?: string | null
  onClearCategory?: () => void
  filter: LedgerFilter
  onFilterChange: (filter: LedgerFilter) => void
  monthLabel: string
  /** Entrance-stagger index; drives the `--i` animation delay. */
  stagger?: number
}

const PAGE_SIZE = 12

const FILTERS: { key: LedgerFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'spending', label: 'Spending' },
  { key: 'income', label: 'Income' },
  { key: 'transfers', label: 'Transfers' },
]

const matchesFilter = (kind: TxKind, filter: LedgerFilter): boolean =>
  filter === 'all' ||
  (filter === 'spending' && kind === 'spending') ||
  (filter === 'income' && kind === 'income') ||
  (filter === 'transfers' && isTransferKind(kind))

const rupees = (n: number) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`

/** "−₹450" spending, "+₹85,000" income, "₹20,000" with an arrow for transfers. */
const amountLabel = (e: LedgerEntry): string =>
  e.kind === 'spending' ? `−${rupees(e.amount)}` : e.kind === 'income' ? `+${rupees(e.amount)}` : rupees(e.amount)

/**
 * "Today" / "Yesterday" / "Sat, Sep 26". Compared on local Y-M-D parts rather than by
 * differencing timestamps, which drifts across DST.
 */
const dayLabel = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1, d)
  const now = new Date()
  const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - date.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

type DayGroup = { key: string; label: string; net: number; rows: LedgerEntry[] }

/**
 * Groups a page by day *after* pagination, so every page is PAGE_SIZE rows tall and a
 * day straddling two pages repeats its header. The day total is its net cash change.
 */
const groupByDay = (rows: LedgerEntry[]): DayGroup[] => {
  const groups: DayGroup[] = []
  for (const row of rows) {
    let group = groups[groups.length - 1]
    if (!group || group.key !== row.day) {
      group = { key: row.day, label: dayLabel(row.day), net: 0, rows: [] }
      groups.push(group)
    }
    group.rows.push(row)
    group.net += signedAmount(row)
  }
  return groups
}

const formatNet = (net: number): string => `${net > 0 ? '+' : net < 0 ? '−' : ''}${rupees(net)}`

function TransactionsCard({
  entries,
  loading = false,
  onOpen,
  categoryFilter,
  onClearCategory,
  filter,
  onFilterChange,
  monthLabel,
  stagger = 0,
}: TransactionsCardProps) {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter(
      (e) =>
        matchesFilter(e.kind, filter) &&
        (!categoryFilter || e.category === categoryFilter) &&
        (!q || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || String(e.amount).includes(q)),
    )
  }, [entries, filter, categoryFilter, query])

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  // A filter can shrink the list under the current page — clamp instead of showing a blank page.
  const safePage = Math.min(page, totalPages)
  const paginated = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const groups = useMemo(() => groupByDay(paginated), [paginated])
  const narrowed = filter !== 'all' || Boolean(categoryFilter) || Boolean(query.trim())

  return (
    <section className="finance-card finance-transactions-card fin-ledger" style={{ '--i': stagger } as CSSProperties}>
      <div className="finance-section-head compact">
        <div>
          <span className="finance-eyebrow">Ledger</span>
          <h2>Transactions</h2>
          <p>
            {narrowed ? `${visible.length} of ${entries.length}` : entries.length} in {monthLabel}
          </p>
        </div>
        <label className="fin-ledger-search">
          <Search size={13} strokeWidth={2.4} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            aria-label="Search transactions"
          />
        </label>
      </div>

      <div className="fin-ledger-toolbar">
        <div className="fin-filter-tabs" role="tablist" aria-label="Transaction type">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={cn(filter === f.key && 'is-active')}
              onClick={() => { onFilterChange(f.key); setPage(1) }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {categoryFilter && (
          <button
            type="button"
            className="fin-filter-chip"
            style={{ '--chip-hue': getConsistentColor(categoryFilter) } as CSSProperties}
            onClick={onClearCategory}
            aria-label={`Clear ${categoryFilter} filter`}
          >
            {categoryFilter}
            <X size={11} strokeWidth={2.6} />
          </button>
        )}
      </div>

      <div className="finance-transaction-table" role="table" aria-label="Transactions">
        <div className="finance-transaction-list" role="rowgroup">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div className="fin-ledger-row is-skeleton" key={idx} role="row">
                <span className="skeleton-shimmer skeleton-circle" style={{ width: 30, height: 30 }} />
                <span style={{ flex: 1 }}>
                  <span className="skeleton-shimmer skeleton-rect" style={{ width: 130, height: 11 }} />
                  <span className="skeleton-shimmer skeleton-rect" style={{ width: 80, height: 8, marginTop: 6 }} />
                </span>
                <span className="skeleton-shimmer skeleton-rect" style={{ width: 56, height: 13 }} />
              </div>
            ))
          ) : paginated.length === 0 ? (
            <div className="fin-empty">
              <span className="fin-empty-glyph">
                <Receipt size={20} strokeWidth={2.2} />
              </span>
              <p className="fin-empty-title">{narrowed ? 'Nothing matches' : 'Nothing logged yet'}</p>
              <p className="fin-empty-sub">
                {narrowed
                  ? 'Try another filter or clear the search.'
                  : 'Add your first transaction and this ledger will start tracking your money, day by day.'}
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div className="fin-day-group" key={`${group.key}-${group.rows[0].id}`}>
                <div className="fin-day-head">
                  <span className="fin-day-label">{group.label}</span>
                  <span className={cn('fin-day-total', group.net > 0 && 'is-positive')}>{formatNet(group.net)}</span>
                </div>
                {group.rows.map((tx, index) => {
                  const Icon = getIconForCategory(tx.category)
                  const transfer = isTransferKind(tx.kind)
                  const editable = Boolean(tx.id) && Boolean(onOpen)
                  return (
                    <button
                      type="button"
                      className={cn('fin-ledger-row', `is-${tx.kind}`)}
                      key={tx.id || `${tx.description}-${index}`}
                      role="row"
                      disabled={!editable}
                      onClick={() => onOpen?.(tx)}
                      aria-label={`${tx.description}, ${amountLabel(tx)}${editable ? ', edit' : ''}`}
                      style={{ '--chip-hue': getConsistentColor(tx.category) } as CSSProperties}
                    >
                      <span className="fin-ledger-icon" aria-hidden="true">
                        <Icon size={14} strokeWidth={2.3} />
                      </span>
                      <span className="fin-ledger-main" role="cell">
                        <b>{tx.description || 'Untitled'}</b>
                        <small>
                          <em>{tx.category}</em>
                          {transfer && (
                            <span className="fin-ledger-tag">
                              {tx.kind === 'transfer-in' ? <ArrowDownLeft size={10} strokeWidth={2.6} /> : <ArrowUpRight size={10} strokeWidth={2.6} />}
                              {tx.kind === 'transfer-in' ? 'transfer in' : 'transfer'}
                            </span>
                          )}
                          {tx.subscriptionId && (
                            <span className="fin-ledger-tag">
                              <Repeat size={10} strokeWidth={2.6} /> bill
                            </span>
                          )}
                          {tx.time && <span className="fin-ledger-time">{tx.time}</span>}
                        </small>
                      </span>
                      <strong className="fin-ledger-amount" role="cell">{amountLabel(tx)}</strong>
                    </button>
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
