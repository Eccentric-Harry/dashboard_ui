// Savings goals ("Saving for" on /finance) — the client's plan maths.
//
// The server stores only each goal's plan and derives its money from ledger rows carrying
// `goalId` (a Savings transfer out sets money aside, in takes it back, a spending row is
// the purchase). Everything the cards say is worked out here, pure and deterministic:
// what to set aside this payday, whether the goal is on pace, when it lands at the pace
// you actually save at, and whether the plan fits what you can spare.
//
// Guardrails (design/FINANCE_SAVINGS_GOALS_PLAN.md §9): nothing here ever moves money;
// "behind" is a fact with a next step, never a verdict; an unknown take-home is unknown,
// never ₹0.

import type { DailyFinancialLog, FinanceAccount, LendingRecord, SavingsGoal, SavingsGoalKind } from '@/types/finance'
import { addDaysIso, inr, isoDate, type Insight } from '@/lib/insights/engine'
import { flattenLogs, isFromSavings, type BudgetConfig, type LedgerEntry } from './finance-ledger'

export const DEFAULT_PAYDAY = 1
const DAY_MS = 86_400_000
export const DAYS_PER_MONTH = 30.4375
/** Transfers into these stay yours — never counted as money that left you. */
const KEPT_CATEGORIES = new Set(['savings', 'investment', 'investments'])

// ---------- Presentation constants ----------

/** Goal colours: keys into `.fin-goal--<key>` in finance-goals.css (dark derived from the light values). */
export const GOAL_COLORS = ['sage', 'sky', 'heather', 'sand', 'clay', 'teal'] as const
export type GoalColor = (typeof GOAL_COLORS)[number]

export const colorOf = (goal: Pick<SavingsGoal, 'color'>, index: number): GoalColor =>
  (GOAL_COLORS as readonly string[]).includes(goal.color ?? '') ? (goal.color as GoalColor) : GOAL_COLORS[index % GOAL_COLORS.length]

export const KIND_LABEL: Record<SavingsGoalKind, string> = {
  PURCHASE: 'Something to buy',
  TRIP: 'A trip or event',
  SAFETY_NET: 'Safety net',
  OPEN: 'Just saving',
}

// ---------- Dates ('YYYY-MM-DD', local) ----------

const parse = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export const daysBetween = (a: string, b: string): number => Math.round((parse(b).getTime() - parse(a).getTime()) / DAY_MS)

/** The payday in a given month; a payday of 31 falls on the month's last day. */
export function paydayIn(year: number, month0: number, payday: number): string {
  const last = new Date(year, month0 + 1, 0).getDate()
  return isoDate(new Date(year, month0, Math.min(Math.max(1, payday), last)))
}

/** The most recent payday on or before `today`. */
export function lastPayday(today: string, payday: number): string {
  const t = parse(today)
  const thisMonth = paydayIn(t.getFullYear(), t.getMonth(), payday)
  return thisMonth <= today ? thisMonth : paydayIn(t.getFullYear(), t.getMonth() - 1, payday)
}

/** Paydays strictly after `from` and on or before `to`, ascending. */
export function paydaysAfter(from: string, to: string, payday: number): string[] {
  const out: string[] = []
  if (to <= from) return out
  const f = parse(from)
  for (let i = 0; i < 600; i++) {
    const day = paydayIn(f.getFullYear(), f.getMonth() + i, payday)
    if (day > to) break
    if (day > from) out.push(day)
  }
  return out
}

/** The n-th payday after `today` (n = 1 is the next one). */
export function nthPaydayAfter(today: string, n: number, payday: number): string {
  const t = parse(today)
  let count = 0
  for (let i = 0; i < 600; i++) {
    const day = paydayIn(t.getFullYear(), t.getMonth() + i, payday)
    if (day > today && ++count === n) return day
  }
  return addDaysIso(today, Math.round(n * DAYS_PER_MONTH))
}

/** Is `today` within `days` of the last payday — the window the payday plan is shown in. */
export const inPaydayWindow = (today: string, payday: number, days = 6): boolean =>
  daysBetween(lastPayday(today, payday), today) <= days

// ---------- One goal ----------

/**
 * - ready: saved ≥ target, waiting to be bought or spent.
 * - ahead / on-track / behind: a goal with a date, judged payday by payday.
 * - open: no date — the plan runs on a monthly amount.
 */
export type GoalState = 'ready' | 'ahead' | 'on-track' | 'behind' | 'open' | 'paused' | 'bought' | 'archived'

export interface GoalPlan {
  goal: SavingsGoal
  target: number | null
  saved: number
  /** What's still needed; null for an open goal with no target. */
  remaining: number | null
  /** 0–1; null without a target. */
  progress: number | null
  state: GoalState
  /** The monthly figure the plan asks for from now: re-planned over the paydays left with a date, plannedMonthly without. */
  monthlyNeed: number | null
  /** Pay cycles left including this one; null without a date. 0 once the date has passed. */
  paydaysLeft: number | null
  /** Where the straight payday-by-payday line says you should be before this cycle's set-aside. */
  expectedByNow: number | null
  /** How far behind the line (positive), in rupees — only when behind. */
  behindBy: number | null
  /** behindBy in days of saving at the original plan's pace. */
  behindDays: number | null
  /** The pace you actually save at (₹ a month), and where it came from. */
  pace: number | null
  paceSource: 'history' | 'planned' | null
  /** When it lands at `pace` — or at `monthlyNeed` before there's any history. */
  projectedDate: string | null
  /** Set aside (net) since the last payday. */
  thisCycle: number
  /** Still to set aside in this pay cycle. */
  dueThisCycle: number
  /** The target date has passed with money still to go. */
  overdue: boolean
}

interface PlanContext {
  /** Every loaded ledger row (any month) — the goal's own rows are picked out by goalId. */
  entries: LedgerEntry[]
  today: string
  payday?: number | null
}

/** Net set aside for a goal within [from, to] — set-asides minus take-outs (a purchase's release included). */
function netSetAside(rows: LedgerEntry[], from: string, to: string): number {
  let net = 0
  for (const r of rows) {
    if (r.day < from || r.day > to) continue
    if (r.kind === 'transfer-out') net += r.amount
    else if (r.kind === 'transfer-in') net -= r.amount
  }
  return net
}

/**
 * When `remaining` is covered at `monthly` a payday: this cycle counts first if its
 * set-aside is still to come, then each payday after today.
 */
export function landingDate(
  remaining: number,
  monthly: number,
  today: string,
  payday: number,
  thisCycleDone: boolean,
): string | null {
  if (remaining <= 0) return today
  if (monthly <= 0) return null
  const slots = Math.ceil(remaining / monthly - 1e-9)
  const n = thisCycleDone ? slots : slots - 1
  if (n > 600) return null
  return n <= 0 ? today : nthPaydayAfter(today, n, payday)
}

export function planGoal(goal: SavingsGoal, { entries, today, payday: rawPayday }: PlanContext): GoalPlan {
  const payday = rawPayday ?? DEFAULT_PAYDAY
  const target = goal.targetAmount && goal.targetAmount > 0 ? goal.targetAmount : null
  const saved = Math.max(0, goal.saved)
  const remaining = target != null ? Math.max(0, target - saved) : null
  const progress = target != null ? Math.min(1, saved / target) : null
  const rows = entries.filter((e) => e.goalId === goal.id)
  const cycleStart = lastPayday(today, payday)
  const thisCycle = Math.max(0, netSetAside(rows, cycleStart, today))

  const base: GoalPlan = {
    goal,
    target,
    saved,
    remaining,
    progress,
    state: 'open',
    monthlyNeed: null,
    paydaysLeft: null,
    expectedByNow: null,
    behindBy: null,
    behindDays: null,
    pace: null,
    paceSource: null,
    projectedDate: null,
    thisCycle,
    dueThisCycle: 0,
    overdue: false,
  }
  if (goal.status === 'BOUGHT') return { ...base, state: 'bought', progress: target != null ? 1 : null }
  if (goal.status === 'ARCHIVED') return { ...base, state: 'archived' }

  // The pace you really save at: the last three *completed* pay cycles (fewer if the goal
  // is younger), so a set-aside is never cut off by a window edge and the cycle in
  // progress never counts half-done. Before one full cycle, what you planned.
  const start = goal.startDate ?? goal.firstContributionDate ?? today
  const startCycle = lastPayday(start, payday)
  const back = parse(cycleStart)
  const threeBack = paydayIn(back.getFullYear(), back.getMonth() - 3, payday)
  const windowStart = threeBack > startCycle ? threeBack : startCycle
  const cycles = paydaysAfter(windowStart, cycleStart, payday).length
  const recent = cycles > 0 ? netSetAside(rows, windowStart, addDaysIso(cycleStart, -1)) : 0
  let pace: number | null = null
  let paceSource: GoalPlan['paceSource'] = null
  if (cycles > 0 && recent > 0) {
    pace = recent / cycles
    paceSource = 'history'
  } else if (goal.plannedMonthly && goal.plannedMonthly > 0) {
    pace = goal.plannedMonthly
    paceSource = 'planned'
  }

  if (goal.status === 'PAUSED') {
    return { ...base, state: 'paused', pace, paceSource }
  }

  if (target != null && saved >= target) {
    return { ...base, state: 'ready', pace, paceSource, projectedDate: today }
  }

  // ── No date: a monthly amount drives it ───────────────────────────────────
  if (!goal.targetDate) {
    const monthly = goal.plannedMonthly && goal.plannedMonthly > 0 ? goal.plannedMonthly : null
    const projectionPace = pace ?? monthly
    return {
      ...base,
      state: 'open',
      monthlyNeed: monthly,
      pace,
      paceSource,
      dueThisCycle: monthly != null ? Math.max(0, monthly - thisCycle) : 0,
      projectedDate:
        remaining != null && projectionPace
          ? landingDate(remaining, projectionPace, today, payday, monthly != null && thisCycle >= monthly)
          : null,
    }
  }

  // ── A date: judged payday by payday ───────────────────────────────────────
  // Slot 1 is the cycle the goal started in; every payday after that up to the date is
  // another. The current cycle's set-aside is "due", not "behind" — payday morning
  // shouldn't read as falling short.
  const targetDate = goal.targetDate
  const totalSlots = 1 + paydaysAfter(start, targetDate, payday).length
  const overdue = targetDate < today
  const slotsBegun = Math.min(totalSlots, 1 + paydaysAfter(start, today, payday).length)
  const slotsLeft = overdue ? 0 : totalSlots - slotsBegun + 1
  const neededThisCycleStart = (remaining ?? 0) + thisCycle
  const monthlyNeed = slotsLeft > 0 ? neededThisCycleStart / slotsLeft : remaining ?? 0
  const expectedByNow = target != null ? (target * (slotsBegun - 1)) / totalSlots : null
  const shortfall = expectedByNow != null ? expectedByNow - (saved - thisCycle) : 0
  // A little slack so a rounding-sized gap never reads as behind.
  const slack = target != null ? Math.max(target * 0.02, 100) : 100
  const originalMonthly = target != null ? target / totalSlots : null
  const behind = overdue || shortfall > slack
  const ahead = !behind && expectedByNow != null && target != null && saved >= (target * slotsBegun) / totalSlots + slack
  const behindBy = overdue ? remaining : behind ? shortfall : null
  const projectionPace = pace ?? monthlyNeed

  return {
    ...base,
    state: behind ? 'behind' : ahead ? 'ahead' : 'on-track',
    monthlyNeed,
    paydaysLeft: slotsLeft,
    expectedByNow,
    behindBy,
    behindDays:
      behindBy != null && originalMonthly ? Math.max(1, Math.round((behindBy / originalMonthly) * DAYS_PER_MONTH)) : null,
    pace,
    paceSource,
    projectedDate:
      remaining != null && projectionPace > 0
        ? landingDate(remaining, projectionPace, today, payday, thisCycle >= monthlyNeed)
        : null,
    dueThisCycle: Math.max(0, monthlyNeed - thisCycle),
    overdue,
  }
}

/** Live goals in board order (priority, then name), each with its plan. */
export function planGoals(goals: SavingsGoal[], ctx: PlanContext): GoalPlan[] {
  return [...goals]
    .filter((g) => g.status !== 'ARCHIVED')
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
    .map((g) => planGoal(g, ctx))
}

/** Goals still being saved for — not paused, bought, archived or already reached. */
export const isSaving = (plan: GoalPlan): boolean =>
  plan.state === 'ahead' || plan.state === 'on-track' || plan.state === 'behind' || plan.state === 'open'

// ---------- What you can spare ----------

export interface MonthCapacity {
  takeHome: number | null
  takeHomeSource: 'declared' | 'logged' | null
  /** A typical month's spending (goal purchases excluded): last three months, or the budget if that's higher. */
  spending: number
  /** A typical month of money that leaves you without being spending — sent home, lent. */
  sentHome: number
  /** take-home − spending − sent home; null while take-home is unknown. */
  spare: number | null
  /** Each goal's monthly need, in funding order. */
  goals: { plan: GoalPlan; need: number }[]
  committed: number
  /** spare − every goal's need; null while take-home is unknown. */
  free: number | null
  /** How many past months the typical figures come from. */
  monthsOfHistory: number
}

interface CapacityInput {
  account: Pick<FinanceAccount, 'monthlyBudget' | 'takeHomeMonthly'> | null
  entries: LedgerEntry[]
  config: BudgetConfig
  plans: GoalPlan[]
  today: string
  /** Monthly cost of tracked bills — the floor for fixed costs under an everyday (FLEX) budget. */
  billsMonthly?: number
}

const monthKeyBefore = (today: string, back: number): string => {
  const t = parse(today)
  const d = new Date(t.getFullYear(), t.getMonth() - back, 1)
  return isoDate(d).slice(0, 7)
}

const mean = (values: number[]): number => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0)

/**
 * The capacity waterfall: take-home, minus a typical month of spending and money sent
 * home, is what you can spare; goals are funded from it in board order.
 */
export function monthCapacity({ account, entries, config, plans, today, billsMonthly = 0 }: CapacityInput): MonthCapacity {
  const months = [1, 2, 3].map((back) => monthKeyBefore(today, back))
  const perMonth = months
    .map((key) => {
      const rows = entries.filter((e) => e.day.startsWith(key))
      if (rows.length === 0) return null
      let spending = 0
      let fixed = 0
      let sentHome = 0
      let income = 0
      for (const e of rows) {
        if (e.kind === 'spending' && !isFromSavings(e)) {
          spending += e.amount
          if (e.subscriptionId || config.fixedCategories.some((c) => c.toLowerCase() === e.category.toLowerCase())) fixed += e.amount
        } else if (e.kind === 'transfer-out' && !e.goalId && !KEPT_CATEGORIES.has(e.category.toLowerCase())) {
          sentHome += e.amount
        } else if (e.kind === 'income') {
          income += e.amount
        }
      }
      return { spending, fixed, sentHome, income }
    })
    .filter((m): m is NonNullable<typeof m> => m != null)

  const budget = account?.monthlyBudget ?? 0
  const typicalFixed = Math.max(mean(perMonth.map((m) => m.fixed)), billsMonthly)
  const planned = budget > 0 ? (config.scope === 'FLEX' ? budget + typicalFixed : budget) : 0
  const spending = Math.max(mean(perMonth.map((m) => m.spending)), planned)
  const sentHome = mean(perMonth.map((m) => m.sentHome))

  const loggedIncome = mean(perMonth.map((m) => m.income).filter((v) => v > 0))
  const declared = account?.takeHomeMonthly && account.takeHomeMonthly > 0 ? account.takeHomeMonthly : null
  const takeHome = declared ?? (loggedIncome > 0 ? loggedIncome : null)
  const takeHomeSource = declared != null ? 'declared' : loggedIncome > 0 ? 'logged' : null

  const goals = plans.filter(isSaving).map((plan) => ({ plan, need: plan.monthlyNeed ?? 0 }))
  const committed = goals.reduce((s, g) => s + g.need, 0)
  const spare = takeHome != null ? takeHome - spending - sentHome : null

  return {
    takeHome,
    takeHomeSource,
    spending,
    sentHome,
    spare,
    goals,
    committed,
    free: spare != null ? spare - committed : null,
    monthsOfHistory: perMonth.length,
  }
}

/** What's left for this goal after the goals funded before it; null while take-home is unknown. */
export function roomFor(plan: GoalPlan, capacity: MonthCapacity): number | null {
  if (capacity.spare == null) return null
  let before = 0
  for (const g of capacity.goals) {
    if (g.plan.goal.id === plan.goal.id) break
    before += g.need
  }
  return capacity.spare - before
}

// ---------- The monthly rhythm ----------

export interface PaydayLine {
  plan: GoalPlan
  amount: number
}

/** This cycle's set-asides still to do, in funding order — the payday plan. */
export const paydayPlan = (plans: GoalPlan[]): PaydayLine[] =>
  plans.filter((p) => isSaving(p) && p.dueThisCycle >= 1).map((plan) => ({ plan, amount: Math.round(plan.dueThisCycle) }))

/** "≈ 4 days of iPhone saving": a spend measured in the goal's own pace. */
export function goalDays(amount: number, plan: GoalPlan): number | null {
  const monthly = plan.monthlyNeed ?? plan.pace
  if (!monthly || monthly <= 0) return null
  return (amount / monthly) * DAYS_PER_MONTH
}

/** The goal a spend is measured against: the first one still being saved for with a monthly figure. */
export const leadGoal = (plans: GoalPlan[]): GoalPlan | null =>
  plans.find((p) => isSaving(p) && ((p.monthlyNeed ?? 0) > 0 || (p.pace ?? 0) > 0)) ?? null

export interface LeftoverOffer {
  /** The finished month, 'YYYY-MM'. */
  monthKey: string
  monthName: string
  amount: number
  /** The note the sweep's set-aside carries ("September leftover") — also how a done sweep is recognised. */
  note: string
}

/**
 * Early in a month, what last month's budget left unspent — offered to a goal in one tap.
 * Gone once any goal has a set-aside carrying the note.
 */
export function leftoverOffer({
  entries,
  config,
  budget,
  today,
}: {
  entries: LedgerEntry[]
  config: BudgetConfig
  budget: number | null
  today: string
}): LeftoverOffer | null {
  if (!budget || budget <= 0 || Number(today.slice(8, 10)) > 10) return null
  const monthKey = monthKeyBefore(today, 1)
  const rows = entries.filter((e) => e.day.startsWith(monthKey))
  if (rows.length === 0) return null
  let budgeted = 0
  for (const e of rows) {
    if (e.kind !== 'spending' || e.goalId) continue
    const fixed = Boolean(e.subscriptionId) || config.fixedCategories.some((c) => c.toLowerCase() === e.category.toLowerCase())
    if (config.scope === 'ALL' || !fixed) budgeted += e.amount
  }
  const amount = Math.floor((budget - budgeted) / 10) * 10
  if (amount < 100) return null
  const monthName = parse(`${monthKey}-01`).toLocaleDateString('en-US', { month: 'long' })
  const note = `${monthName} leftover`
  const swept = entries.some((e) => e.goalId && e.kind === 'transfer-out' && e.description.includes(note))
  return swept ? null : { monthKey, monthName, amount, note }
}

/** Money friends owe you — a lever: earmark it for a goal when it comes back. */
export const owedToYou = (lending: Pick<LendingRecord, 'amount' | 'status'>[] | null): number =>
  (lending ?? []).filter((l) => l.status !== 'Repaid').reduce((s, l) => s + (Number(l.amount) || 0), 0)

// ---------- Copy ----------

export const shortDate = (iso: string): string =>
  parse(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })

/** "Apr '27" — a landing month. */
export const monthYear = (iso: string): string => {
  const d = parse(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-US', { month: 'short' }) + (sameYear ? '' : ` '${String(d.getFullYear()).slice(2)}`)
}

/** "about 3 weeks" / "about 2 months" — a gap in days, said the way a person would. */
export function spanWords(days: number): string {
  const d = Math.max(1, Math.round(days))
  if (d < 10) return `${d} day${d === 1 ? '' : 's'}`
  if (d < 56) return `${Math.round(d / 7)} weeks`
  return `${Math.round(d / DAYS_PER_MONTH)} months`
}

/**
 * Apple launches in September and the outgoing model's price drops after. A purchase
 * landing in August–September is worth a nudge to look at the timing.
 */
export const nearAppleLaunch = (goal: Pick<SavingsGoal, 'kind' | 'name'>, landing: string | null): boolean =>
  goal.kind === 'PURCHASE' && /iphone|ipad|apple|macbook|airpods|watch/i.test(goal.name) && landing != null && ['08', '09'].includes(landing.slice(5, 7))

// ---------- Home ----------

/**
 * What /home says about savings goals — two moments, never a nag: the payday plan while
 * it's due (pay yourself first, before the month spends it), and a goal that's fully
 * saved. A goal falling behind is told on /finance, with its next step, not on Home.
 * Home only loads a short log window, which covers the payday window this needs.
 */
export function savingsGoalInsights({
  goals,
  logs,
  today,
  payday: rawPayday,
}: {
  goals: SavingsGoal[] | null
  logs: DailyFinancialLog[] | null
  today: string
  payday: number | null | undefined
}): Insight[] {
  if (!goals?.length) return []
  const payday = rawPayday ?? DEFAULT_PAYDAY
  const plans = planGoals(goals, { entries: flattenLogs(logs ?? []), today, payday })
  const out: Insight[] = []

  const lines = paydayPlan(plans)
  if (lines.length > 0 && inPaydayWindow(today, payday)) {
    const total = lines.reduce((s, l) => s + l.amount, 0)
    const first = lines[0]
    out.push({
      id: 'fin-goal-payday',
      domain: 'finance',
      kind: 'forecast',
      sentiment: 'neutral',
      icon: 'wallet',
      title:
        lines.length === 1
          ? `Payday: set aside ${inr(total)} for ${first.plan.goal.name}${first.plan.goal.keptAt ? ` (${first.plan.goal.keptAt})` : ''}.`
          : `Payday: set aside ${inr(total)} across ${lines.length} goals — ${inr(first.amount)} to ${first.plan.goal.name} first.`,
      detail: lines.map((l) => `${l.plan.goal.name} ${inr(l.amount)}${l.plan.goal.keptAt ? ` → ${l.plan.goal.keptAt}` : ''}`).join(' · '),
      sampleWindow: 'this pay cycle',
      action: { label: 'Set it aside', route: '/finance', search: '?plan=payday' },
      confidence: 'high',
      effect: 0.5,
    })
  }

  const ready = plans.find((p) => p.state === 'ready')
  if (ready) {
    out.push({
      id: `fin-goal-ready-${ready.goal.id}`,
      domain: 'finance',
      kind: 'win',
      sentiment: 'positive',
      icon: 'trophy',
      title: `${ready.goal.name} is fully saved — ${inr(ready.saved)} set aside.`,
      detail: `Target ${inr(ready.target ?? ready.saved)}. Record the purchase on /finance when you buy; it never counts against your budget.`,
      sampleWindow: 'savings goals',
      action: { label: 'Open goal', route: '/finance', search: `?goal=${ready.goal.id}` },
      confidence: 'high',
      effect: 0.4,
    })
  }
  return out
}
