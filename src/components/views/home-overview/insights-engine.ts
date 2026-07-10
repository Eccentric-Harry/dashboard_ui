// Deterministic cross-domain insights for the Home route. Plain explainable
// stats only — means, bucket deltas, Pearson correlation — computed locally
// from the day records the page already fetched. No network calls, no ML.

import type {
  DailyFinancialLog,
  DailyLog,
  DailyTask,
  FocusDaySummary,
  LearningsSummary,
  SleepEntry,
  StravaActivity,
} from '../../../lib/api'
import type { NutritionSummary, SpendingSummary } from './home-types'
import { formatMinutes, lastNDates, shortDayLabel, SLEEP_TARGET_MINUTES } from './home-types'

export const INSIGHT_WINDOW_DAYS = 7
/** Minimum paired days before a correlation rule may speak. */
const MIN_PAIRED_DAYS = 5
/** Minimum days per bucket for a split comparison. */
const MIN_BUCKET_DAYS = 2
const MAX_VISIBLE_INSIGHTS = 4

export type InsightSentiment = 'positive' | 'neutral' | 'watch'

export type InsightDomain =
  | 'sleep'
  | 'focus'
  | 'mood'
  | 'tasks'
  | 'nutrition'
  | 'finance'
  | 'workout'

export interface HomeInsight {
  id: string
  domain: InsightDomain
  text: string
  /** The underlying numbers, shown by the "Why?" expand. */
  detail: string
  sampleDays: number
  sentiment: InsightSentiment
  /** Normalized |effect size| used only for ranking. */
  effect: number
}

export interface DayRecord {
  date: string
  /** Night ending on this morning; null when not logged. */
  sleepMinutes: number | null
  focusMinutes: number
  moodScore: number | null
  tasksCompleted: number
  tasksTotal: number
  /** Tasks dated before this day that were still open as of this day. */
  overdueCarried: number
  workouts: number
  proteinGrams: number | null
  foodSpend: number | null
  learnings: number
}

interface DayRecordSources {
  days: string[]
  sleep: SleepEntry[] | null
  focus: FocusDaySummary[] | null
  moods: DailyLog[] | null
  tasks: DailyTask[] | null
  workouts: StravaActivity[] | null
  nutrition: NutritionSummary | null
  finance: DailyFinancialLog[] | null
  learnings: LearningsSummary | null
}

const FOOD_CATEGORY_PATTERN = /food|meal|grocer|snack|restaurant|dining|swiggy|zomato/i

export function buildDayRecords(sources: DayRecordSources): DayRecord[] {
  const sleepByDate = new Map((sources.sleep ?? []).map((s) => [s.date, s]))
  const focusByDate = new Map((sources.focus ?? []).map((f) => [f.date, f]))
  const moodByDate = new Map(
    (sources.moods ?? []).filter((m) => m.date != null).map((m) => [String(m.date), m]),
  )
  const learningsByDate = new Map(
    (sources.learnings?.timeline ?? []).map((t) => [t.date, t.learningsCount]),
  )

  const workoutsByDate = new Map<string, number>()
  for (const activity of sources.workouts ?? []) {
    workoutsByDate.set(activity.date, (workoutsByDate.get(activity.date) ?? 0) + 1)
  }

  const foodSpendByDate = new Map<string, number>()
  for (const log of sources.finance ?? []) {
    let spend = 0
    for (const [category, transactions] of Object.entries(log.transactions ?? {})) {
      if (!FOOD_CATEGORY_PATTERN.test(category)) continue
      for (const tx of transactions) {
        if (tx.type === 'Expense') spend += tx.amount
      }
    }
    foodSpendByDate.set(log.date, spend)
  }

  return sources.days.map((date) => {
    const dayTasks = (sources.tasks ?? []).filter((t) => t.date === date)
    const overdueCarried = (sources.tasks ?? []).filter((t) => {
      if (!t.date || t.date >= date) return false
      if (!t.completed) return true
      // Completed later than this day means it was still carried on this day.
      return Boolean(t.completedAt && t.completedAt.slice(0, 10) > date)
    }).length

    return {
      date,
      sleepMinutes: sleepByDate.get(date)?.durationMinutes ?? null,
      focusMinutes: focusByDate.get(date)?.totalMinutes ?? 0,
      moodScore: moodByDate.get(date)?.moodScore ?? null,
      tasksCompleted: dayTasks.filter((t) => t.completed).length,
      tasksTotal: dayTasks.length,
      overdueCarried,
      workouts: workoutsByDate.get(date) ?? 0,
      proteinGrams: sources.nutrition?.dailyProtein?.[date] ?? null,
      foodSpend: sources.finance ? (foodSpendByDate.get(date) ?? 0) : null,
      learnings: learningsByDate.get(date) ?? 0,
    }
  })
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let cov = 0
  let varX = 0
  let varY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    cov += dx * dy
    varX += dx * dx
    varY += dy * dy
  }
  if (varX === 0 || varY === 0) return null
  return cov / Math.sqrt(varX * varY)
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

interface InsightContext {
  proteinGoal: number | null
  spending: SpendingSummary | null
  workoutStreakWeeks: number
  learningStreakDays: number
}

export function generateInsights(records: DayRecord[], ctx: InsightContext): HomeInsight[] {
  const insights: HomeInsight[] = []

  const push = (insight: HomeInsight | null) => {
    if (insight) insights.push(insight)
  }

  push(sleepVsFocus(records))
  push(sleepVsMood(records))
  push(workoutsVsFoodSpend(records))
  push(overdueVsFocus(records))
  push(proteinVsFocus(records, ctx.proteinGoal))

  insights.sort((a, b) => b.effect - a.effect)

  const positive = bestPositive(records, ctx)
  let visible = insights.slice(0, MAX_VISIBLE_INSIGHTS)
  if (positive && !visible.some((i) => i.sentiment === 'positive')) {
    visible = [...visible.slice(0, MAX_VISIBLE_INSIGHTS - 1), positive]
  }
  return visible
}

/** Days that carry at least one loggable signal — powers the "n of 7" hint. */
export function countActiveDays(records: DayRecord[]): number {
  return records.filter(
    (r) =>
      r.sleepMinutes != null ||
      r.moodScore != null ||
      r.focusMinutes > 0 ||
      r.tasksTotal > 0 ||
      r.workouts > 0 ||
      (r.proteinGrams ?? 0) > 0,
  ).length
}

// ---------- Rules ----------

function sleepVsFocus(records: DayRecord[]): HomeInsight | null {
  const paired = records.filter((r) => r.sleepMinutes != null)
  if (paired.length < MIN_PAIRED_DAYS) return null

  const shortLimit = SLEEP_TARGET_MINUTES - 60
  const short = paired.filter((r) => (r.sleepMinutes as number) < shortLimit)
  const rested = paired.filter((r) => (r.sleepMinutes as number) >= shortLimit)
  if (short.length < MIN_BUCKET_DAYS || rested.length < MIN_BUCKET_DAYS) return null

  const shortAvg = Math.round(mean(short.map((r) => r.focusMinutes)))
  const restedAvg = Math.round(mean(rested.map((r) => r.focusMinutes)))
  if (restedAvg === 0 && shortAvg === 0) return null
  const relDiff = Math.abs(restedAvg - shortAvg) / Math.max(restedAvg, shortAvg, 1)
  if (relDiff < 0.2) return null

  const shortLabel = formatMinutes(shortLimit).replace(' 00m', '')
  if (restedAvg > shortAvg) {
    return {
      id: 'sleep-focus',
      domain: 'sleep',
      text: `On nights under ${shortLabel}, your next-day focus averages ${shortAvg} min vs ${restedAvg} min after longer sleep.`,
      detail: `${short.length} short nights (avg focus ${shortAvg} min) vs ${rested.length} rested nights (avg focus ${restedAvg} min). Threshold: ${shortLabel} of sleep.`,
      sampleDays: paired.length,
      sentiment: 'watch',
      effect: relDiff,
    }
  }
  return {
    id: 'sleep-focus',
    domain: 'sleep',
    text: `Interesting: your focus has been holding up even after shorter nights (${shortAvg} min vs ${restedAvg} min).`,
    detail: `${short.length} short nights (avg focus ${shortAvg} min) vs ${rested.length} rested nights (avg focus ${restedAvg} min). Threshold: ${shortLabel} of sleep.`,
    sampleDays: paired.length,
    sentiment: 'neutral',
    effect: relDiff * 0.5,
  }
}

function sleepVsMood(records: DayRecord[]): HomeInsight | null {
  const paired = records.filter((r) => r.sleepMinutes != null && r.moodScore != null)
  if (paired.length < MIN_PAIRED_DAYS) return null

  const goodNights = paired.filter((r) => (r.sleepMinutes as number) >= 7 * 60)
  const shortNights = paired.filter((r) => (r.sleepMinutes as number) < 7 * 60)
  if (goodNights.length < MIN_BUCKET_DAYS || shortNights.length < MIN_BUCKET_DAYS) return null

  const goodMood = mean(goodNights.map((r) => r.moodScore as number))
  const shortMood = mean(shortNights.map((r) => r.moodScore as number))
  const diff = goodMood - shortMood
  if (Math.abs(diff) < 0.7) return null

  const r = pearson(
    paired.map((p) => p.sleepMinutes as number),
    paired.map((p) => p.moodScore as number),
  )
  if (diff > 0) {
    return {
      id: 'sleep-mood',
      domain: 'mood',
      text: `Your mood tends to be higher on days after 7h+ of sleep (${goodMood.toFixed(1)} vs ${shortMood.toFixed(1)} out of 5).`,
      detail: `${goodNights.length} nights ≥ 7h (avg mood ${goodMood.toFixed(1)}) vs ${shortNights.length} nights < 7h (avg mood ${shortMood.toFixed(1)})${r != null ? `; correlation r = ${r.toFixed(2)}` : ''}.`,
      sampleDays: paired.length,
      sentiment: 'neutral',
      effect: Math.abs(diff) / 5,
    }
  }
  return null
}

function workoutsVsFoodSpend(records: DayRecord[]): HomeInsight | null {
  const paired = records.filter((r) => r.foodSpend != null)
  if (paired.length < MIN_PAIRED_DAYS) return null

  const active = paired.filter((r) => r.workouts > 0)
  const restDays = paired.filter((r) => r.workouts === 0)
  if (active.length < MIN_BUCKET_DAYS || restDays.length < MIN_BUCKET_DAYS) return null

  const activeSpend = mean(active.map((r) => r.foodSpend as number))
  const restSpend = mean(restDays.map((r) => r.foodSpend as number))
  if (restSpend <= 0 && activeSpend <= 0) return null
  const relDiff = Math.abs(restSpend - activeSpend) / Math.max(restSpend, activeSpend)
  if (relDiff < 0.15) return null

  const pct = Math.round(relDiff * 100)
  if (activeSpend < restSpend) {
    return {
      id: 'workout-food-spend',
      domain: 'finance',
      text: `You spend about ${pct}% less on food on days you work out (₹${Math.round(activeSpend)} vs ₹${Math.round(restSpend)}).`,
      detail: `${active.length} workout days (avg food spend ₹${Math.round(activeSpend)}) vs ${restDays.length} rest days (avg ₹${Math.round(restSpend)}).`,
      sampleDays: paired.length,
      sentiment: 'positive',
      effect: relDiff,
    }
  }
  return {
    id: 'workout-food-spend',
    domain: 'finance',
    text: `Food spend runs about ${pct}% higher on workout days (₹${Math.round(activeSpend)} vs ₹${Math.round(restSpend)}) — fuel costs, worth knowing.`,
    detail: `${active.length} workout days (avg food spend ₹${Math.round(activeSpend)}) vs ${restDays.length} rest days (avg ₹${Math.round(restSpend)}).`,
    sampleDays: paired.length,
    sentiment: 'neutral',
    effect: relDiff * 0.6,
  }
}

function overdueVsFocus(records: DayRecord[]): HomeInsight | null {
  const paired = records.filter((r) => r.tasksTotal > 0 || r.overdueCarried > 0 || r.focusMinutes > 0)
  if (paired.length < MIN_PAIRED_DAYS) return null
  if (!paired.some((r) => r.overdueCarried > 0)) return null

  const r = pearson(
    paired.map((p) => p.overdueCarried),
    paired.map((p) => p.focusMinutes),
  )
  if (r == null || r > -0.4) return null

  const heavyDays = paired.filter((p) => p.overdueCarried > 0)
  const threshold = Math.max(1, Math.min(...heavyDays.map((p) => p.overdueCarried)))
  const heavyFocus = Math.round(mean(heavyDays.map((p) => p.focusMinutes)))
  const clearDays = paired.filter((p) => p.overdueCarried === 0)
  const clearFocus = clearDays.length > 0 ? Math.round(mean(clearDays.map((p) => p.focusMinutes))) : null

  return {
    id: 'overdue-focus',
    domain: 'tasks',
    text: `Focus dips on days you carry ${threshold}+ overdue tasks${clearFocus != null ? ` (${heavyFocus} min vs ${clearFocus} min on clear days)` : ''}.`,
    detail: `Correlation between carried overdue tasks and focus minutes: r = ${r.toFixed(2)} over ${paired.length} days. ${heavyDays.length} days carried overdue work${clearFocus != null ? `; ${clearDays.length} days were clear` : ''}.`,
    sampleDays: paired.length,
    sentiment: 'watch',
    effect: Math.abs(r),
  }
}

function proteinVsFocus(records: DayRecord[], proteinGoal: number | null): HomeInsight | null {
  if (!proteinGoal || proteinGoal <= 0) return null
  const paired = records.filter((r) => r.proteinGrams != null && (r.proteinGrams > 0 || r.tasksTotal > 0))
  if (paired.length < MIN_PAIRED_DAYS) return null

  const hit = paired.filter((r) => (r.proteinGrams as number) >= proteinGoal)
  const missed = paired.filter((r) => (r.proteinGrams as number) < proteinGoal)
  if (hit.length < MIN_BUCKET_DAYS || missed.length < MIN_BUCKET_DAYS) return null

  const hitFocus = Math.round(mean(hit.map((r) => r.focusMinutes)))
  const missedFocus = Math.round(mean(missed.map((r) => r.focusMinutes)))
  if (hitFocus === 0 && missedFocus === 0) return null
  const relDiff = Math.abs(hitFocus - missedFocus) / Math.max(hitFocus, missedFocus, 1)
  if (relDiff < 0.2 || hitFocus <= missedFocus) return null

  return {
    id: 'protein-focus',
    domain: 'nutrition',
    text: `On days you hit your protein goal you average ${hitFocus} min of focus, vs ${missedFocus} min when you miss it.`,
    detail: `${hit.length} goal-hit days (≥ ${proteinGoal}g, avg focus ${hitFocus} min) vs ${missed.length} days under goal (avg ${missedFocus} min).`,
    sampleDays: paired.length,
    sentiment: 'positive',
    effect: relDiff,
  }
}

/** The digest should never be all-negative: always try to surface one genuine win. */
function bestPositive(records: DayRecord[], ctx: InsightContext): HomeInsight | null {
  const candidates: HomeInsight[] = []

  const sleptNights = records.filter((r) => r.sleepMinutes != null)
  if (sleptNights.length > 0) {
    const best = sleptNights.reduce((a, b) =>
      (b.sleepMinutes as number) > (a.sleepMinutes as number) ? b : a,
    )
    if ((best.sleepMinutes as number) >= SLEEP_TARGET_MINUTES) {
      candidates.push({
        id: 'win-best-sleep',
        domain: 'sleep',
        text: `Best night this week: ${formatMinutes(best.sleepMinutes as number)} on ${shortDayLabel(best.date)} — right on target.`,
        detail: `Longest of ${sleptNights.length} logged nights; target is ${formatMinutes(SLEEP_TARGET_MINUTES)}.`,
        sampleDays: sleptNights.length,
        sentiment: 'positive',
        effect: 0.15,
      })
    }
  }

  const bestFocus = records.reduce((a, b) => (b.focusMinutes > a.focusMinutes ? b : a))
  if (bestFocus.focusMinutes >= 60) {
    candidates.push({
      id: 'win-focus-peak',
      domain: 'focus',
      text: `${formatMinutes(bestFocus.focusMinutes)} of deep focus on ${shortDayLabel(bestFocus.date)} — your peak this week.`,
      detail: `Highest single-day completed focus time in the last ${records.length} days.`,
      sampleDays: records.length,
      sentiment: 'positive',
      effect: 0.14,
    })
  }

  const workoutCount = records.reduce((sum, r) => sum + r.workouts, 0)
  if (workoutCount >= 3) {
    candidates.push({
      id: 'win-workouts',
      domain: 'workout',
      text: `${workoutCount} workouts this week${ctx.workoutStreakWeeks > 1 ? ` — that's ${ctx.workoutStreakWeeks} weeks in a row now` : ''}. Momentum is real.`,
      detail: `${workoutCount} activities across the ${records.length}-day window.`,
      sampleDays: records.length,
      sentiment: 'positive',
      effect: 0.13,
    })
  }

  const tasksDone = records.reduce((sum, r) => sum + r.tasksCompleted, 0)
  if (tasksDone >= 5) {
    candidates.push({
      id: 'win-tasks',
      domain: 'tasks',
      text: `You closed ${tasksDone} tasks this week. Quiet, steady progress.`,
      detail: `${tasksDone} completions across the ${records.length}-day window.`,
      sampleDays: records.length,
      sentiment: 'positive',
      effect: 0.12,
    })
  }

  if (ctx.learningStreakDays >= 3) {
    candidates.push({
      id: 'win-learning-streak',
      domain: 'focus',
      text: `${ctx.learningStreakDays} days of learning in a row — the streak is alive.`,
      detail: `Current learning streak from your learnings log.`,
      sampleDays: ctx.learningStreakDays,
      sentiment: 'positive',
      effect: 0.11,
    })
  }

  if (ctx.spending && ctx.spending.budgetRemaining > 0 && ctx.spending.totalSpent > 0) {
    candidates.push({
      id: 'win-budget',
      domain: 'finance',
      text: `You're ₹${Math.round(ctx.spending.budgetRemaining).toLocaleString('en-IN')} under budget this month.`,
      detail: `Spent ₹${Math.round(ctx.spending.totalSpent).toLocaleString('en-IN')} of ₹${Math.round(ctx.spending.monthlyBudget).toLocaleString('en-IN')} (${Math.round(ctx.spending.budgetUtilization)}%).`,
      sampleDays: records.length,
      sentiment: 'positive',
      effect: 0.1,
    })
  }

  candidates.sort((a, b) => b.effect - a.effect)
  return candidates[0] ?? null
}

export function buildInsightWindow(today: string): string[] {
  return lastNDates(INSIGHT_WINDOW_DAYS, today)
}
