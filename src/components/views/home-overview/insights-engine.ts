// Deterministic cross-domain insights for the Home route. Plain explainable
// stats only — means, bucket deltas, Pearson correlation — computed locally
// from the day records the page already fetched. No network calls, no ML.
//
// Emits the same `Insight` shape the shared engine (lib/insights/engine.ts)
// uses for Finance/Nutrition/Mind, so Home's Patterns feed can render through
// the shared <InsightList> component — one visual system, three domains.

import type {
  DailyFinancialLog,
  DailyLog,
  DailyTask,
  FocusDaySummary,
  LearningsSummary,
  MindEntry,
  SleepEntry,
  StravaActivity,
} from '../../../lib/api'
import type { Insight, InsightIcon, InsightSentiment } from '../../../lib/insights/engine'
import { confidenceFrom } from '../../../lib/insights/engine'
import type { NutritionSummary, SpendingSummary } from './home-types'
import { formatMinutes, lastNDates, shortDayLabel } from './home-types'

export const INSIGHT_WINDOW_DAYS = 7
/** Minimum paired days before a correlation rule may speak. */
const MIN_PAIRED_DAYS = 5
/** Minimum days per bucket for a split comparison. */
const MIN_BUCKET_DAYS = 2
const MAX_VISIBLE_INSIGHTS = 4

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
  thoughtsCaptured: number
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
  mindEntries: MindEntry[] | null
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

  const thoughtsByDate = new Map<string, number>()
  for (const entry of sources.mindEntries ?? []) {
    if (entry.type !== 'THOUGHT') continue
    const date = entry.date?.slice(0, 10)
    if (!date) continue
    thoughtsByDate.set(date, (thoughtsByDate.get(date) ?? 0) + 1)
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
      thoughtsCaptured: thoughtsByDate.get(date) ?? 0,
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
const windowLabel = (n: number) => `based on ${n} day${n === 1 ? '' : 's'}`

interface InsightContext {
  proteinGoal: number | null
  spending: SpendingSummary | null
  workoutStreakWeeks: number
  learningStreakDays: number
  /** The user's sleep target from their profile (resolved, minutes). */
  sleepTargetMinutes: number
}

const SENTIMENT_RANK: Record<InsightSentiment, number> = {
  urgent: 3,
  watch: 2,
  positive: 1,
  neutral: 0,
}

/** Shared boilerplate every home-native rule fills in. */
function makeInsight(partial: {
  id: string
  icon: InsightIcon
  sentiment: InsightSentiment
  title: string
  detail: string
  sampleDays: number
  effect: number
  spark?: number[]
  metric?: Insight['metric']
  action?: Insight['action']
}): Insight {
  return {
    id: partial.id,
    domain: 'cross',
    kind: 'trend',
    sentiment: partial.sentiment,
    icon: partial.icon,
    title: partial.title,
    detail: partial.detail,
    metric: partial.metric,
    spark: partial.spark,
    sampleWindow: windowLabel(partial.sampleDays),
    action: partial.action,
    confidence: confidenceFrom(partial.sampleDays, partial.effect),
    effect: partial.effect,
  }
}

/**
 * Cross-domain correlation insights plus up to two `promoted` finance/nutrition
 * findings from the shared engine. Capped at 4, guaranteeing ≥1 positive.
 */
export function generateInsights(
  records: DayRecord[],
  ctx: InsightContext,
  promoted: Insight[] = [],
): Insight[] {
  const insights: Insight[] = [...promoted]

  const push = (insight: Insight | null) => {
    if (insight) insights.push(insight)
  }

  push(sleepVsFocus(records, ctx.sleepTargetMinutes))
  push(sleepVsMood(records))
  push(workoutsVsFoodSpend(records))
  push(overdueVsFocus(records))
  push(proteinVsFocus(records, ctx.proteinGoal))
  push(thoughtsVsOverdue(records))
  push(thoughtsVsSleep(records, ctx.sleepTargetMinutes))

  insights.sort(
    (a, b) => SENTIMENT_RANK[b.sentiment] - SENTIMENT_RANK[a.sentiment] || b.effect - a.effect,
  )

  const positive = bestPositive(records, ctx)
  let visible = insights.slice(0, MAX_VISIBLE_INSIGHTS)
  if (!visible.some((i) => i.sentiment === 'positive')) {
    const rankedPositive = insights.find((i) => i.sentiment === 'positive') ?? positive
    if (rankedPositive) {
      visible = [...visible.slice(0, MAX_VISIBLE_INSIGHTS - 1), rankedPositive]
    }
  }
  return visible.slice(0, MAX_VISIBLE_INSIGHTS)
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

function sleepVsFocus(records: DayRecord[], sleepTargetMinutes: number): Insight | null {
  const paired = records.filter((r) => r.sleepMinutes != null)
  if (paired.length < MIN_PAIRED_DAYS) return null

  const shortLimit = sleepTargetMinutes - 60
  const short = paired.filter((r) => (r.sleepMinutes as number) < shortLimit)
  const rested = paired.filter((r) => (r.sleepMinutes as number) >= shortLimit)
  if (short.length < MIN_BUCKET_DAYS || rested.length < MIN_BUCKET_DAYS) return null

  const shortAvg = Math.round(mean(short.map((r) => r.focusMinutes)))
  const restedAvg = Math.round(mean(rested.map((r) => r.focusMinutes)))
  if (restedAvg === 0 && shortAvg === 0) return null
  const relDiff = Math.abs(restedAvg - shortAvg) / Math.max(restedAvg, shortAvg, 1)
  if (relDiff < 0.2) return null

  const spark = paired.map((r) => r.focusMinutes)
  const shortLabel = formatMinutes(shortLimit).replace(' 00m', '')
  if (restedAvg > shortAvg) {
    return makeInsight({
      id: 'sleep-focus',
      icon: 'sleep',
      sentiment: 'watch',
      title: `On nights under ${shortLabel}, your next-day focus averages ${shortAvg} min vs ${restedAvg} min after longer sleep.`,
      detail: `${short.length} short nights (avg focus ${shortAvg} min) vs ${rested.length} rested nights (avg focus ${restedAvg} min). Threshold: ${shortLabel} of sleep.`,
      sampleDays: paired.length,
      effect: relDiff,
      spark,
      metric: { value: restedAvg, unit: 'min', delta: restedAvg - shortAvg, deltaDir: 'up' },
    })
  }
  return makeInsight({
    id: 'sleep-focus',
    icon: 'sleep',
    sentiment: 'neutral',
    title: `Interesting: your focus has been holding up even after shorter nights (${shortAvg} min vs ${restedAvg} min).`,
    detail: `${short.length} short nights (avg focus ${shortAvg} min) vs ${rested.length} rested nights (avg focus ${restedAvg} min). Threshold: ${shortLabel} of sleep.`,
    sampleDays: paired.length,
    effect: relDiff * 0.5,
    spark,
  })
}

function sleepVsMood(records: DayRecord[]): Insight | null {
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
    return makeInsight({
      id: 'sleep-mood',
      icon: 'mood',
      sentiment: 'neutral',
      title: `Your mood tends to be higher on days after 7h+ of sleep (${goodMood.toFixed(1)} vs ${shortMood.toFixed(1)} out of 5).`,
      detail: `${goodNights.length} nights ≥ 7h (avg mood ${goodMood.toFixed(1)}) vs ${shortNights.length} nights < 7h (avg mood ${shortMood.toFixed(1)})${r != null ? `; correlation r = ${r.toFixed(2)}` : ''}.`,
      sampleDays: paired.length,
      effect: Math.abs(diff) / 5,
      metric: { value: Math.round(goodMood * 10) / 10, unit: '/5' },
      spark: paired.map((p) => p.moodScore as number),
    })
  }
  return null
}

function workoutsVsFoodSpend(records: DayRecord[]): Insight | null {
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
  const spark = paired.map((r) => r.foodSpend as number)
  if (activeSpend < restSpend) {
    return makeInsight({
      id: 'workout-food-spend',
      icon: 'wallet',
      sentiment: 'positive',
      title: `You spend about ${pct}% less on food on days you work out (₹${Math.round(activeSpend)} vs ₹${Math.round(restSpend)}).`,
      detail: `${active.length} workout days (avg food spend ₹${Math.round(activeSpend)}) vs ${restDays.length} rest days (avg ₹${Math.round(restSpend)}).`,
      sampleDays: paired.length,
      effect: relDiff,
      metric: { value: Math.round(activeSpend), unit: '₹' },
      spark,
    })
  }
  return makeInsight({
    id: 'workout-food-spend',
    icon: 'wallet',
    sentiment: 'neutral',
    title: `Food spend runs about ${pct}% higher on workout days (₹${Math.round(activeSpend)} vs ₹${Math.round(restSpend)}) — fuel costs, worth knowing.`,
    detail: `${active.length} workout days (avg food spend ₹${Math.round(activeSpend)}) vs ${restDays.length} rest days (avg ₹${Math.round(restSpend)}).`,
    sampleDays: paired.length,
    effect: relDiff * 0.6,
    metric: { value: Math.round(activeSpend), unit: '₹' },
    spark,
  })
}

function overdueVsFocus(records: DayRecord[]): Insight | null {
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

  return makeInsight({
    id: 'overdue-focus',
    icon: 'tasks',
    sentiment: 'watch',
    title: `Focus dips on days you carry ${threshold}+ overdue tasks${clearFocus != null ? ` (${heavyFocus} min vs ${clearFocus} min on clear days)` : ''}.`,
    detail: `Correlation between carried overdue tasks and focus minutes: r = ${r.toFixed(2)} over ${paired.length} days. ${heavyDays.length} days carried overdue work${clearFocus != null ? `; ${clearDays.length} days were clear` : ''}.`,
    sampleDays: paired.length,
    effect: Math.abs(r),
    metric: clearFocus != null ? { value: heavyFocus, unit: 'min', delta: heavyFocus - clearFocus, deltaDir: 'down' } : undefined,
    spark: paired.map((p) => p.focusMinutes),
    action: { label: 'See open tasks', route: '/tasks' },
  })
}

function thoughtsVsOverdue(records: DayRecord[]): Insight | null {
  const paired = records.filter((r) => r.tasksTotal > 0 || r.overdueCarried > 0 || r.thoughtsCaptured > 0)
  if (paired.length < MIN_PAIRED_DAYS) return null
  if (!paired.some((r) => r.overdueCarried > 0) || !paired.some((r) => r.thoughtsCaptured > 0)) return null

  const heavy = paired.filter((r) => r.overdueCarried >= 2)
  const clear = paired.filter((r) => r.overdueCarried === 0)
  if (heavy.length < MIN_BUCKET_DAYS || clear.length < MIN_BUCKET_DAYS) return null

  const heavyAvg = mean(heavy.map((r) => r.thoughtsCaptured))
  const clearAvg = mean(clear.map((r) => r.thoughtsCaptured))
  if (heavyAvg <= clearAvg || heavyAvg - clearAvg < 0.8) return null

  return makeInsight({
    id: 'thoughts-overdue',
    icon: 'thought',
    sentiment: 'watch',
    title: `You tend to capture more thoughts on days you're carrying 2+ overdue tasks (avg ${heavyAvg.toFixed(1)} vs ${clearAvg.toFixed(1)}) — that backlog may be part of what's circling.`,
    detail: `${heavy.length} days carrying 2+ overdue tasks (avg ${heavyAvg.toFixed(1)} thoughts captured) vs ${clear.length} clear days (avg ${clearAvg.toFixed(1)}).`,
    sampleDays: paired.length,
    effect: Math.min(1, (heavyAvg - clearAvg) / 3),
    metric: { value: Math.round(heavyAvg * 10) / 10, unit: 'thoughts' },
    action: { label: 'Clear a few overdue tasks', route: '/tasks' },
  })
}

function thoughtsVsSleep(records: DayRecord[], sleepTargetMinutes: number): Insight | null {
  const paired = records.filter((r) => r.sleepMinutes != null && (r.thoughtsCaptured > 0 || r.tasksTotal > 0))
  if (paired.length < MIN_PAIRED_DAYS) return null

  const short = paired.filter((r) => (r.sleepMinutes as number) < sleepTargetMinutes - 60)
  const rested = paired.filter((r) => (r.sleepMinutes as number) >= sleepTargetMinutes - 60)
  if (short.length < MIN_BUCKET_DAYS || rested.length < MIN_BUCKET_DAYS) return null

  const shortAvg = mean(short.map((r) => r.thoughtsCaptured))
  const restedAvg = mean(rested.map((r) => r.thoughtsCaptured))
  if (shortAvg <= restedAvg || shortAvg - restedAvg < 0.8) return null

  return makeInsight({
    id: 'thoughts-sleep',
    icon: 'sleep',
    sentiment: 'watch',
    title: `Shorter nights tend to come with more circling thoughts the next day (avg ${shortAvg.toFixed(1)} vs ${restedAvg.toFixed(1)} captured).`,
    detail: `${short.length} short nights (avg ${shortAvg.toFixed(1)} thoughts captured next day) vs ${rested.length} rested nights (avg ${restedAvg.toFixed(1)}).`,
    sampleDays: paired.length,
    effect: Math.min(1, (shortAvg - restedAvg) / 3),
    metric: { value: Math.round(shortAvg * 10) / 10, unit: 'thoughts' },
  })
}

function proteinVsFocus(records: DayRecord[], proteinGoal: number | null): Insight | null {
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

  return makeInsight({
    id: 'protein-focus',
    icon: 'protein',
    sentiment: 'positive',
    title: `On days you hit your protein goal you average ${hitFocus} min of focus, vs ${missedFocus} min when you miss it.`,
    detail: `${hit.length} goal-hit days (≥ ${proteinGoal}g, avg focus ${hitFocus} min) vs ${missed.length} days under goal (avg ${missedFocus} min).`,
    sampleDays: paired.length,
    effect: relDiff,
    metric: { value: hitFocus, unit: 'min', delta: hitFocus - missedFocus, deltaDir: 'up' },
    spark: paired.map((p) => p.proteinGrams as number),
  })
}

/** The digest should never be all-negative: always try to surface one genuine win. */
function bestPositive(records: DayRecord[], ctx: InsightContext): Insight | null {
  const candidates: Insight[] = []

  const sleptNights = records.filter((r) => r.sleepMinutes != null)
  if (sleptNights.length > 0) {
    const best = sleptNights.reduce((a, b) =>
      (b.sleepMinutes as number) > (a.sleepMinutes as number) ? b : a,
    )
    if ((best.sleepMinutes as number) >= ctx.sleepTargetMinutes) {
      candidates.push(
        makeInsight({
          id: 'win-best-sleep',
          icon: 'sleep',
          sentiment: 'positive',
          title: `Best night this week: ${formatMinutes(best.sleepMinutes as number)} on ${shortDayLabel(best.date)} — right on target.`,
          detail: `Longest of ${sleptNights.length} logged nights; target is ${formatMinutes(ctx.sleepTargetMinutes)}.`,
          sampleDays: sleptNights.length,
          effect: 0.15,
          metric: { value: Math.round((best.sleepMinutes as number) / 6) / 10, unit: 'h' },
        }),
      )
    }
  }

  const bestFocus = records.reduce((a, b) => (b.focusMinutes > a.focusMinutes ? b : a))
  if (bestFocus.focusMinutes >= 60) {
    candidates.push(
      makeInsight({
        id: 'win-focus-peak',
        icon: 'focus',
        sentiment: 'positive',
        title: `${formatMinutes(bestFocus.focusMinutes)} of deep focus on ${shortDayLabel(bestFocus.date)} — your peak this week.`,
        detail: `Highest single-day completed focus time in the last ${records.length} days.`,
        sampleDays: records.length,
        effect: 0.14,
        metric: { value: bestFocus.focusMinutes, unit: 'min' },
        spark: records.map((r) => r.focusMinutes),
      }),
    )
  }

  const workoutCount = records.reduce((sum, r) => sum + r.workouts, 0)
  if (workoutCount >= 3) {
    candidates.push(
      makeInsight({
        id: 'win-workouts',
        icon: 'streak',
        sentiment: 'positive',
        title: `${workoutCount} workouts this week${ctx.workoutStreakWeeks > 1 ? ` — that's ${ctx.workoutStreakWeeks} weeks in a row now` : ''}. Momentum is real.`,
        detail: `${workoutCount} activities across the ${records.length}-day window.`,
        sampleDays: records.length,
        effect: 0.13,
        metric: { value: workoutCount, unit: 'workouts' },
      }),
    )
  }

  const tasksDone = records.reduce((sum, r) => sum + r.tasksCompleted, 0)
  if (tasksDone >= 5) {
    candidates.push(
      makeInsight({
        id: 'win-tasks',
        icon: 'tasks',
        sentiment: 'positive',
        title: `You closed ${tasksDone} tasks this week. Quiet, steady progress.`,
        detail: `${tasksDone} completions across the ${records.length}-day window.`,
        sampleDays: records.length,
        effect: 0.12,
        metric: { value: tasksDone, unit: 'tasks' },
      }),
    )
  }

  if (ctx.learningStreakDays >= 3) {
    candidates.push(
      makeInsight({
        id: 'win-learning-streak',
        icon: 'streak',
        sentiment: 'positive',
        title: `${ctx.learningStreakDays} days of learning in a row — the streak is alive.`,
        detail: `Current learning streak from your learnings log.`,
        sampleDays: ctx.learningStreakDays,
        effect: 0.11,
        metric: { value: ctx.learningStreakDays, unit: 'days' },
      }),
    )
  }

  if (ctx.spending && ctx.spending.budgetRemaining > 0 && ctx.spending.totalSpent > 0) {
    candidates.push(
      makeInsight({
        id: 'win-budget',
        icon: 'wallet',
        sentiment: 'positive',
        title: `You're ₹${Math.round(ctx.spending.budgetRemaining).toLocaleString('en-IN')} under budget this month.`,
        detail: `Spent ₹${Math.round(ctx.spending.totalSpent).toLocaleString('en-IN')} of ₹${Math.round(ctx.spending.monthlyBudget).toLocaleString('en-IN')} (${Math.round(ctx.spending.budgetUtilization)}%).`,
        sampleDays: records.length,
        effect: 0.1,
        metric: { value: Math.round(ctx.spending.budgetRemaining), unit: '₹' },
      }),
    )
  }

  candidates.sort((a, b) => b.effect - a.effect)
  return candidates[0] ?? null
}

export function buildInsightWindow(today: string): string[] {
  return lastNDates(INSIGHT_WINDOW_DAYS, today)
}
