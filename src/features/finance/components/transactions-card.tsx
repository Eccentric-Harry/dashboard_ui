// The month's ledger, read like a journal rather than a table.
//
// Each day opens with a calendar leaf (today's is ink with a lime numeral, the add pill's
// signature) and its weekday in the header's italic serif, and carries a thin "print" of
// what it was spent on — the same category colours as the daily bars and the breakdown
// above, so a tall bar in the hero can be found again here at a glance. A dashed rail
// runs down from the leaf through the day's rows. Rows keep the category as a tinted
// chip (the add-transaction form's vocabulary) and bill payments show their brand mark.
//
// The toolbar is the form's segmented control, with counts, and a running total of
// whatever is showing (Copilot's search totals): search "Swiggy" and you see what Swiggy
// cost this month without adding it up.

import { createElement, useMemo, useState, type CSSProperties } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Receipt, Repeat, Search, X } from 'lucide-react'
import { isTransferKind, signedAmount, type LedgerEntry, type TxKind } from '@/lib/finance-ledger'
import { cn } from '@/lib/utils'
import { getBrandIcon, getSubColorStyles } from './bill-brand'
import { GOAL_ICONS, type GoalTag } from '../goal-icons'
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
  /** Savings goal names by id, for the tag on goal rows. */
  goalLabels?: GoalLabels
  /** Entrance-stagger index; drives the `--i` animation delay. */
  stagger?: number
}

const PAGE_SIZE = 14

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

/** "−₹450" spending, "+₹85,000" income, "₹20,000" (with an arrow) for transfers. */
const amountLabel = (e: LedgerEntry): string =>
  e.kind === 'spending' ? `−${rupees(e.amount)}` : e.kind === 'income' ? `+${rupees(e.amount)}` : rupees(e.amount)

const formatNet = (net: number): string => `${net > 0 ? '+' : net < 0 ? '−' : ''}${rupees(net)}`

/**
 * "Today" / "Yesterday" / null, compared on local Y-M-D parts rather than by differencing
 * timestamps, which drifts across DST.
 */
const relativeDay = (date: Date): string | null => {
  const now = new Date()
  const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - date.getTime()) / 86400000)
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : null
}

interface DayGroup {
  key: string
  date: Date
  net: number
  /** The day's spending by category, largest first — drawn as the day's print. */
  print: { category: string; amount: number }[]
  rows: LedgerEntry[]
}

/**
 * Groups a page by day *after* pagination, so every page is PAGE_SIZE rows tall and a
 * day straddling two pages repeats its leaf. The day total is its net cash change.
 */
const groupByDay = (rows: LedgerEntry[]): DayGroup[] => {
  const groups: DayGroup[] = []
  for (const row of rows) {
    let group = groups[groups.length - 1]
    if (!group || group.key !== row.day) {
      const [y, m, d] = row.day.split('-').map(Number)
      group = { key: row.day, date: new Date(y, (m || 1) - 1, d || 1), net: 0, print: [], rows: [] }
      groups.push(group)
    }
    group.rows.push(row)
    group.net += signedAmount(row)
    if (row.kind === 'spending') {
      const seg = group.print.find((p) => p.category === row.category)
      if (seg) seg.amount += row.amount
      else group.print.push({ category: row.category, amount: row.amount })
    }
  }
  for (const g of groups) g.print.sort((a, b) => b.amount - a.amount)
  return groups
}

/** Goal id → its name, icon and hue, for the tag on rows that moved money for a savings goal. */
type GoalLabels = Record<string, GoalTag>

function LedgerRow({ tx, onOpen, goalLabels }: { tx: LedgerEntry; onOpen?: (entry: LedgerEntry) => void; goalLabels?: GoalLabels }) {
  const hue = getConsistentColor(tx.category)
  const transfer = isTransferKind(tx.kind)
  const editable = Boolean(tx.id) && Boolean(onOpen)
  // Only bill payments get a brand mark: they're named after the bill, whereas a free-text
  // description ("Pineapple juice") would happily match a brand by accident.
  const brand = tx.subscriptionId ? getBrandIcon(tx.description) : null
  // Money moved for a savings goal wears the goal's own icon and hue, as a bill wears its brand.
  const goal = tx.goalId ? goalLabels?.[tx.goalId] : undefined

  return (
    <button
      type="button"
      className={cn('fin-lg-row', `is-${tx.kind}`)}
      disabled={!editable}
      onClick={() => onOpen?.(tx)}
      aria-label={`${tx.description || 'Untitled'}, ${tx.category}, ${amountLabel(tx)}${editable ? ', edit' : ''}`}
      style={{ '--chip-hue': hue } as CSSProperties}
    >
      {brand ? (
        <span className="fin-lg-icon is-brand" style={getSubColorStyles(tx.description, hue)} aria-hidden="true">
          {brand}
        </span>
      ) : goal ? (
        <span
          className={cn('fin-lg-icon', goal.color && `fin-goal--${goal.color}`)}
          style={{ '--chip-hue': 'var(--goal-hue)' } as CSSProperties}
          aria-hidden="true"
        >
          {createElement(GOAL_ICONS[goal.icon] ?? GOAL_ICONS.piggy, { size: 14, strokeWidth: 2.3 })}
        </span>
      ) : (
        <span className="fin-lg-icon" aria-hidden="true">
          {/* createElement, not a capitalised local: the category is data, and a component
              built during render trips react-hooks/static-components. */}
          {createElement(getIconForCategory(tx.category), { size: 14, strokeWidth: 2.3 })}
        </span>
      )}
      <span className="fin-lg-main">
        <b>{tx.description || 'Untitled'}</b>
        <small>
          <span className="fin-lg-cat">{tx.category}</span>
          {transfer && (
            <span className="fin-lg-tag">
              {tx.kind === 'transfer-in' ? <ArrowDownLeft size={10} strokeWidth={2.6} /> : <ArrowUpRight size={10} strokeWidth={2.6} />}
              {tx.kind === 'transfer-in' ? 'in' : 'transfer'}
            </span>
          )}
          {tx.subscriptionId && (
            <span className="fin-lg-tag is-bill">
              <Repeat size={9} strokeWidth={2.6} /> bill
            </span>
          )}
          {tx.goalId && <GoalLedgerTag tx={tx} goal={goalLabels?.[tx.goalId]} />}
          {tx.time && <span className="fin-lg-time">{tx.time}</span>}
        </small>
      </span>
      <strong className="fin-lg-amount">
        {transfer && (tx.kind === 'transfer-in' ? <ArrowDownLeft size={11} strokeWidth={2.6} /> : <ArrowUpRight size={11} strokeWidth={2.6} />)}
        {amountLabel(tx)}
      </strong>
    </button>
  )
}

/**
 * The goal a row belongs to. Set-asides already name their goal ("To Safety net"), so the
 * tag then just says it's goal money; a purchase made from a goal says so.
 */
function GoalLedgerTag({ tx, goal }: { tx: LedgerEntry; goal?: GoalTag }) {
  const named = goal != null && tx.description.includes(goal.name)
  const label = tx.kind === 'spending' ? 'from savings' : named || !goal ? 'goal' : goal.name
  return (
    <span className={cn('fin-lg-tag is-goal', goal?.color && `fin-goal--${goal.color}`)}>
      {goal && createElement(GOAL_ICONS[goal.icon] ?? GOAL_ICONS.piggy, { size: 10, strokeWidth: 2.6 })}
      {label}
    </span>
  )
}

function DayBlock({ group, onOpen, goalLabels }: { group: DayGroup; onOpen?: (entry: LedgerEntry) => void; goalLabels?: GoalLabels }) {
  const relative = relativeDay(group.date)
  const spent = group.print.reduce((sum, p) => sum + p.amount, 0)
  return (
    <section className={cn('fin-lg-day', relative === 'Today' && 'is-today')} aria-label={group.date.toDateString()}>
      <span className="fin-lg-leaf" aria-hidden="true">
        <b>{group.date.getDate()}</b>
        <small>{group.date.toLocaleDateString('en-US', { month: 'short' })}</small>
      </span>
      <div className="fin-lg-day-body">
        <header className="fin-lg-day-head">
          <span className="fin-lg-weekday">
            <strong>{group.date.toLocaleDateString('en-US', { weekday: 'long' })}</strong>
            {relative && <em>{relative}</em>}
          </span>
          <span className={cn('fin-lg-day-net', group.net > 0 && 'is-positive')}>{formatNet(group.net)}</span>
        </header>
        {spent > 0 && (
          <span className="fin-lg-print" role="img" aria-label={`Spent ${rupees(spent)}: ${group.print.map((p) => `${p.category} ${rupees(p.amount)}`).join(', ')}`}>
            {group.print.map((p) => (
              <i key={p.category} style={{ flexGrow: p.amount, '--seg': getConsistentColor(p.category) } as CSSProperties} />
            ))}
          </span>
        )}
        <div className="fin-lg-rows">
          {group.rows.map((tx, index) => (
            <LedgerRow key={tx.id || `${tx.description}-${index}`} tx={tx} onOpen={onOpen} goalLabels={goalLabels} />
          ))}
        </div>
      </div>
    </section>
  )
}

function TransactionsCard({
  entries,
  loading = false,
  onOpen,
  categoryFilter,
  onClearCategory,
  filter,
  onFilterChange,
  monthLabel,
  goalLabels,
  stagger = 0,
}: TransactionsCardProps) {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')

  // Search and the category chip narrow first; the tabs then split what's left, so each
  // tab's count answers "how many of *these*".
  const matching = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter(
      (e) =>
        (!categoryFilter || e.category === categoryFilter) &&
        (!q || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || String(e.amount).includes(q)),
    )
  }, [entries, categoryFilter, query])

  const counts = useMemo(() => {
    const c: Record<LedgerFilter, number> = { all: matching.length, spending: 0, income: 0, transfers: 0 }
    for (const e of matching) {
      if (e.kind === 'spending') c.spending++
      else if (e.kind === 'income') c.income++
      else c.transfers++
    }
    return c
  }, [matching])

  const visible = useMemo(() => matching.filter((e) => matchesFilter(e.kind, filter)), [matching, filter])

  const totals = useMemo(() => {
    let spent = 0
    let income = 0
    let moved = 0
    for (const e of visible) {
      if (e.kind === 'spending') spent += e.amount
      else if (e.kind === 'income') income += e.amount
      else moved += e.amount
    }
    return { spent, income, moved }
  }, [visible])

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  // A filter can shrink the list under the current page — clamp instead of showing a blank page.
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  const paginated = visible.slice(start, start + PAGE_SIZE)
  const groups = useMemo(() => groupByDay(paginated), [paginated])
  const narrowed = filter !== 'all' || Boolean(categoryFilter) || Boolean(query.trim())
  const filterIndex = FILTERS.findIndex((f) => f.key === filter)

  return (
    <section className="finance-card fin-lg" style={{ '--i': stagger } as CSSProperties}>
      <header className="finance-section-head compact fin-lg-head">
        <div>
          <span className="finance-eyebrow">Ledger</span>
          <h2>Transactions</h2>
          <p>
            {narrowed ? `${visible.length} of ${entries.length}` : entries.length} in {monthLabel}
          </p>
        </div>
        <label className="fin-lg-search">
          <Search size={13} strokeWidth={2.4} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search merchant, category, amount"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            aria-label="Search transactions"
          />
        </label>
      </header>

      <div className="fin-lg-toolbar">
        <div
          className="fin-seg fin-lg-seg"
          role="tablist"
          aria-label="Transaction type"
          style={{ '--seg-count': FILTERS.length, '--seg-i': filterIndex } as CSSProperties}
        >
          <span className="fin-seg-pill" aria-hidden="true" />
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
              <em>{counts[f.key]}</em>
            </button>
          ))}
        </div>
        {categoryFilter && (
          <button
            type="button"
            className="fin-lg-filter-chip"
            style={{ '--chip-hue': getConsistentColor(categoryFilter) } as CSSProperties}
            onClick={onClearCategory}
            aria-label={`Clear ${categoryFilter} filter`}
          >
            {categoryFilter}
            <X size={11} strokeWidth={2.6} />
          </button>
        )}
        {!loading && visible.length > 0 && (
          <dl className="fin-lg-totals" aria-label="Totals for what's showing">
            {totals.spent > 0 && (
              <div>
                <dt>Spent</dt>
                <dd>{rupees(totals.spent)}</dd>
              </div>
            )}
            {totals.income > 0 && (
              <div className="is-income">
                <dt>In</dt>
                <dd>+{rupees(totals.income)}</dd>
              </div>
            )}
            {totals.moved > 0 && (
              <div className="is-moved">
                <dt>Moved</dt>
                <dd>{rupees(totals.moved)}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {loading ? (
        <div className="fin-lg-days">
          {Array.from({ length: 2 }).map((_, g) => (
            <div className="fin-lg-day is-skeleton" key={g}>
              <span className="fin-lg-leaf skeleton-shimmer" />
              <div className="fin-lg-day-body">
                <span className="skeleton-shimmer skeleton-rect" style={{ width: 110, height: 12 }} />
                {Array.from({ length: 3 }).map((__, i) => (
                  <div className="fin-lg-row" key={i}>
                    <span className="fin-lg-icon skeleton-shimmer" />
                    <span className="fin-lg-main">
                      <span className="skeleton-shimmer skeleton-rect" style={{ width: 130, height: 11 }} />
                      <span className="skeleton-shimmer skeleton-rect" style={{ width: 80, height: 8 }} />
                    </span>
                    <span className="skeleton-shimmer skeleton-rect" style={{ width: 52, height: 12 }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
        <div className="fin-lg-days">
          {groups.map((group) => (
            <DayBlock key={`${group.key}-${group.rows[0].id}`} group={group} onOpen={onOpen} goalLabels={goalLabels} />
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <footer className="fin-lg-foot">
          <span>
            {start + 1}–{start + paginated.length} of {visible.length}
          </span>
          <div className="fin-lg-pager">
            <button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label="Newer transactions">
              <ChevronLeft size={15} strokeWidth={2.4} />
            </button>
            <b>
              {safePage} <small>/ {totalPages}</small>
            </b>
            <button type="button" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} aria-label="Older transactions">
              <ChevronRight size={15} strokeWidth={2.4} />
            </button>
          </div>
        </footer>
      )}
    </section>
  )
}

export { TransactionsCard }
