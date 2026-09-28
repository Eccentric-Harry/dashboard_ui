// Recurring bills & subscriptions: schedule maths, pure and unit-tested.
//
// A bill is an anchor due date plus an interval (1 MONTH, 28 DAYs, 1 YEAR…). Payments are
// ordinary ledger rows linked by `subscriptionId`, so "paid this cycle" is *derived* from the
// ledger rather than stored: delete a mistaken payment and the bill is due again, with no
// second flag to fall out of sync. (The old card decided "paid" by substring-matching the
// bill name against whatever month/category the ledger happened to be filtered to.)

import type { BillingUnit, SubscriptionDTO } from '@/types/finance'
import type { LedgerEntry } from '@/lib/finance-ledger'

export type BillState = 'paid' | 'due-today' | 'due-soon' | 'overdue' | 'upcoming' | 'unscheduled'

export interface BillStatus {
  state: BillState
  /** Next due date on or after today; null when the bill has no schedule at all. */
  nextDue: string | null
  /** Whole days from today to nextDue (0 = today). */
  daysUntil: number | null
  /** The most recent unpaid due date when overdue. */
  overdueSince: string | null
  daysOverdue: number | null
  /** Latest linked payment day. */
  lastPaid: string | null
  /** The payment rows linked to this bill, newest first. */
  payments: LedgerEntry[]
  cycleDays: number
}

const DAY_MS = 86_400_000
/** How close a due date has to be to count as "due soon". */
export const DUE_SOON_DAYS = 7

const parse = (iso: string): Date => new Date(`${iso}T00:00:00`)

const fmt = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Whole calendar days from a to b (DST-safe: both at local midnight, rounded). */
export const daysBetween = (a: string, b: string): number => Math.round((parse(b).getTime() - parse(a).getTime()) / DAY_MS)

export const unitOf = (sub: Pick<SubscriptionDTO, 'intervalUnit'>): BillingUnit => sub.intervalUnit ?? 'MONTH'
export const countOf = (sub: Pick<SubscriptionDTO, 'intervalCount'>): number => Math.max(1, sub.intervalCount ?? 1)

/** Approximate cycle length in days — used for payment windows, not for due dates. */
export function cycleDaysOf(unit: BillingUnit, count: number): number {
  switch (unit) {
    case 'DAY': return count
    case 'WEEK': return 7 * count
    case 'YEAR': return 365 * count
    default: return Math.round(30.4375 * count)
  }
}

/**
 * The k-th due date after the anchor (k may be negative). Month/year steps keep the
 * anchor's day-of-month, clamped to short months — a bill anchored on the 31st falls on
 * 30 Apr and 28/29 Feb, then returns to the 31st — rather than drifting as repeated
 * one-month additions would.
 */
export function dueDateAt(anchor: string, unit: BillingUnit, count: number, k: number): string {
  const a = parse(anchor)
  if (unit === 'DAY' || unit === 'WEEK') {
    const step = (unit === 'WEEK' ? 7 : 1) * count * k
    return fmt(new Date(a.getFullYear(), a.getMonth(), a.getDate() + step))
  }
  const months = (unit === 'YEAR' ? 12 : 1) * count * k
  const total = a.getMonth() + months
  const y = a.getFullYear() + Math.floor(total / 12)
  const m = ((total % 12) + 12) % 12
  const lastDay = new Date(y, m + 1, 0).getDate()
  return fmt(new Date(y, m, Math.min(a.getDate(), lastDay)))
}

/** Index of the first due date on or after `today`. */
function nextIndex(anchor: string, unit: BillingUnit, count: number, today: string): number {
  let k = Math.floor(daysBetween(anchor, today) / cycleDaysOf(unit, count)) - 1
  while (dueDateAt(anchor, unit, count, k) < today) k++
  while (k > -100000 && dueDateAt(anchor, unit, count, k - 1) >= today) k--
  return k
}

/** Normalised monthly cost (server value when present). */
export function monthlyCostOf(sub: SubscriptionDTO): number {
  if (sub.monthlyCost != null) return sub.monthlyCost
  const unit = unitOf(sub)
  const count = countOf(sub)
  return unit === 'MONTH' ? sub.cost / count : (sub.cost * 30.4375) / cycleDaysOf(unit, count)
}

export function cycleLabel(sub: Pick<SubscriptionDTO, 'intervalUnit' | 'intervalCount'>): string {
  const unit = unitOf(sub)
  const count = countOf(sub)
  if (count === 1) return { DAY: 'Daily', WEEK: 'Weekly', MONTH: 'Monthly', YEAR: 'Yearly' }[unit]
  if (unit === 'MONTH' && count === 3) return 'Quarterly'
  return `Every ${count} ${unit.toLowerCase()}s`
}

/**
 * Payments linked to a bill. Rows logged before payments carried `subscriptionId` are
 * matched by name ("Claude Code Pro Subscription" ↔ "Claude Code Pro") — only unlinked
 * spending rows, so one bill's payment can never be claimed by another.
 */
export function paymentsFor(sub: Pick<SubscriptionDTO, 'id' | 'name'>, entries: LedgerEntry[]): LedgerEntry[] {
  const name = sub.name.trim().toLowerCase()
  return entries
    .filter((e) => e.kind === 'spending')
    .filter((e) =>
      e.subscriptionId ? e.subscriptionId === sub.id : name.length >= 3 && e.description.toLowerCase().includes(name),
    )
    .sort((a, b) => b.day.localeCompare(a.day))
}

/**
 * Where a bill stands today. A payment counts toward the due date it is closest to: pay a
 * few days early or a few days late and it still settles that cycle.
 */
export function billStatus(sub: SubscriptionDTO, entries: LedgerEntry[], today: string): BillStatus {
  const unit = unitOf(sub)
  const count = countOf(sub)
  const cycleDays = cycleDaysOf(unit, count)
  const payments = paymentsFor(sub, entries).filter((p) => p.day <= today)
  const lastPaid = payments[0]?.day ?? null
  // No due date on file: infer the schedule from the last payment (Claude Code Pro, paid on
  // the 8th, is due again on the 8th) rather than showing nothing.
  const anchor = sub.billingDate ?? lastPaid
  const base = { payments, lastPaid, cycleDays, overdueSince: null, daysOverdue: null }

  if (!anchor) return { ...base, state: 'unscheduled', nextDue: null, daysUntil: null }

  const k = nextIndex(anchor, unit, count, today)
  const next = dueDateAt(anchor, unit, count, k)
  const prev = dueDateAt(anchor, unit, count, k - 1)
  const prevPrev = dueDateAt(anchor, unit, count, k - 2)
  const daysUntil = daysBetween(today, next)

  // Midpoints split the timeline into one payment window per due date.
  const mid = (a: string, b: string) => daysBetween(a, b) / 2
  const covers = (due: string, before: string, after: string) =>
    payments.some((p) => {
      const offset = daysBetween(due, p.day)
      return offset > -mid(before, due) && offset <= mid(due, after)
    })
  const nextPaid = covers(next, prev, dueDateAt(anchor, unit, count, k + 1))
  const prevPaid = covers(prev, prevPrev, next)
  // A due date before the anchor never existed (the anchor may be a future "renews on").
  const prevIsReal = prev >= anchor

  if (nextPaid) return { ...base, state: 'paid', nextDue: next, daysUntil }
  if (daysUntil === 0) return { ...base, state: 'due-today', nextDue: next, daysUntil }
  if (prevIsReal && !prevPaid && daysBetween(prev, today) <= mid(prev, next)) {
    return {
      ...base,
      state: 'overdue',
      nextDue: next,
      daysUntil,
      overdueSince: prev,
      daysOverdue: daysBetween(prev, today),
    }
  }
  if (daysUntil <= DUE_SOON_DAYS) return { ...base, state: 'due-soon', nextDue: next, daysUntil }
  if (prevPaid) return { ...base, state: 'paid', nextDue: next, daysUntil }
  return { ...base, state: 'upcoming', nextDue: next, daysUntil }
}

/** Whether a bill still needs paying before the end of `monthKey` (for safe-to-spend). */
export function stillDueInMonth(status: BillStatus, monthKey: string): boolean {
  if (status.state === 'overdue' || status.state === 'due-today') return true
  if (status.state === 'paid' || !status.nextDue) return false
  return status.nextDue.startsWith(monthKey)
}
