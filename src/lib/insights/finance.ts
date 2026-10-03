// Finance rules for the shared insights engine. Reads the daily finance logs,
// budget, subscriptions, lending, and repayment data the finance route already
// fetches; returns threshold-gated `Insight[]` plus the burn-down / trend
// payloads the Finance Intelligence charts render. All math lives here.
//
// What a transaction counts toward comes from lib/finance-ledger (`txKind`):
// transfers — money sent home, lent, saved — are never spending, so they stay out
// of the budget, the trends, the anomaly scan and the savings maths.

import type { DailyFinancialLog, BudgetScope, SubscriptionDTO } from '@/types/finance'
import {
  budgetConfigOf,
  countsTowardBudget,
  flattenLogs,
  isFixedEntry,
  isFromSavings,
  FAMILY_CATEGORY,
  LEGACY_TRANSFER_BUCKETS,
  type BudgetConfig,
  type LedgerEntry,
} from '@/lib/finance-ledger'
import { billStatus, monthlyCostOf, stillDueInMonth } from '@/lib/finance-recurring'
import type { Insight } from './engine'
import {
  addDaysIso,
  confidenceFrom,
  daysElapsedInMonth,
  daysInMonth,
  daysLeftInMonth,
  inr,
  median,
  monthKeyOf,
  monthLabel,
  rankInsights,
  sum,
} from './engine'

// ---------- Inputs ----------

export interface LendingLike {
  borrower: string
  amount: number
  status: string
  date?: string
  dueDate?: string
}

export interface RepaymentLike {
  dueDate: string
  amount: string | number
  status: string
}

export interface FinanceEngineInput {
  today: string
  /** The month the view is showing, 'YYYY-MM'. */
  monthKey: string
  logs: DailyFinancialLog[]
  monthlyBudget: number | null
  /** What the budget covers; defaults to ALL spending. */
  budgetScope?: BudgetScope | null
  fixedCategories?: string[] | null
  /**
   * Authoritative month-to-date *budgeted* spend when the caller has a fuller total
   * than `logs` covers (Home only fetches a 14-day log window).
   */
  monthTotalSpentOverride?: number | null
  subscriptions?: SubscriptionDTO[] | null
  lending?: LendingLike[] | null
  repayments?: RepaymentLike[] | null
}

const dayOf = (iso: string): string => iso.slice(0, 10)

/** Transfers into these stay yours, so they count as kept, not as money gone. */
const SAVINGS_CATEGORIES = new Set(['savings', 'investment', 'investments'])

// Flattening every log is the costliest step and every rule needs it; memoise on the
// logs array identity (a new fetch = a new array).
const flatCache = new WeakMap<DailyFinancialLog[], LedgerEntry[]>()
function flatten(logs: DailyFinancialLog[]): LedgerEntry[] {
  let entries = flatCache.get(logs)
  if (!entries) {
    entries = flattenLogs(logs)
    flatCache.set(logs, entries)
  }
  return entries
}

const txInMonth = (txs: LedgerEntry[], monthKey: string): LedgerEntry[] =>
  txs.filter((t) => monthKeyOf(t.day) === monthKey)

const spendingIn = (txs: LedgerEntry[]): LedgerEntry[] => txs.filter((t) => t.kind === 'spending')

/**
 * Spending the month actually chose: a purchase paid for from a savings goal was planned
 * months ago, so trends, the month-to-date comparison and the anomaly scan skip it — the
 * phone you saved for is not a "Shopping +900%" surprise.
 */
const everydayIn = (txs: LedgerEntry[]): LedgerEntry[] => txs.filter((t) => t.kind === 'spending' && !isFromSavings(t))

function categoryTotals(txs: LedgerEntry[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const t of everydayIn(txs)) {
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
  }
  return totals
}

const configOf = (input: FinanceEngineInput): BudgetConfig =>
  budgetConfigOf({
    budgetScope: input.budgetScope ?? undefined,
    fixedCategories: input.fixedCategories ?? undefined,
  })

const prevMonthKey = (monthKey: string): string => {
  const [y, m] = monthKey.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

// ---------- Burn-down (the signature finance computation; hero + chart + 2 rules read it) ----------

export interface BurndownPoint {
  /** Day of month, 1-based. */
  day: number
  dateIso: string
  /** Cumulative actual spend; null after today. */
  actual: number | null
  /** Ideal even-pace cumulative spend for the budget. */
  ideal: number | null
  /** Dotted projection; only set from today to month end. */
  forecast: number | null
}

export interface Burndown {
  monthKey: string
  budget: number
  spent: number
  daysElapsed: number
  daysLeft: number
  isCurrentMonth: boolean
  avgPerDay: number
  /** Everyday (non-fixed) spend per day so far — what the forecast carries forward. */
  dailyRate: number
  /** Budget remaining, less bills still due, spread over the remaining days (0 when over). */
  safePerDay: number
  /** Bills still due this month that will land on the budget (ALL scope only). */
  committed: number
  /** Whether the budget covers flexible spending only. */
  flex: boolean
  /**
   * Month-end estimate: spent so far + the everyday daily rate for the days left + bills
   * still due. One-off fixed costs (rent on the 3rd) are never extrapolated forward.
   */
  projectedTotal: number
  points: BurndownPoint[]
}

export function buildBurndown(input: FinanceEngineInput): Burndown | null {
  const budget = input.monthlyBudget ?? 0
  if (budget <= 0) return null
  const totalDays = daysInMonth(input.monthKey)
  const daysElapsed = daysElapsedInMonth(input.monthKey, input.today)
  if (daysElapsed === 0) return null
  const isCurrentMonth = monthKeyOf(input.today) === input.monthKey
  const daysLeft = daysLeftInMonth(input.monthKey, input.today)

  const config = configOf(input)
  const entries = flatten(input.logs)
  const monthTx = txInMonth(entries, input.monthKey)
  const spendByDay = new Map<number, number>()
  let flexibleSoFar = 0
  for (const t of monthTx) {
    if (!countsTowardBudget(t, config)) continue
    const day = Number(t.day.slice(8, 10))
    if (day > daysElapsed) continue
    spendByDay.set(day, (spendByDay.get(day) ?? 0) + t.amount)
    if (!isFixedEntry(t, config)) flexibleSoFar += t.amount
  }

  const cumulative: number[] = []
  let running = 0
  for (let day = 1; day <= daysElapsed; day++) {
    running += spendByDay.get(day) ?? 0
    cumulative.push(running)
  }
  // Trust the caller's month total when the log window is partial (Home).
  const spent = input.monthTotalSpentOverride ?? running
  const seriesReliable = Math.abs(spent - running) <= Math.max(1, spent * 0.01)
  if (spent > running && cumulative.length > 0) {
    cumulative[cumulative.length - 1] = spent
  }

  // Bills still due before month end are already spoken for (Copilot's "safe to spend"):
  // under an ALL budget they will land on it, so they come off today's allowance. A FLEX
  // budget never includes them, so nothing is reserved.
  let committed = 0
  if (isCurrentMonth && config.scope === 'ALL') {
    for (const sub of input.subscriptions ?? []) {
      const status = billStatus(sub, entries, input.today)
      if (stillDueInMonth(status, input.monthKey)) committed += sub.cost
    }
  }

  // Forecast = what's spent + the everyday rate carried over the remaining days + bills
  // still due. This replaced a least-squares line through the cumulative curve, which
  // under-shoots an accelerating month and was clamped to "spent so far" — so a month
  // with days to go forecast that nothing more would be spent. With a partial log window
  // (Home) the everyday split is unknown, so the plain pace stands in.
  const dailyRate = seriesReliable ? flexibleSoFar / daysElapsed : spent / daysElapsed
  const remainingDays = Math.max(0, totalDays - daysElapsed)
  const projectedTotal = isCurrentMonth ? spent + dailyRate * remainingDays + committed : spent

  const monthStart = `${input.monthKey}-01`
  const points: BurndownPoint[] = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1
    const beyondToday = day > daysElapsed
    const forecastValue =
      isCurrentMonth && day >= daysElapsed
        ? spent + ((projectedTotal - spent) * (day - daysElapsed)) / Math.max(totalDays - daysElapsed, 1)
        : null
    return {
      day,
      dateIso: addDaysIso(monthStart, i),
      actual: beyondToday ? null : cumulative[i],
      ideal: (budget / totalDays) * day,
      forecast: forecastValue,
    }
  })

  return {
    monthKey: input.monthKey,
    budget,
    spent,
    daysElapsed,
    daysLeft,
    isCurrentMonth,
    avgPerDay: spent / daysElapsed,
    dailyRate,
    safePerDay: Math.max(0, budget - spent - committed) / Math.max(daysLeft, 1),
    committed,
    flex: config.scope === 'FLEX',
    projectedTotal,
    points,
  }
}

// ---------- Category trends (UI bars + rule share one computation) ----------

export interface CategoryTrend {
  category: string
  total: number
  share: number
  previous: number | null
  /** Percent change vs previous month; null when no previous data. */
  changePct: number | null
}

export function categoryTrends(input: FinanceEngineInput, topN = 5): CategoryTrend[] {
  const txs = flatten(input.logs)
  const current = categoryTotals(txInMonth(txs, input.monthKey))
  const previous = categoryTotals(txInMonth(txs, prevMonthKey(input.monthKey)))
  const totalSpent = sum([...current.values()])
  if (totalSpent <= 0) return []
  return [...current.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([category, total]) => {
      const prev = previous.get(category) ?? null
      return {
        category,
        total,
        share: Math.round((total / totalSpent) * 100),
        previous: prev,
        changePct: prev && prev > 0 ? Math.round(((total - prev) / prev) * 100) : null,
      }
    })
}

// ---------- Subscriptions (renewal radar payload) ----------

export interface SubscriptionRadar {
  monthlyTotal: number
  count: number
  /** Renewals falling in the next 7 days from today. */
  dueThisWeek: { name: string; cost: number; renewsOn: string }[]
  dueThisWeekTotal: number
}

export function subscriptionRadar(input: FinanceEngineInput): SubscriptionRadar | null {
  const subs = input.subscriptions ?? []
  if (subs.length === 0) return null
  const weekAhead = addDaysIso(input.today, 7)
  const entries = flatten(input.logs)
  const dueThisWeek: SubscriptionRadar['dueThisWeek'] = []
  for (const sub of subs) {
    const status = billStatus(sub, entries, input.today)
    if (status.state === 'paid' || !status.nextDue) continue
    if (status.nextDue >= input.today && status.nextDue <= weekAhead) {
      dueThisWeek.push({ name: sub.name, cost: sub.cost, renewsOn: status.nextDue })
    }
  }
  return {
    // Normalised: a yearly plan adds a twelfth, a 28-day plan a little more than its price.
    monthlyTotal: sum(subs.map(monthlyCostOf)),
    count: subs.length,
    dueThisWeek: dueThisWeek.sort((a, b) => a.renewsOn.localeCompare(b.renewsOn)),
    dueThisWeekTotal: sum(dueThisWeek.map((s) => s.cost)),
  }
}

// ---------- Lending (exposure payload) ----------

export interface LendingExposure {
  owedTotal: number
  owedCount: number
  overdueCount: number
  /** Pending repayment obligations (e.g. Slice installments). */
  owingTotal: number
}

const parseAmount = (v: string | number): number =>
  typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.]/g, '')) || 0

export function lendingExposure(input: FinanceEngineInput): LendingExposure | null {
  const lending = input.lending ?? []
  const repayments = input.repayments ?? []
  const pending = lending.filter((l) => l.status !== 'Repaid')
  const owingPending = repayments.filter((r) => !/paid|done|complete/i.test(r.status))
  if (pending.length === 0 && owingPending.length === 0) return null
  return {
    owedTotal: sum(pending.map((l) => l.amount)),
    owedCount: pending.length,
    overdueCount: pending.filter((l) => l.dueDate && dayOf(l.dueDate) < input.today).length,
    owingTotal: sum(owingPending.map((r) => parseAmount(r.amount))),
  }
}

// ---------- Daily spending & month-to-date comparison (MonthHero) ----------

export interface DaySpend {
  /** Day of month, 1-based. */
  day: number
  date: string
  total: number
  /** Spending by category that day, largest first. `fixed` rows (rent, bill payments) are
   *  kept apart so a FLEX budget can show them as not counted; `fromSavings` rows (a goal
   *  purchase) never count against the budget at all. */
  segments: { category: string; amount: number; fixed: boolean; fromSavings: boolean }[]
  isToday: boolean
  isFuture: boolean
}

/** Every day of the month with its spending split by category — transfers never included. */
export function dailyBreakdown(input: FinanceEngineInput): DaySpend[] {
  const config = configOf(input)
  const byDay = new Map<number, Map<string, { category: string; amount: number; fixed: boolean; fromSavings: boolean }>>()
  for (const t of spendingIn(txInMonth(flatten(input.logs), input.monthKey))) {
    const day = Number(t.day.slice(8, 10))
    const fromSavings = isFromSavings(t)
    const fixed = !fromSavings && isFixedEntry(t, config)
    const key = `${t.category}|${fixed}|${fromSavings}`
    const cats = byDay.get(day) ?? new Map()
    const prev = cats.get(key)
    cats.set(key, { category: t.category, fixed, fromSavings, amount: (prev?.amount ?? 0) + t.amount })
    byDay.set(day, cats)
  }
  return Array.from({ length: daysInMonth(input.monthKey) }, (_, i) => {
    const day = i + 1
    const date = `${input.monthKey}-${String(day).padStart(2, '0')}`
    const segments = [...(byDay.get(day)?.values() ?? [])].sort((a, b) => b.amount - a.amount)
    return {
      day,
      date,
      total: sum(segments.map((s) => s.amount)),
      segments,
      isToday: date === input.today,
      isFuture: date > input.today,
    }
  })
}

export interface SpendingComparison {
  current: number
  previous: number
  /** Signed percent change vs the previous month; null when there's nothing to compare. */
  changePct: number | null
  previousMonthKey: string
  /** Compared through this day of month (month-to-date), or null for whole months. */
  throughDay: number | null
}

/**
 * This month's spending against last month's *at the same point in the month* (Copilot's
 * comparison): a mid-month total against a whole previous month would always look good.
 * Past months compare whole month to whole month.
 */
export function spendingComparison(input: FinanceEngineInput): SpendingComparison | null {
  const isCurrent = monthKeyOf(input.today) === input.monthKey
  const throughDay = isCurrent ? Number(input.today.slice(8, 10)) : null
  const previousMonthKey = prevMonthKey(input.monthKey)
  const entries = flatten(input.logs)
  const upTo = (monthKey: string) =>
    sum(
      everydayIn(txInMonth(entries, monthKey))
        .filter((t) => throughDay == null || Number(t.day.slice(8, 10)) <= throughDay)
        .map((t) => t.amount),
    )
  const current = upTo(input.monthKey)
  const previous = upTo(previousMonthKey)
  return {
    current,
    previous,
    changePct: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
    previousMonthKey,
    throughDay,
  }
}

// ---------- Rules ----------

function safeToSpendRule(input: FinanceEngineInput, burndown: Burndown | null): Insight | null {
  if (!burndown || !burndown.isCurrentMonth) return null
  const { budget, spent, daysLeft, daysElapsed, safePerDay, avgPerDay, committed, flex } = burndown
  const left = budget - spent
  const sampleWindow = `${monthLabel(input.monthKey)}, day ${daysElapsed} of ${daysInMonth(input.monthKey)}`
  const scopeNote = flex ? ' Budget covers everyday spending; rent and bills are tracked separately.' : ''
  const committedNote = committed > 0 ? ` ${inr(committed)} of bills still due this month is set aside first.` : ''
  const detail = `Spent ${inr(spent)} of ${inr(budget)} in ${daysElapsed} days (${inr(avgPerDay)}/day). ${left >= 0 ? `${inr(left)} left over ${daysLeft} days → ${inr(safePerDay)}/day.` : `${inr(-left)} over budget with ${daysLeft} days to go.`}${committedNote}${scopeNote}`

  if (left < 0) {
    return {
      id: 'fin-safe-to-spend',
      domain: 'finance',
      kind: 'trend',
      sentiment: 'urgent',
      icon: 'wallet',
      title: `You're ${inr(-left)} over your ${inr(budget)} budget with ${daysLeft} days still to go in ${monthLabel(input.monthKey)}.`,
      detail,
      metric: { value: Math.round(-left), unit: '₹ over' },
      sampleWindow,
      action: { label: 'Adjust budget', route: '/finance', search: '?edit=budget' },
      secondaryAction: { label: 'Review this month’s spending', route: '/finance' },
      confidence: 'high',
      effect: Math.min(1, -left / budget + 0.5),
    }
  }
  const overPace = avgPerDay > safePerDay
  return {
    id: 'fin-safe-to-spend',
    domain: 'finance',
    kind: 'trend',
    sentiment: overPace ? 'watch' : 'positive',
    icon: 'wallet',
    title: `You've spent ${inr(spent)} of ${inr(budget)}. That's ${inr(safePerDay)}/day left for ${daysLeft} days — you're spending ${inr(avgPerDay)}/day.`,
    detail,
    metric: { value: Math.round(safePerDay), unit: '₹/day' },
    sampleWindow,
    confidence: confidenceFrom(daysElapsed, Math.abs(avgPerDay - safePerDay) / Math.max(safePerDay, 1)),
    effect: Math.min(1, Math.abs(avgPerDay - safePerDay) / Math.max(safePerDay, 1)),
  }
}

function forecastRule(input: FinanceEngineInput, burndown: Burndown | null): Insight | null {
  if (!burndown || !burndown.isCurrentMonth || burndown.daysElapsed < 5) return null
  const { budget, projectedTotal, daysElapsed } = burndown
  const delta = budget - projectedTotal
  const month = monthLabel(input.monthKey)
  const sampleWindow = `projected from ${daysElapsed} days of ${month}`
  const detail = `${inr(burndown.spent)} spent + ${inr(burndown.dailyRate)}/day of everyday spending for the days left${burndown.committed > 0 ? ` + ${inr(burndown.committed)} of bills still due` : ''} = ${inr(projectedTotal)} by month end vs ${inr(budget)} budget (${delta >= 0 ? inr(delta) + ' under' : inr(-delta) + ' over'}).`
  if (Math.abs(delta) <= budget * 0.03) {
    return {
      id: 'fin-forecast',
      domain: 'finance',
      kind: 'forecast',
      sentiment: 'neutral',
      icon: 'forecast',
      title: `At this pace you'll finish ${month} right around your ${inr(budget)} budget.`,
      detail,
      sampleWindow,
      confidence: confidenceFrom(daysElapsed, 0.1),
      effect: 0.1,
    }
  }
  if (delta > 0) {
    return {
      id: 'fin-forecast',
      domain: 'finance',
      kind: 'forecast',
      sentiment: 'positive',
      icon: 'forecast',
      title: `At this pace you'll finish ${month} around ${inr(projectedTotal)} — about ${inr(delta)} under budget.`,
      detail,
      metric: { value: Math.round(projectedTotal), unit: '₹', delta: Math.round(delta), deltaDir: 'down' },
      sampleWindow,
      confidence: confidenceFrom(daysElapsed, delta / budget),
      effect: Math.min(1, delta / budget),
    }
  }
  return {
    id: 'fin-forecast',
    domain: 'finance',
    kind: 'forecast',
    sentiment: 'urgent',
    icon: 'forecast',
    title: `At this pace you'll finish ${month} around ${inr(projectedTotal)} — about ${inr(-delta)} over your ${inr(budget)} budget.`,
    detail,
    metric: { value: Math.round(projectedTotal), unit: '₹', delta: Math.round(-delta), deltaDir: 'up' },
    sampleWindow,
    // The one urgent card gets a direct fix, with the look-around as the lighter option.
    action: { label: 'Adjust budget', route: '/finance', search: '?edit=budget' },
    secondaryAction: { label: 'See where it’s going', route: '/finance' },
    confidence: confidenceFrom(daysElapsed, -delta / budget),
    effect: Math.min(1, -delta / budget),
  }
}

// ---------- Transfers (money that moved but wasn't spent) ----------

export interface TransferSummary {
  /** Sent home this month. */
  familyOut: number
  familyCount: number
  /** All transfers out / in this month. */
  out: number
  in: number
  /** Average sent home per month over the previous months that had any. */
  familyAvg: number | null
  /** Family transfers per month, oldest → newest, ending with `monthKey`. */
  familyByMonth: { monthKey: string; total: number }[]
}

const isFamily = (t: LedgerEntry) => t.kind === 'transfer-out' && t.category === FAMILY_CATEGORY

export function transferSummary(input: FinanceEngineInput, months = 6): TransferSummary {
  const entries = flatten(input.logs)
  const monthTx = txInMonth(entries, input.monthKey)
  const familyByMonth: TransferSummary['familyByMonth'] = []
  let key = input.monthKey
  for (let i = 0; i < months; i++) {
    familyByMonth.unshift({ monthKey: key, total: sum(txInMonth(entries, key).filter(isFamily).map((t) => t.amount)) })
    key = prevMonthKey(key)
  }
  const previous = familyByMonth.slice(0, -1).filter((m) => m.total > 0)
  return {
    familyOut: sum(monthTx.filter(isFamily).map((t) => t.amount)),
    familyCount: monthTx.filter(isFamily).length,
    out: sum(monthTx.filter((t) => t.kind === 'transfer-out').map((t) => t.amount)),
    in: sum(monthTx.filter((t) => t.kind === 'transfer-in').map((t) => t.amount)),
    familyAvg: previous.length > 0 ? sum(previous.map((m) => m.total)) / previous.length : null,
    familyByMonth,
  }
}

/**
 * Legacy categories still logged as spending that are really transfers ("To Home",
 * "Lending"). Returned so the route can offer a one-tap move — never converted silently.
 */
export function legacyTransferBuckets(input: FinanceEngineInput): {
  category: string
  target: string
  direction: 'OUT' | 'IN'
  label: string
  total: number
  count: number
}[] {
  const spending = flatten(input.logs).filter((t) => t.kind === 'spending' || t.kind === 'income')
  return LEGACY_TRANSFER_BUCKETS.flatMap((bucket) => {
    const rows = spending.filter((t) => t.category === bucket.category)
    return rows.length > 0 ? [{ ...bucket, total: sum(rows.map((t) => t.amount)), count: rows.length }] : []
  })
}

function familyRule(input: FinanceEngineInput): Insight | null {
  const summary = transferSummary(input)
  if (summary.familyOut <= 0) return null
  const vsAvg =
    summary.familyAvg != null && summary.familyAvg > 0
      ? Math.round(((summary.familyOut - summary.familyAvg) / summary.familyAvg) * 100)
      : null
  return {
    id: 'fin-family',
    domain: 'finance',
    kind: 'trend',
    sentiment: 'neutral',
    icon: 'lending',
    title: `You sent ${inr(summary.familyOut)} home in ${monthLabel(input.monthKey)}${vsAvg != null && Math.abs(vsAvg) >= 10 ? ` — ${Math.abs(vsAvg)}% ${vsAvg > 0 ? 'more' : 'less'} than your usual ${inr(summary.familyAvg ?? 0)}` : ''}. It's kept out of your spending and budget.`,
    detail: `${summary.familyCount} transfer${summary.familyCount === 1 ? '' : 's'} to family this month. Transfers lower your balance but are never counted as spending.`,
    sampleWindow: `${monthLabel(input.monthKey)}${summary.familyAvg != null ? ', vs previous months' : ''}`,
    confidence: 'high',
    effect: 0.1,
  }
}

function legacyTransferRule(input: FinanceEngineInput): Insight | null {
  const bucket = legacyTransferBuckets(input)[0]
  if (!bucket) return null
  const asIncome = bucket.direction === 'IN'
  return {
    id: 'fin-legacy-transfers',
    domain: 'finance',
    kind: 'anomaly',
    sentiment: 'watch',
    icon: 'category',
    title: `${inr(bucket.total)} in "${bucket.category}" is still counted as ${asIncome ? 'income' : 'spending'} — it's money ${bucket.label}, so it belongs with transfers.`,
    detail: `${bucket.count} row${bucket.count === 1 ? '' : 's'} logged before transfers existed. Moving ${bucket.count === 1 ? 'it' : 'them'} to "${bucket.target}" takes ${inr(bucket.total)} out of ${asIncome ? 'income' : 'spending and the budget'} without changing your balance.`,
    sampleWindow: 'all logged history',
    action: {
      label: 'Move to transfers',
      route: '/finance',
      search: `?reclassify=${encodeURIComponent(bucket.category)}`,
    },
    confidence: 'high',
    effect: 0.4,
  }
}

function categoryTrendRule(input: FinanceEngineInput): Insight | null {
  const trends = categoryTrends(input, 3)
  if (trends.length === 0) return null
  const top = trends[0]
  const detailParts = trends.map(
    (t) =>
      `${t.category}: ${inr(t.total)} (${t.share}%)${t.changePct != null ? `, ${t.changePct >= 0 ? '+' : ''}${t.changePct}% MoM` : ''}`,
  )
  if (top.changePct == null) {
    if (top.share < 40) return null
    return {
      id: 'fin-cat-top',
      domain: 'finance',
      kind: 'trend',
      sentiment: 'neutral',
      icon: 'category',
      title: `${top.category} is your biggest category — ${top.share}% of this month's spend (${inr(top.total)}).`,
      detail: detailParts.join('; '),
      sampleWindow: `${monthLabel(input.monthKey)} so far`,
      confidence: 'medium',
      effect: top.share / 200,
    }
  }
  if (Math.abs(top.changePct) < 20 || Math.abs(top.total - (top.previous ?? 0)) < 500) return null
  const dir = top.changePct > 0 ? 'up' : 'down'
  return {
    id: 'fin-cat-trend',
    domain: 'finance',
    kind: 'trend',
    sentiment: dir === 'up' ? 'watch' : 'positive',
    icon: 'category',
    title: `${top.category} is your biggest category at ${top.share}%; it's ${dir} ${Math.abs(top.changePct)}% vs last month.`,
    detail: detailParts.join('; '),
    metric: { value: Math.round(top.total), unit: '₹', delta: top.changePct, deltaDir: dir },
    sampleWindow: `${monthLabel(input.monthKey)} vs ${monthLabel(prevMonthKey(input.monthKey))}`,
    confidence: confidenceFrom(10, Math.abs(top.changePct) / 100),
    effect: Math.min(1, Math.abs(top.changePct) / 100),
  }
}

const normalizeCategory = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '')

/**
 * Two spellings of one category this month ("Bills" / "Bills & Utilities"), with the
 * smaller bucket as `from` so a merge makes the odd spelling disappear.
 */
export function duplicateCategoryPair(input: FinanceEngineInput): { from: string; into: string } | null {
  const totals = categoryTotals(txInMonth(flatten(input.logs), input.monthKey))
  const names = [...totals.keys()]
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = normalizeCategory(names[i])
      const b = normalizeCategory(names[j])
      if (!a || !b || a === b) continue
      if (a.startsWith(b) || b.startsWith(a)) {
        const iBigger = (totals.get(names[i]) ?? 0) >= (totals.get(names[j]) ?? 0)
        return iBigger ? { from: names[j], into: names[i] } : { from: names[i], into: names[j] }
      }
    }
  }
  return null
}

/** Near-duplicate category taxonomy detection, e.g. "Bills" vs "Bills & Utilities". */
function duplicateCategoryRule(input: FinanceEngineInput): Insight | null {
  const pair = duplicateCategoryPair(input)
  if (!pair) return null
  const { from, into } = pair
  const totals = categoryTotals(txInMonth(flatten(input.logs), input.monthKey))
  return {
    id: 'fin-cat-dupes',
    domain: 'finance',
    kind: 'anomaly',
    sentiment: 'neutral',
    icon: 'category',
    title: `"${into}" and "${from}" look like the same category — merging them would make your trends cleaner.`,
    detail: `${into}: ${inr(totals.get(into) ?? 0)}; ${from}: ${inr(totals.get(from) ?? 0)} this month. Re-categorizing one into the other keeps history comparable.`,
    sampleWindow: `${monthLabel(input.monthKey)} categories`,
    action: {
      label: `Merge into ${into}`,
      route: '/finance',
      search: `?merge=${encodeURIComponent(from)}&into=${encodeURIComponent(into)}`,
    },
    confidence: 'high',
    effect: 0.15,
  }
}

function subscriptionRule(input: FinanceEngineInput, burndown: Burndown | null): Insight | null {
  const radar = subscriptionRadar(input)
  if (!radar) return null
  const budget = input.monthlyBudget ?? 0
  // Under an everyday (FLEX) budget, bills aren't part of the budget at all — a share
  // of it would compare two things that never meet.
  const shareOfBudget = budget > 0 && configOf(input).scope === 'ALL'
    ? Math.round((radar.monthlyTotal / budget) * 100)
    : null
  const weekPart =
    radar.dueThisWeekTotal > 0
      ? ` ${inr(radar.dueThisWeekTotal)} renews this week (${radar.dueThisWeek.map((s) => s.name).join(', ')}).`
      : ''
  return {
    id: 'fin-subscriptions',
    domain: 'finance',
    kind: 'trend',
    sentiment: shareOfBudget != null && shareOfBudget > 15 ? 'watch' : 'neutral',
    icon: 'subscription',
    title: `${inr(radar.monthlyTotal)}/mo across ${radar.count} bills & subscriptions${shareOfBudget != null ? ` (${shareOfBudget}% of your budget)` : ''}.${weekPart}`,
    detail: `Recurring load ${inr(radar.monthlyTotal)}/month${budget > 0 ? ` against a ${inr(budget)} budget` : ''}${burndown ? `; that's ${inr(radar.monthlyTotal / daysInMonth(input.monthKey))}/day of your pace` : ''}.`,
    sampleWindow: 'active subscriptions',
    confidence: 'high',
    effect: shareOfBudget != null ? Math.min(1, shareOfBudget / 100) : 0.1,
  }
}

function savingsRateRule(input: FinanceEngineInput): Insight | null {
  const monthTx = txInMonth(flatten(input.logs), input.monthKey)
  const income = sum(monthTx.filter((t) => t.kind === 'income').map((t) => t.amount))
  const spent = sum(everydayIn(monthTx).map((t) => t.amount))
  // Money sent home or lent has left you; money moved into savings hasn't.
  const givenAway = sum(
    monthTx
      .filter((t) => t.kind === 'transfer-out' && !SAVINGS_CATEGORIES.has(t.category.toLowerCase()))
      .map((t) => t.amount),
  )
  const expense = spent + givenAway
  if (expense === 0 && income === 0) return null
  if (income === 0) {
    // Data gap, not a failing score.
    return {
      id: 'fin-savings-gap',
      domain: 'finance',
      kind: 'trend',
      sentiment: 'neutral',
      icon: 'income',
      title: `No income logged yet this month — add it to unlock savings-rate and cash-flow insights.`,
      detail: `Expenses ${inr(expense)} logged in ${monthLabel(input.monthKey)}, income ₹0. Savings rate needs both sides.`,
      sampleWindow: `${monthLabel(input.monthKey)} so far`,
      action: { label: 'Log income', route: '/finance' },
      confidence: 'high',
      effect: 0.12,
    }
  }
  const rate = Math.round(((income - expense) / income) * 100)
  return {
    id: 'fin-savings-rate',
    domain: 'finance',
    kind: 'trend',
    sentiment: rate >= 20 ? 'positive' : rate >= 5 ? 'neutral' : 'watch',
    icon: 'income',
    title: `You're saving ${rate}% of income this month (${inr(income - expense)} of ${inr(income)}).`,
    detail: `Income ${inr(income)} − spending ${inr(spent)}${givenAway > 0 ? ` − sent/lent ${inr(givenAway)}` : ''} = ${inr(income - expense)} (${rate}%).`,
    sampleWindow: `${monthLabel(input.monthKey)} so far`,
    confidence: confidenceFrom(monthTx.length, Math.abs(rate) / 100),
    effect: Math.min(1, Math.abs(rate) / 100),
  }
}

function lendingRule(input: FinanceEngineInput): Insight | null {
  const exposure = lendingExposure(input)
  if (!exposure || (exposure.owedCount === 0 && exposure.owingTotal === 0)) return null
  const parts: string[] = []
  if (exposure.owedCount > 0) {
    parts.push(
      `You're owed ${inr(exposure.owedTotal)} across ${exposure.owedCount} ${exposure.owedCount === 1 ? 'person' : 'people'}${exposure.overdueCount > 0 ? `; ${exposure.overdueCount} past the expected return date` : ''}.`,
    )
  }
  if (exposure.owingTotal > 0) parts.push(`${inr(exposure.owingTotal)} of repayments are still pending on your side.`)
  return {
    id: 'fin-lending',
    domain: 'finance',
    kind: 'trend',
    sentiment: exposure.overdueCount > 0 ? 'watch' : 'neutral',
    icon: 'lending',
    title: parts.join(' '),
    detail: `Receivables ${inr(exposure.owedTotal)} (${exposure.owedCount} pending, ${exposure.overdueCount} overdue) vs pending repayment obligations ${inr(exposure.owingTotal)} → net ${inr(exposure.owedTotal - exposure.owingTotal)}.`,
    sampleWindow: 'open records',
    action: { label: 'Open lending tracker', route: '/finance' },
    confidence: 'high',
    effect: Math.min(1, exposure.overdueCount * 0.2 + 0.1),
  }
}

function anomalyRule(input: FinanceEngineInput): Insight | null {
  // Rent and bill payments are expected, however large — only flexible spending can surprise.
  const config = configOf(input)
  const expenses = everydayIn(txInMonth(flatten(input.logs), input.monthKey)).filter((t) => !isFixedEntry(t, config))
  if (expenses.length < 8) return null
  const amounts = expenses.map((t) => t.amount)
  const med = median(amounts)
  const largest = expenses.reduce((a, b) => (b.amount > a.amount ? b : a))
  if (med <= 0 || largest.amount < 3 * med || largest.amount < 1000) return null
  const ratio = Math.round(largest.amount / med)
  return {
    id: 'fin-anomaly',
    domain: 'finance',
    kind: 'anomaly',
    sentiment: 'neutral',
    icon: 'anomaly',
    title: `${inr(largest.amount)} to ${largest.description || largest.category} was your largest outflow this month — about ${ratio}× your typical transaction.`,
    detail: `Largest expense ${inr(largest.amount)} (${largest.category}, ${largest.day}) vs median transaction ${inr(med)} across ${expenses.length} expenses.`,
    sampleWindow: `${monthLabel(input.monthKey)}, ${expenses.length} transactions`,
    confidence: confidenceFrom(expenses.length, Math.min(1, ratio / 10)),
    effect: Math.min(1, ratio / 12),
  }
}

function velocityRule(input: FinanceEngineInput): Insight | null {
  const dayCut = daysElapsedInMonth(input.monthKey, input.today)
  if (dayCut < 5) return null
  const txs = flatten(input.logs)
  const cutTotal = (monthKey: string) =>
    sum(
      everydayIn(txInMonth(txs, monthKey))
        .filter((t) => Number(t.day.slice(8, 10)) <= dayCut)
        .map((t) => t.amount),
    )
  const current = cutTotal(input.monthKey)
  const prevKey = prevMonthKey(input.monthKey)
  const previous = cutTotal(prevKey)
  if (previous < 1000 || current === 0) return null
  const diffPct = Math.round(((current - previous) / previous) * 100)
  if (Math.abs(diffPct) < 15) return null
  const lower = diffPct < 0
  return {
    id: 'fin-velocity',
    domain: 'finance',
    kind: 'trend',
    sentiment: lower ? 'positive' : 'watch',
    icon: 'scale',
    title: `By day ${dayCut} you've spent ${Math.abs(diffPct)}% ${lower ? 'less' : 'more'} than by day ${dayCut} last month (${inr(current)} vs ${inr(previous)}).`,
    detail: `Cumulative expenses through day ${dayCut}: ${monthLabel(input.monthKey)} ${inr(current)} vs ${monthLabel(prevKey)} ${inr(previous)}.`,
    sampleWindow: `first ${dayCut} days, month over month`,
    confidence: confidenceFrom(dayCut, Math.abs(diffPct) / 100),
    effect: Math.min(1, Math.abs(diffPct) / 100),
  }
}

/** Always try to surface one genuine win; never manufacture one. */
function winRule(input: FinanceEngineInput, burndown: Burndown | null): Insight | null {
  if (burndown && burndown.isCurrentMonth && burndown.daysElapsed >= 5 && burndown.projectedTotal <= burndown.budget * 0.97) {
    return {
      id: 'fin-win-pacing',
      domain: 'finance',
      kind: 'win',
      sentiment: 'positive',
      icon: 'trophy',
      title: `You're pacing ${inr(burndown.budget - burndown.projectedTotal)} under budget for ${monthLabel(input.monthKey)}. Keep the streak.`,
      detail: `Projected ${inr(burndown.projectedTotal)} vs ${inr(burndown.budget)} budget from ${burndown.daysElapsed} days of data.`,
      sampleWindow: `${monthLabel(input.monthKey)}, day ${burndown.daysElapsed}`,
      confidence: 'high',
      effect: 0.18,
    }
  }
  const dayCut = daysElapsedInMonth(input.monthKey, input.today)
  const monthTx = spendingIn(txInMonth(flatten(input.logs), input.monthKey))
  if (dayCut >= 7 && monthTx.length > 0) {
    const spendDays = new Set(monthTx.map((t) => t.day))
    const noSpendDays = dayCut - spendDays.size
    if (noSpendDays >= 3) {
      return {
        id: 'fin-win-nospend',
        domain: 'finance',
        kind: 'win',
        sentiment: 'positive',
        icon: 'trophy',
        title: `${noSpendDays} no-spend days so far this month. Quiet wins add up.`,
        detail: `${spendDays.size} of the first ${dayCut} days had expenses; ${noSpendDays} were spend-free.`,
        sampleWindow: `${monthLabel(input.monthKey)}, day ${dayCut}`,
        confidence: 'high',
        effect: 0.14,
      }
    }
  }
  // A category you cut meaningfully vs last month — skipping the top category,
  // which categoryTrendRule already reports, so the two never say the same thing.
  const trends = categoryTrends(input, 8)
  const cut = trends
    .slice(1)
    .find((t) => t.changePct != null && t.changePct <= -25 && (t.previous ?? 0) - t.total >= 500)
  if (cut) {
    return {
      id: 'fin-win-category-cut',
      domain: 'finance',
      kind: 'win',
      sentiment: 'positive',
      icon: 'trophy',
      title: `${cut.category} is down ${Math.abs(cut.changePct ?? 0)}% vs last month — ${inr((cut.previous ?? 0) - cut.total)} kept.`,
      detail: `${cut.category}: ${inr(cut.total)} this month vs ${inr(cut.previous ?? 0)} last month.`,
      sampleWindow: 'month over month',
      confidence: 'medium',
      effect: 0.12,
    }
  }
  return null
}

/** All finance insights that pass their thresholds, ranked. */
export function financeInsights(input: FinanceEngineInput): Insight[] {
  const burndown = buildBurndown(input)
  const insights = [
    safeToSpendRule(input, burndown),
    forecastRule(input, burndown),
    categoryTrendRule(input),
    duplicateCategoryRule(input),
    subscriptionRule(input, burndown),
    familyRule(input),
    legacyTransferRule(input),
    savingsRateRule(input),
    lendingRule(input),
    anomalyRule(input),
    velocityRule(input),
    winRule(input, burndown),
  ].filter((i): i is Insight => i != null)
  return rankInsights(insights)
}
