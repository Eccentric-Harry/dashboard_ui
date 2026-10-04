// Formatting and copy for /goals. Everything the route says about a goal comes through
// here, so the voice stays in one place: state the fact, then offer the smaller next
// step — never a verdict, never guilt (design/GOALS_BUDDY_PLAN.md, guardrail 3).

import type { Goal, GoalMeasure, GoalPeriod, GoalProgressView } from '@/types/goals'

/** The most goals the board holds (GoalService.MAX_ACTIVE_GOALS). */
export const MAX_ACTIVE_GOALS = 8

/** The four shapes the goal modal offers, and how each maps onto measure × period. */
export type GoalShape = 'daily-amount' | 'daily-check' | 'times-week' | 'weekly-total'

export const SHAPES: { id: GoalShape; label: string; example: string; measure: GoalMeasure; period: GoalPeriod }[] = [
  { id: 'daily-amount', label: 'Every day, an amount', example: '10 pages a day', measure: 'COUNT', period: 'DAY' },
  { id: 'daily-check', label: 'Every day, just do it', example: 'Ten quiet minutes', measure: 'CHECK', period: 'DAY' },
  { id: 'times-week', label: 'A few times a week', example: 'Move 3 times a week', measure: 'CHECK', period: 'WEEK' },
  { id: 'weekly-total', label: 'A weekly total', example: '7 hours of learning', measure: 'COUNT', period: 'WEEK' },
]

export function shapeOf(goal: Pick<Goal, 'measure' | 'period'>): GoalShape {
  if (goal.period === 'DAY') return goal.measure === 'COUNT' ? 'daily-amount' : 'daily-check'
  return goal.measure === 'COUNT' ? 'weekly-total' : 'times-week'
}

/** Day-counted goals keep a week by hit days; only a weekly total sums amounts. */
export const countsDays = (goal: Pick<Goal, 'measure' | 'period'>) => shapeOf(goal) !== 'weekly-total'

// ── Dates ────────────────────────────────────────────────────────────────

/** Hours before this still belong to yesterday — a late-night chapter counts for its evening. */
export const DAY_ROLLOVER_HOUR = 4

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** The local goal-day: today, or yesterday before 04:00. */
export function goalDay(now: Date = new Date()): string {
  const d = new Date(now)
  if (d.getHours() < DAY_ROLLOVER_HOUR) d.setDate(d.getDate() - 1)
  return iso(d)
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return iso(new Date(y, m - 1, d + days))
}

const asDate = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** ISO-8601 week number of a day. */
export function isoWeek(day: string): number {
  const d = asDate(day)
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const firstThursday = new Date(thursday.getFullYear(), 0, 4)
  return 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
}

/** "Wed 30 Sep" */
export const dayLabel = (day: string) =>
  asDate(day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

/** "Wed" */
export const weekdayShort = (day: string) => asDate(day).toLocaleDateString('en-GB', { weekday: 'short' })

/** "M" … "S" */
export const weekdayLetter = (day: string) => weekdayShort(day).charAt(0)

/** "29 Sep – 5 Oct" */
export function weekRangeLabel(weekStart: string): string {
  const fmt = (d: string) => asDate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(weekStart)} – ${fmt(addDays(weekStart, 6))}`
}

/** "Today", "Yesterday", else "Mon". */
export function relativeDay(day: string, today: string): string {
  if (day === today) return 'Today'
  if (day === addDays(today, -1)) return 'Yesterday'
  return weekdayShort(day)
}

// ── Amounts ──────────────────────────────────────────────────────────────

const isMinutes = (unit?: string | null) => !!unit && /^(min|mins|minutes?)$/i.test(unit.trim())

/** Whole numbers stay whole; otherwise one decimal, trimmed. */
export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return (Math.round(n * 10) / 10).toString()
}

/** "10 pages", "2h 30m", "45 min", "3". Minutes read as hours once they reach an hour. */
export function formatAmount(value: number, unit?: string | null): string {
  if (isMinutes(unit)) {
    const total = Math.round(value)
    if (total < 60) return `${total} min`
    const h = Math.floor(total / 60)
    const m = total % 60
    return m ? `${h}h ${m}m` : `${h}h`
  }
  return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value)
}

/** "6 of 10 pages" — the unit said once, on the target. */
export function formatProgress(value: number, target: number, unit?: string | null): string {
  if (isMinutes(unit)) return `${formatAmount(value, unit)} of ${formatAmount(target, unit)}`
  return `${formatNumber(value)} of ${formatAmount(target, unit)}`
}

/** A goal's rule in a few words: "10 pages · 5 of 7 days", "3 times a week", "7h a week". */
export function ruleLabel(goal: Goal): string {
  switch (shapeOf(goal)) {
    case 'daily-amount':
      return `${formatAmount(goal.target, goal.unit)} a day · ${goal.daysPerWeek ?? 7} of 7 days`
    case 'daily-check':
      return goal.daysPerWeek === 7 ? 'Every day' : `${goal.daysPerWeek ?? 7} of 7 days`
    case 'times-week':
      return goal.target === 1 ? 'Once a week' : `${formatNumber(goal.target)} times a week`
    case 'weekly-total':
      return `${formatAmount(goal.target, goal.unit)} a week`
  }
}

/** The week's standing in the goal's own terms: "3 of 5 days", "150 of 420 min". */
export function weekProgressLabel(view: GoalProgressView): string {
  const { week, goal } = view
  if (countsDays(goal)) {
    const noun = shapeOf(goal) === 'times-week' ? 'times' : 'days'
    return `${formatNumber(week.value)} of ${formatNumber(week.target)} ${noun}`
  }
  return formatProgress(week.value, week.target, goal.unit)
}

/** How far through the week's rule, 0–1 (capped). */
export const weekRatio = (view: GoalProgressView) =>
  view.week.target > 0 ? Math.min(1, view.week.value / view.week.target) : 0

// ── Pace, in words ───────────────────────────────────────────────────────

/** Days still needed for a day-counted goal this week. */
export const daysNeeded = (view: GoalProgressView) =>
  Math.max(0, Math.ceil(view.week.target - view.week.value - 1e-9))

/**
 * One honest sentence about where a goal stands this week. Behind is said plainly, with
 * the smallest step that fixes it; out of reach is a clean page, never a failure.
 */
export function paceSentence(view: GoalProgressView): string {
  const { goal, week } = view
  const need = daysNeeded(view)
  switch (week.pace) {
    case 'KEPT':
      return view.weekStreak > 1 ? `Kept — ${view.weekStreak} weeks in a row.` : 'Kept for this week.'
    case 'ON_PACE':
      if (!countsDays(goal)) {
        return week.perDayToFinish != null && week.value > 0
          ? `About ${formatAmount(Math.ceil(week.perDayToFinish), goal.unit)} a day finishes it.`
          : 'Plenty of week left.'
      }
      return `${need} more ${need === 1 ? 'day' : 'days'}, ${week.daysLeft} left to find them.`
    case 'TIGHT':
      return need === 1 ? 'One more day keeps it — today would do.' : `Needs each of the ${need} days left.`
    case 'BEHIND':
      return week.perDayToFinish != null
        ? `About ${formatAmount(Math.ceil(week.perDayToFinish), goal.unit)} a day still keeps it.`
        : 'A little behind, still well within reach.'
    case 'OUT_OF_REACH':
      return week.value > 0 ? 'Every bit still counts. Next week’s a clean page.' : 'This one rests this week. Monday’s a clean page.'
  }
}

// ── The page headline ────────────────────────────────────────────────────

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight']
const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n)

export interface BoardHeadline {
  title: string
  line: string
}

/** The header's finding: what the week looks like, then the one fact most worth acting on. */
export function boardHeadline(goals: GoalProgressView[], today: string, weekStart: string): BoardHeadline {
  if (goals.length === 0) {
    return { title: 'Set your first goal', line: 'Weeks are forgiving by design — a quiet day never undoes one.' }
  }
  const n = goals.length
  const kept = goals.filter((g) => g.week.pace === 'KEPT').length
  const onPace = goals.filter((g) => g.week.pace === 'KEPT' || g.week.pace === 'ON_PACE').length
  const anyProgress = goals.some((g) => g.week.value > 0)

  let title: string
  if (kept === n) title = n === 1 ? 'Kept for the week' : `All ${n} kept this week`
  else if (today === weekStart && !anyProgress) title = 'A clean week starts today'
  else if (onPace === n) title = n === 1 ? 'Right on pace' : `All ${n} on pace`
  else title = `${numberWord(onPace)} of ${numberWord(n).toLowerCase()} on pace`

  const byTitle = (g: GoalProgressView) => g.goal.title
  const tight = goals.find((g) => g.week.pace === 'TIGHT')
  const behind = goals.find((g) => g.week.pace === 'BEHIND')
  const justKept = goals.find((g) => g.week.pace === 'KEPT' && g.weekStreak > 1)
  const doneToday = goals.filter((g) => g.today.hit).length

  let line: string
  if (kept === n) line = 'Anything more this week is a bonus.'
  else if (tight) line = `${byTitle(tight)}: ${paceSentence(tight).toLowerCase()}`
  else if (behind) line = `${byTitle(behind)} is a little behind — ${paceSentence(behind).toLowerCase()}`
  else if (justKept) line = `${byTitle(justKept)} is kept, ${justKept.weekStreak} weeks running.`
  else if (doneToday > 0) line = `${numberWord(doneToday)} moved forward today already.`
  else line = 'Nothing’s slipping. One small thing today keeps it that way.'

  return { title, line }
}
