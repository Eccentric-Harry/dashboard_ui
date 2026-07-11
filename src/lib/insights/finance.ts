// Finance rules for the shared insights engine. Reads the daily finance logs,
// budget, subscriptions, lending, and repayment data the finance route already
// fetches; returns threshold-gated `Insight[]` plus the burn-down / trend
// payloads the Finance Intelligence charts render. All math lives here.

import type { Insight } from './engine'
import {
  addDaysIso,
  confidenceFrom,
  daysElapsedInMonth,
  daysInMonth,
  daysLeftInMonth,
  inr,
  linearProjection,
  median,
  monthKeyOf,
  monthLabel,
  rankInsights,
  sum,
} from './engine'

// ---------- Inputs ----------

export interface FinanceTxLike {
  id?: string
  description?: string
  amount: number
  type?: string
  timestamp?: string
}

export interface FinanceLogLike {
  date: string
  dailyTotals?: { totalExpense?: number; totalIncome?: number }
  transactions?: Record<string, FinanceTxLike[]>
}

export interface SubscriptionLike {
  name: string
  cost: number
  billingDate?: string
}

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
  logs: FinanceLogLike[]
  monthlyBudget: number | null
  /**
   * Authoritative month-to-date spend when the caller has a fuller total than
   * `logs` covers (Home only fetches a 14-day log window).
   */
  monthTotalSpentOverride?: number | null
  subscriptions?: SubscriptionLike[] | null
  lending?: LendingLike[] | null
  repayments?: RepaymentLike[] | null
}

const dayOf = (iso: string): string => iso.slice(0, 10)

const isExpense = (tx: FinanceTxLike, category: string): boolean =>
  tx.type
    ? tx.type.toLowerCase() === 'expense'
    : !(category.toLowerCase().includes('income') || category.toLowerCase().includes('salary'))

interface FlatTx {
  id?: string
  description: string
  amount: number
  category: string
  date: string
  expense: boolean
}

function flatten(logs: FinanceLogLike[]): FlatTx[] {
  const out: FlatTx[] = []
  for (const log of logs) {
    const date = dayOf(log.date)
    for (const [category, txs] of Object.entries(log.transactions ?? {})) {
      for (const tx of txs ?? []) {
        out.push({
          id: tx.id,
          description: tx.description ?? '',
          amount: tx.amount,
          category,
          date,
          expense: isExpense(tx, category),
        })
      }
    }
  }
  return out
}

const txInMonth = (txs: FlatTx[], monthKey: string): FlatTx[] =>
  txs.filter((t) => monthKeyOf(t.date) === monthKey)

function categoryTotals(txs: FlatTx[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const t of txs) {
    if (!t.expense) continue
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
  }
  return totals
}

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
  /** Budget remaining spread over the remaining days (0 when over budget). */
  safePerDay: number
  /** Least-squares projection of the cumulative series to month end. */
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

  const monthTx = txInMonth(flatten(input.logs), input.monthKey)
  const spendByDay = new Map<number, number>()
  for (const t of monthTx) {
    if (!t.expense) continue
    const day = Number(t.date.slice(8, 10))
    spendByDay.set(day, (spendByDay.get(day) ?? 0) + t.amount)
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

  // A partial series would skew the least-squares fit, so fall back to pace.
  const projectedByFit = seriesReliable ? linearProjection(cumulative, totalDays - 1) : null
  const projectedByPace = (spent / daysElapsed) * totalDays
  const projectedTotal = Math.max(spent, projectedByFit ?? projectedByPace)

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
    safePerDay: Math.max(0, budget - spent) / Math.max(daysLeft, 1),
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
  const dueThisWeek: SubscriptionRadar['dueThisWeek'] = []
  for (const sub of subs) {
    if (!sub.billingDate) continue
    const renewDay = Number(dayOf(sub.billingDate).slice(8, 10))
    if (!renewDay) continue
    // Next occurrence of the billing day-of-month on or after today.
    const [y, m] = [Number(input.today.slice(0, 4)), Number(input.today.slice(5, 7))]
    const clamp = (yy: number, mm: number) => Math.min(renewDay, daysInMonth(`${yy}-${String(mm).padStart(2, '0')}`))
    let next = `${y}-${String(m).padStart(2, '0')}-${String(clamp(y, m)).padStart(2, '0')}`
    if (next < input.today) {
      const [ny, nm] = m === 12 ? [y + 1, 1] : [y, m + 1]
      next = `${ny}-${String(nm).padStart(2, '0')}-${String(clamp(ny, nm)).padStart(2, '0')}`
    }
    if (next >= input.today && next <= weekAhead) {
      dueThisWeek.push({ name: sub.name, cost: sub.cost, renewsOn: next })
    }
  }
  return {
    monthlyTotal: sum(subs.map((s) => s.cost)),
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

// ---------- Rules ----------

function safeToSpendRule(input: FinanceEngineInput, burndown: Burndown | null): Insight | null {
  if (!burndown || !burndown.isCurrentMonth) return null
  const { budget, spent, daysLeft, daysElapsed, safePerDay, avgPerDay } = burndown
  const left = budget - spent
  const sampleWindow = `${monthLabel(input.monthKey)}, day ${daysElapsed} of ${daysInMonth(input.monthKey)}`
  const detail = `Spent ${inr(spent)} of ${inr(budget)} in ${daysElapsed} days (${inr(avgPerDay)}/day). ${left >= 0 ? `${inr(left)} left over ${daysLeft} days → ${inr(safePerDay)}/day.` : `${inr(-left)} over budget with ${daysLeft} days to go.`}`

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
      action: { label: 'Review this month’s spending', route: '/finance' },
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
  const detail = `Least-squares projection of cumulative spend: ${inr(projectedTotal)} by month end vs ${inr(budget)} budget (${delta >= 0 ? inr(delta) + ' under' : inr(-delta) + ' over'}).`
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
    action: { label: 'See where it’s going', route: '/finance' },
    confidence: confidenceFrom(daysElapsed, -delta / budget),
    effect: Math.min(1, -delta / budget),
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

/** Near-duplicate category taxonomy detection, e.g. "Bills" vs "Bills & Utilities". */
function duplicateCategoryRule(input: FinanceEngineInput): Insight | null {
  const totals = categoryTotals(txInMonth(flatten(input.logs), input.monthKey))
  const names = [...totals.keys()]
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = normalizeCategory(names[i])
      const b = normalizeCategory(names[j])
      if (!a || !b || a === b) continue
      if (a.startsWith(b) || b.startsWith(a)) {
        // TODO(seam): deep-link to a real category merge/edit flow once one exists.
        return {
          id: 'fin-cat-dupes',
          domain: 'finance',
          kind: 'anomaly',
          sentiment: 'neutral',
          icon: 'category',
          title: `"${names[i]}" and "${names[j]}" look like the same category — merging them would make your trends cleaner.`,
          detail: `${names[i]}: ${inr(totals.get(names[i]) ?? 0)}; ${names[j]}: ${inr(totals.get(names[j]) ?? 0)} this month. Re-categorizing one into the other keeps history comparable.`,
          sampleWindow: `${monthLabel(input.monthKey)} categories`,
          action: { label: 'Review transactions', route: '/finance' },
          confidence: 'high',
          effect: 0.15,
        }
      }
    }
  }
  return null
}

function subscriptionRule(input: FinanceEngineInput, burndown: Burndown | null): Insight | null {
  const radar = subscriptionRadar(input)
  if (!radar) return null
  const budget = input.monthlyBudget ?? 0
  const shareOfBudget = budget > 0 ? Math.round((radar.monthlyTotal / budget) * 100) : null
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
    title: `${inr(radar.monthlyTotal)}/mo across ${radar.count} subscriptions${shareOfBudget != null ? ` (${shareOfBudget}% of your budget)` : ''}.${weekPart}`,
    detail: `Recurring load ${inr(radar.monthlyTotal)}/month${budget > 0 ? ` against a ${inr(budget)} budget` : ''}${burndown ? `; that's ${inr(radar.monthlyTotal / daysInMonth(input.monthKey))}/day of your pace` : ''}.`,
    sampleWindow: 'active subscriptions',
    confidence: 'high',
    effect: shareOfBudget != null ? Math.min(1, shareOfBudget / 100) : 0.1,
  }
}

function savingsRateRule(input: FinanceEngineInput): Insight | null {
  const monthTx = txInMonth(flatten(input.logs), input.monthKey)
  const income = sum(monthTx.filter((t) => !t.expense).map((t) => t.amount))
  const expense = sum(monthTx.filter((t) => t.expense).map((t) => t.amount))
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
    detail: `Income ${inr(income)} − expenses ${inr(expense)} = ${inr(income - expense)} (${rate}%).`,
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
  const expenses = txInMonth(flatten(input.logs), input.monthKey).filter((t) => t.expense)
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
    detail: `Largest expense ${inr(largest.amount)} (${largest.category}, ${largest.date}) vs median transaction ${inr(med)} across ${expenses.length} expenses.`,
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
      txInMonth(txs, monthKey)
        .filter((t) => t.expense && Number(t.date.slice(8, 10)) <= dayCut)
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
  const monthTx = txInMonth(flatten(input.logs), input.monthKey).filter((t) => t.expense)
  if (dayCut >= 7 && monthTx.length > 0) {
    const spendDays = new Set(monthTx.map((t) => t.date))
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
    savingsRateRule(input),
    lendingRule(input),
    anomalyRule(input),
    velocityRule(input),
    winRule(input, burndown),
  ].filter((i): i is Insight => i != null)
  return rankInsights(insights)
}
