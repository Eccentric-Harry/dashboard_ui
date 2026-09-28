 // The one place the client decides what a finance transaction *means*.
//
// Every card on /finance, the shared insights engine and Home read transactions
// through `flattenLogs` + `txKind`, so "spending" can never mean one thing on the
// donut and another on the budget ring. Mirrors backend `util/MoneyFlow.java` —
// keep the two in step (null type = spending; transfers are never spending or income).

import type {
  BudgetScope,
  DailyFinancialLog,
  FinancialTransaction,
  TransactionType,
  TransferDirection,
} from '@/types/finance'
import { isoDate } from '@/lib/insights/engine'

/** spending → counts toward the budget; transfer-* → moves the balance only. */
export type TxKind = 'spending' | 'income' | 'transfer-out' | 'transfer-in'

export interface LedgerEntry {
  /** Empty only for a row the server couldn't give an id (not editable). */
  id: string
  description: string
  amount: number
  category: string
  kind: TxKind
  type: TransactionType
  direction?: TransferDirection
  /** Local calendar day the row belongs to, 'YYYY-MM-DD'. */
  day: string
  /** Epoch ms of the logged time; NaN-safe (0 when unknown). */
  at: number
  /** Clock time ("09:14 PM"), or null when the row was stored at midnight (no real time). */
  time: string | null
  subscriptionId: string | null
}

export interface BudgetConfig {
  scope: BudgetScope
  fixedCategories: string[]
}

/** Categories treated as fixed costs under a FLEX budget (backend MoneyFlow.DEFAULT_FIXED_CATEGORIES). */
export const DEFAULT_FIXED_CATEGORIES = [
  'Rent',
  'Bills',
  'Bills & Utilities',
  'Utilities',
  'Subscriptions',
  'Insurance',
  'EMI',
]

/** The category money sent home is filed under. */
export const FAMILY_CATEGORY = 'Family'

/** Categories offered per kind in the add form (user history is merged in on top). */
export const SPENDING_CATEGORIES = [
  'Food', 'Groceries', 'Dining', 'Transport', 'Shopping', 'Rent', 'Bills',
  'Subscriptions', 'Health', 'Entertainment', 'Outing', 'Personal', 'Miscellaneous',
]
export const INCOME_CATEGORIES = ['Salary', 'Income', 'Refund', 'Gift']
export const TRANSFER_OUT_CATEGORIES = [FAMILY_CATEGORY, 'Lending', 'Savings', 'Investment', 'Card Payment']
export const TRANSFER_IN_CATEGORIES = ['Loan Recovery', FAMILY_CATEGORY, 'Savings', 'Investment']

/**
 * Buckets that were logged as spending before transfers existed but are really money
 * moved — surfaced as a one-tap "move to transfers" nudge, never converted silently.
 */
export const LEGACY_TRANSFER_BUCKETS: { category: string; target: string; direction: TransferDirection; label: string }[] = [
  { category: 'To Home', target: FAMILY_CATEGORY, direction: 'OUT', label: 'sent home' },
  { category: 'Sent Home', target: FAMILY_CATEGORY, direction: 'OUT', label: 'sent home' },
  { category: FAMILY_CATEGORY, target: FAMILY_CATEGORY, direction: 'OUT', label: 'sent home' },
  { category: 'Lending', target: 'Lending', direction: 'OUT', label: 'lent out' },
  { category: 'Loan Recovery', target: 'Loan Recovery', direction: 'IN', label: 'paid back to you' },
]

const INCOME_HINT = /income|salary/i

/** Legacy rows have no type; they were all spending unless the category says income. */
export function txKind(tx: Pick<FinancialTransaction, 'type' | 'direction'>, category: string): TxKind {
  const type = tx.type?.toLowerCase()
  if (type === 'transfer') return tx.direction === 'IN' ? 'transfer-in' : 'transfer-out'
  if (type === 'income') return 'income'
  if (type === 'expense') return 'spending'
  return INCOME_HINT.test(category) ? 'income' : 'spending'
}

export const isTransferKind = (kind: TxKind): boolean => kind === 'transfer-out' || kind === 'transfer-in'

/** + for money in, − for money out — how a row moves the balance. */
export const signedAmount = (entry: Pick<LedgerEntry, 'kind' | 'amount'>): number =>
  entry.kind === 'income' || entry.kind === 'transfer-in' ? entry.amount : -entry.amount

/** Today as a local 'YYYY-MM-DD' — never `toISOString()`, which is the UTC day (wrong 00:00–05:30 IST). */
export const localToday = (): string => isoDate(new Date())

/**
 * The local day a log holds. `dateString` is authoritative; `date` is the Instant of the
 * day's first transaction, so slicing it gives the UTC day — a 1 AM IST payment would land
 * on the previous day (and in the previous month on the 1st).
 */
export function logDay(log: Pick<DailyFinancialLog, 'dateString' | 'date'>): string {
  if (log.dateString) return log.dateString
  if (/^\d{4}-\d{2}-\d{2}$/.test(log.date)) return log.date
  const parsed = new Date(log.date)
  return Number.isNaN(parsed.getTime()) ? log.date.slice(0, 10) : isoDate(parsed)
}

const clockTime = (at: Date): string | null =>
  Number.isNaN(at.getTime()) || (at.getHours() === 0 && at.getMinutes() === 0)
    ? null
    : at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const normalizeType = (kind: TxKind): TransactionType =>
  kind === 'income' ? 'Income' : kind === 'spending' ? 'Expense' : 'Transfer'

/** Every transaction across `logs`, newest first. */
export function flattenLogs(logs: DailyFinancialLog[]): LedgerEntry[] {
  const out: LedgerEntry[] = []
  for (const log of logs) {
    const day = logDay(log)
    for (const [category, txs] of Object.entries(log.transactions ?? {})) {
      for (const tx of txs ?? []) {
        const kind = txKind(tx, category)
        const at = new Date(tx.timestamp)
        out.push({
          id: tx.id ?? '',
          description: tx.description ?? '',
          amount: Number(tx.amount) || 0,
          category,
          kind,
          type: normalizeType(kind),
          direction: isTransferKind(kind) ? (kind === 'transfer-in' ? 'IN' : 'OUT') : undefined,
          day,
          at: Number.isNaN(at.getTime()) ? 0 : at.getTime(),
          time: clockTime(at),
          subscriptionId: tx.subscriptionId ?? null,
        })
      }
    }
  }
  return out.sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at || b.id.localeCompare(a.id))
}

export const entriesInMonth = (entries: LedgerEntry[], monthKey: string): LedgerEntry[] =>
  entries.filter((e) => e.day.startsWith(monthKey))

// ---------- Budget coverage ----------

export function budgetConfigOf(account?: { budgetScope?: BudgetScope; fixedCategories?: string[] } | null): BudgetConfig {
  return {
    scope: account?.budgetScope === 'FLEX' ? 'FLEX' : 'ALL',
    fixedCategories: account?.fixedCategories ?? DEFAULT_FIXED_CATEGORIES,
  }
}

const fixedSetOf = (config: BudgetConfig): Set<string> =>
  new Set(config.fixedCategories.map((c) => c.trim().toLowerCase()))

/** A fixed cost: a fixed category, or a payment against a recurring bill. */
export function isFixedEntry(entry: Pick<LedgerEntry, 'category' | 'subscriptionId'>, config: BudgetConfig): boolean {
  return Boolean(entry.subscriptionId) || fixedSetOf(config).has(entry.category.trim().toLowerCase())
}

/** Whether a row counts against the monthly budget. Only spending ever does. */
export function countsTowardBudget(entry: LedgerEntry, config: BudgetConfig): boolean {
  if (entry.kind !== 'spending') return false
  return config.scope === 'ALL' || !isFixedEntry(entry, config)
}

// ---------- Month summary ----------

export interface MoneySummary {
  /** All spending (transfers excluded). */
  spending: number
  /** Spending measured against the budget (= spending under ALL). */
  budgeted: number
  /** Fixed-cost spending (rent, bills, recurring payments). */
  fixed: number
  income: number
  transferOut: number
  transferIn: number
  /** Net change in cash: money in − money out, across every kind. */
  net: number
  count: number
  spendingCount: number
}

export function summarize(entries: LedgerEntry[], config: BudgetConfig): MoneySummary {
  const s: MoneySummary = {
    spending: 0, budgeted: 0, fixed: 0, income: 0, transferOut: 0, transferIn: 0, net: 0, count: 0, spendingCount: 0,
  }
  for (const e of entries) {
    s.count++
    s.net += signedAmount(e)
    if (e.kind === 'spending') {
      s.spending += e.amount
      s.spendingCount++
      if (countsTowardBudget(e, config)) s.budgeted += e.amount
      if (isFixedEntry(e, config)) s.fixed += e.amount
    } else if (e.kind === 'income') s.income += e.amount
    else if (e.kind === 'transfer-out') s.transferOut += e.amount
    else s.transferIn += e.amount
  }
  return s
}

/** Month keys present in the entries plus the current and selected months, newest first. */
export function monthOptions(entries: LedgerEntry[], ...always: string[]): [string, string][] {
  const keys = new Set<string>(always.filter(Boolean))
  for (const e of entries) keys.add(e.day.slice(0, 7))
  return [...keys]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => [
      key,
      new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    ])
}
