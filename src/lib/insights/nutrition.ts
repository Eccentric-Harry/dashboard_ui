// Nutrition rules for the shared insights engine. Input is the food-entry
// history the routes already fetch (or the 7-day nutrition summary on Home);
// output is threshold-gated `Insight[]` plus typed payloads for the
// Nutrition Intelligence charts. All math lives here — UI only renders.

import type { Insight, InsightConfidence } from './engine'
import {
  confidenceFrom,
  isWeekend,
  lastNDates,
  mean,
  rankInsights,
  shortDay,
  sum,
} from './engine'

// ---------- Inputs ----------

/** The subset of a food-entry DTO the engine reads (see FoodEntryDTO / api.ts). */
export interface FoodEntryLike {
  id?: string
  description?: string
  calories?: number
  proteinGrams?: number
  mealType?: string
  date?: string
  total_summary?: Record<string, unknown> | null
}

export interface NutritionMeal {
  description: string
  mealType: string
  calories: number
  protein: number
  carbsG: number | null
  fatG: number | null
}

export interface NutritionDay {
  date: string
  calories: number
  protein: number
  meals: NutritionMeal[]
  logged: boolean
}

/** The subset of a hydration record the engine reads (see HydrationRecordDTO / api.ts). */
export interface HydrationDayLike {
  date: string
  waterIntakeMl: number
  targetMl: number
}

export interface NutritionEngineInput {
  today: string
  /** Ascending day series; build with buildNutritionDays or nutritionDaysFromSummary. */
  days: NutritionDay[]
  proteinGoal: number | null
  calorieTarget: number | null
  tdee: number | null
  fitnessGoal: 'LOSE_WEIGHT' | 'MAINTAIN_WEIGHT' | 'GAIN_MUSCLE' | null
  /** Ascending, same window as `days`; null when the range fetch failed or hasn't loaded. */
  hydration?: HydrationDayLike[] | null
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/** Build the ascending day series for the `windowDays` ending at `today` from raw entries. */
export function buildNutritionDays(
  entries: FoodEntryLike[],
  today: string,
  windowDays: number,
): NutritionDay[] {
  const byDate = new Map<string, NutritionMeal[]>()
  for (const entry of entries) {
    const date = entry.date?.slice(0, 10)
    if (!date) continue
    const summary = entry.total_summary ?? null
    const meal: NutritionMeal = {
      description: entry.description ?? '',
      mealType: entry.mealType || 'Snack',
      calories: num(entry.calories) ?? 0,
      protein: num(entry.proteinGrams) ?? 0,
      carbsG: summary ? num(summary['carbohydrates_g']) : null,
      fatG: summary ? num(summary['fat_g']) : null,
    }
    const list = byDate.get(date)
    if (list) list.push(meal)
    else byDate.set(date, [meal])
  }

  return lastNDates(windowDays, today).map((date) => {
    const meals = byDate.get(date) ?? []
    return {
      date,
      calories: sum(meals.map((m) => m.calories)),
      protein: sum(meals.map((m) => m.protein)),
      meals,
      logged: meals.length > 0,
    }
  })
}

/** Day series from the Home nutrition summary's dailyCalories/dailyProtein maps (no meal detail). */
export function nutritionDaysFromSummary(
  dailyCalories: Record<string, number>,
  dailyProtein: Record<string, number>,
): NutritionDay[] {
  const dates = [...new Set([...Object.keys(dailyCalories), ...Object.keys(dailyProtein)])].sort()
  return dates.map((date) => {
    const calories = dailyCalories[date] ?? 0
    const protein = dailyProtein[date] ?? 0
    return { date, calories, protein, meals: [], logged: calories > 0 || protein > 0 }
  })
}

// ---------- Chart payloads (single source of the numbers the UI draws) ----------

export interface ProteinGapSummary {
  avg7: number
  avg30: number | null
  goal: number
  hitDays7: number
  loggedDays7: number
  /** Last-7-day protein values (0 on unlogged days), ascending. */
  spark: { date: string; grams: number }[]
}

export function proteinGapSummary(input: NutritionEngineInput): ProteinGapSummary | null {
  const goal = input.proteinGoal
  if (!goal || goal <= 0) return null
  const last7 = input.days.slice(-7)
  const logged7 = last7.filter((d) => d.logged)
  if (logged7.length < 3) return null
  const logged30 = input.days.filter((d) => d.logged)
  return {
    avg7: Math.round(mean(logged7.map((d) => d.protein))),
    avg30: logged30.length >= 10 ? Math.round(mean(logged30.map((d) => d.protein))) : null,
    goal,
    hitDays7: logged7.filter((d) => d.protein >= goal).length,
    loggedDays7: logged7.length,
    spark: last7.map((d) => ({ date: d.date, grams: d.protein })),
  }
}

export interface MacroSplit {
  proteinPct: number
  carbsPct: number | null
  fatPct: number | null
  /** Share of logged calories that carried analyzed carb/fat data. */
  coverage: number
  sampleDays: number
}

/** Average share of calories from each macro. Carbs/fat only when AI-analyzed entries cover ≥ half the calories. */
export function macroSplit(input: NutritionEngineInput): MacroSplit | null {
  const logged = input.days.filter((d) => d.logged && d.calories > 0)
  if (logged.length < 5) return null
  const totalCalories = sum(logged.map((d) => d.calories))
  if (totalCalories <= 0) return null
  const proteinCalories = sum(logged.map((d) => d.protein)) * 4

  const analyzed = logged.flatMap((d) => d.meals).filter((m) => m.carbsG != null && m.calories > 0)
  const analyzedCalories = sum(analyzed.map((m) => m.calories))
  const coverage = analyzedCalories / totalCalories

  let carbsPct: number | null = null
  let fatPct: number | null = null
  if (coverage >= 0.5 && analyzedCalories > 0) {
    carbsPct = Math.round((sum(analyzed.map((m) => (m.carbsG ?? 0) * 4)) / analyzedCalories) * 100)
    fatPct = Math.round((sum(analyzed.map((m) => (m.fatG ?? 0) * 9)) / analyzedCalories) * 100)
  }

  return {
    proteinPct: Math.round((proteinCalories / totalCalories) * 100),
    carbsPct,
    fatPct,
    coverage,
    sampleDays: logged.length,
  }
}

export interface AdherenceDay {
  date: string
  logged: boolean
  calories: number
  calorieTarget: number | null
  calorieHit: boolean | null
  protein: number
  proteinGoal: number | null
  proteinHit: boolean | null
}

/** Goal-hit vs missed (and the raw values behind it) per day for the adherence chart. Calorie "hit" = at/under target (loss goal). */
export function adherenceDays(input: NutritionEngineInput, windowDays = 14): AdherenceDay[] {
  return input.days.slice(-windowDays).map((d) => ({
    date: d.date,
    logged: d.logged,
    calories: d.calories,
    calorieTarget: input.calorieTarget,
    calorieHit:
      d.logged && input.calorieTarget ? d.calories <= input.calorieTarget : null,
    protein: d.protein,
    proteinGoal: input.proteinGoal,
    proteinHit: d.logged && input.proteinGoal ? d.protein >= input.proteinGoal : null,
  }))
}

export interface WeekComparison {
  calories: { current: number; previous: number }
  protein: { current: number; previous: number }
  loggedDays: { current: number; previous: number }
}

/** Logged-day averages, this week (last 7) vs the 7 days before. */
export function weekComparison(input: NutritionEngineInput): WeekComparison | null {
  if (input.days.length < 14) return null
  const current = input.days.slice(-7).filter((d) => d.logged)
  const previous = input.days.slice(-14, -7).filter((d) => d.logged)
  if (current.length < 3 || previous.length < 3) return null
  return {
    calories: {
      current: Math.round(mean(current.map((d) => d.calories))),
      previous: Math.round(mean(previous.map((d) => d.calories))),
    },
    protein: {
      current: Math.round(mean(current.map((d) => d.protein))),
      previous: Math.round(mean(previous.map((d) => d.protein))),
    },
    loggedDays: { current: current.length, previous: previous.length },
  }
}

export interface LeaderboardFood {
  name: string
  proteinPer100kcal: number
  timesLogged: number
  avgProtein: number
  avgCalories: number
}

/** The user's actually-logged foods ranked by protein per 100 kcal. */
export function proteinLeaderboard(input: NutritionEngineInput, topN = 3): LeaderboardFood[] {
  const byFood = new Map<string, { name: string; calories: number; protein: number; count: number }>()
  for (const day of input.days) {
    for (const meal of day.meals) {
      const name = meal.description.trim()
      if (!name || meal.calories < 30) continue
      const key = name.toLowerCase()
      const item = byFood.get(key) ?? { name, calories: 0, protein: 0, count: 0 }
      item.calories += meal.calories
      item.protein += meal.protein
      item.count += 1
      byFood.set(key, item)
    }
  }
  const foods = [...byFood.values()].filter((f) => f.calories >= 100 && f.protein >= 5)
  if (foods.length < 3) return []
  return foods
    .map((f) => ({
      name: f.name,
      proteinPer100kcal: Math.round((f.protein / f.calories) * 100 * 10) / 10,
      timesLogged: f.count,
      avgProtein: Math.round(f.protein / f.count),
      avgCalories: Math.round(f.calories / f.count),
    }))
    .sort((a, b) => b.proteinPer100kcal - a.proteinPer100kcal)
    .slice(0, topN)
}

/** Days with at least one logged meal in the last `window` days — powers low-data states. */
export function loggedDayCount(input: NutritionEngineInput, window = 7): number {
  return input.days.slice(-window).filter((d) => d.logged).length
}

// ---------- Rules ----------

const HEALTHY_PROTEIN_BAND: [number, number] = [15, 25]

function proteinGapRule(input: NutritionEngineInput): Insight | null {
  const gap = proteinGapSummary(input)
  if (!gap) return null
  const pctOfGoal = Math.round((gap.avg7 / gap.goal) * 100)
  const effect = Math.min(1, Math.abs(1 - gap.avg7 / gap.goal))
  const sampleWindow = `based on ${gap.loggedDays7} of 7 days`
  const detail = `7-day avg ${gap.avg7}g${gap.avg30 != null ? ` (30-day avg ${gap.avg30}g)` : ''} vs ${gap.goal}g goal; goal hit ${gap.hitDays7} of ${gap.loggedDays7} logged days.`
  const spark = gap.spark.map((p) => p.grams)

  if (pctOfGoal >= 95) {
    return {
      id: 'ntr-protein-gap',
      domain: 'nutrition',
      kind: 'trend',
      sentiment: 'positive',
      icon: 'protein',
      title: `You're averaging ${gap.avg7}g protein — right at your ${gap.goal}g goal, hit ${gap.hitDays7} of the last ${gap.loggedDays7} logged days.`,
      detail,
      metric: { value: gap.avg7, unit: 'g' },
      spark,
      sampleWindow,
      confidence: confidenceFrom(gap.loggedDays7, Math.max(effect, 0.2)),
      effect: Math.max(effect, 0.15),
    }
  }
  return {
    id: 'ntr-protein-gap',
    domain: 'nutrition',
    kind: 'trend',
    sentiment: 'watch',
    icon: 'protein',
    title: `You're averaging ${gap.avg7}g protein — ${pctOfGoal}% of your ${gap.goal}g goal. You've hit it ${gap.hitDays7} of the last ${gap.loggedDays7} logged days.`,
    detail,
    metric: { value: gap.avg7, unit: 'g', delta: gap.avg7 - gap.goal, deltaDir: 'down' },
    spark,
    sampleWindow,
    action: { label: 'See high-protein foods you already eat', route: '/nutrition' },
    confidence: confidenceFrom(gap.loggedDays7, effect),
    effect,
  }
}

function calorieAdherenceRule(input: NutritionEngineInput): Insight | null {
  if (!input.tdee || input.tdee <= 0) return null
  const logged = input.days.slice(-14).filter((d) => d.logged && d.calories > 0)
  if (logged.length < 5) return null
  const avgIntake = Math.round(mean(logged.map((d) => d.calories)))
  const deficit = Math.round(input.tdee - avgIntake)
  const sampleWindow = `based on ${logged.length} of 14 days`
  const detail = `Avg intake ${avgIntake.toLocaleString()} kcal vs TDEE ${input.tdee.toLocaleString()} kcal → ${deficit >= 0 ? 'deficit' : 'surplus'} of ${Math.abs(deficit).toLocaleString()} kcal/day${input.calorieTarget ? `; target ${input.calorieTarget.toLocaleString()} kcal` : ''}.`
  const base = {
    id: 'ntr-calorie-adherence',
    domain: 'nutrition' as const,
    kind: 'trend' as const,
    icon: 'calories' as const,
    detail,
    metric: { value: avgIntake, unit: 'kcal' },
    sampleWindow,
  }
  const losing = input.fitnessGoal === 'LOSE_WEIGHT'
  const effect = Math.min(1, Math.abs(deficit) / input.tdee)
  const confidence: InsightConfidence = confidenceFrom(logged.length, Math.max(effect, 0.1))

  if (losing && deficit > 1000) {
    return {
      ...base,
      sentiment: 'neutral',
      title: `Avg intake ${avgIntake.toLocaleString()} kcal — a ${deficit.toLocaleString()} kcal/day gap to your TDEE. If meals are going unlogged, the other nutrition numbers will read low too.`,
      confidence: 'medium',
      effect: 0.3,
    }
  }
  if (losing && deficit >= 350) {
    return {
      ...base,
      sentiment: 'positive',
      title: `Avg intake ${avgIntake.toLocaleString()} kcal — about ${deficit.toLocaleString()} kcal under your TDEE, on track for your loss goal.`,
      confidence,
      effect,
    }
  }
  if (losing && deficit < 150) {
    return {
      ...base,
      sentiment: 'watch',
      title:
        deficit >= 0
          ? `You're eating close to maintenance — the deficit is only ${deficit.toLocaleString()} kcal/day on average.`
          : `You're averaging ${Math.abs(deficit).toLocaleString()} kcal/day over your TDEE — that works against your loss goal.`,
      action: { label: 'Review recent meals', route: '/nutrition' },
      confidence,
      effect: Math.max(effect, 0.25),
    }
  }
  if (losing) {
    return {
      ...base,
      sentiment: 'neutral',
      title: `Avg intake ${avgIntake.toLocaleString()} kcal — a moderate ${deficit.toLocaleString()} kcal/day deficit; steady progress pace.`,
      confidence,
      effect: effect * 0.6,
    }
  }
  return null
}

function macroCompositionRule(input: NutritionEngineInput): Insight | null {
  const split = macroSplit(input)
  if (!split) return null
  const [lo, hi] = HEALTHY_PROTEIN_BAND
  const inBand = split.proteinPct >= lo && split.proteinPct <= hi
  const sampleWindow = `based on ${split.sampleDays} logged days`
  const detail = `Protein ≈ ${split.proteinPct}% of calories (healthy band ${lo}–${hi}%)${split.carbsPct != null ? `; carbs ≈ ${split.carbsPct}%, fat ≈ ${split.fatPct}% (from analyzed meals covering ${Math.round(split.coverage * 100)}% of calories)` : ''}.`
  if (inBand) {
    return {
      id: 'ntr-macro-mix',
      domain: 'nutrition',
      kind: 'composition',
      sentiment: 'positive',
      icon: 'balance',
      title: `Protein makes up about ${split.proteinPct}% of your calories — inside the healthy ${lo}–${hi}% band.`,
      detail,
      sampleWindow,
      confidence: confidenceFrom(split.sampleDays, 0.15),
      effect: 0.12,
    }
  }
  if (split.proteinPct > hi) {
    return {
      id: 'ntr-macro-mix',
      domain: 'nutrition',
      kind: 'composition',
      sentiment: 'positive',
      icon: 'balance',
      title: `Protein makes up about ${split.proteinPct}% of your calories — a protein-forward mix that works for satiety and your goal.`,
      detail,
      sampleWindow,
      confidence: confidenceFrom(split.sampleDays, 0.15),
      effect: 0.12,
    }
  }
  const title =
    split.carbsPct != null
      ? `About ${split.carbsPct}% of your calories come from carbs; protein sits near ${split.proteinPct}%. Nudging protein up would help satiety and your goal.`
      : `Protein sits near ${split.proteinPct}% of your calories (healthy band ${lo}–${hi}%). Nudging it up would help satiety and your goal.`
  return {
    id: 'ntr-macro-mix',
    domain: 'nutrition',
    kind: 'composition',
    sentiment: split.proteinPct < 12 ? 'watch' : 'neutral',
    icon: 'balance',
    title,
    detail,
    sampleWindow,
    confidence: confidenceFrom(split.sampleDays, Math.abs(split.proteinPct - lo) / 100 + 0.1),
    effect: Math.min(1, Math.abs(split.proteinPct - lo) / lo),
  }
}

function mealTimingRule(input: NutritionEngineInput): Insight | null {
  const logged = input.days.filter((d) => d.logged && d.meals.length > 0)
  if (logged.length < 5) return null
  const byType = new Map<string, number>()
  let total = 0
  for (const day of logged) {
    for (const meal of day.meals) {
      byType.set(meal.mealType, (byType.get(meal.mealType) ?? 0) + meal.calories)
      total += meal.calories
    }
  }
  if (byType.size < 2 || total <= 0) return null
  const [topType, topCalories] = [...byType.entries()].sort((a, b) => b[1] - a[1])[0]
  const share = Math.round((topCalories / total) * 100)
  if (share < 38) return null
  const heavyDinner = topType.toLowerCase().includes('dinner') && share >= 45
  return {
    id: 'ntr-meal-timing',
    domain: 'nutrition',
    kind: 'composition',
    sentiment: share >= 50 ? 'watch' : 'neutral',
    icon: 'timing',
    title: `${topType} is your biggest meal (${share}% of daily calories on average)${heavyDinner ? ' — shifting some protein to breakfast could help.' : '.'}`,
    detail: `${[...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, cal]) => `${type} ${Math.round((cal / total) * 100)}%`)
      .join(' · ')} across ${logged.length} logged days.`,
    sampleWindow: `based on ${logged.length} logged days`,
    confidence: confidenceFrom(logged.length, (share - 38) / 100 + 0.1),
    effect: Math.min(1, (share - 38) / 40),
  }
}

function loggingConsistencyRule(input: NutritionEngineInput): Insight | null {
  const last7 = input.days.slice(-7)
  const logged = last7.filter((d) => d.logged).length
  if (logged >= 6 || logged === 0) return null
  return {
    id: 'ntr-logging',
    domain: 'nutrition',
    kind: 'streak',
    sentiment: 'neutral',
    icon: 'log',
    title: `You logged ${logged} of the last 7 days. More logging = sharper insights.`,
    detail: `${logged}/7 days had at least one meal logged; unlogged days are excluded from averages rather than counted as zero.`,
    sampleWindow: 'last 7 days',
    action: { label: 'Log a meal', route: '/nutrition' },
    confidence: 'high',
    effect: (7 - logged) / 7 * 0.5,
  }
}

function weekdayWeekendRule(input: NutritionEngineInput): Insight | null {
  const logged = input.days.slice(-14).filter((d) => d.logged && d.calories > 0)
  const weekend = logged.filter((d) => isWeekend(d.date))
  const weekday = logged.filter((d) => !isWeekend(d.date))
  if (weekend.length < 2 || weekday.length < 3) return null
  const weekendAvg = Math.round(mean(weekend.map((d) => d.calories)))
  const weekdayAvg = Math.round(mean(weekday.map((d) => d.calories)))
  const relDiff = Math.abs(weekendAvg - weekdayAvg) / Math.max(weekendAvg, weekdayAvg)
  if (relDiff < 0.15) return null
  const higher = weekendAvg > weekdayAvg ? 'weekends' : 'weekdays'
  return {
    id: 'ntr-weekday-weekend',
    domain: 'nutrition',
    kind: 'trend',
    sentiment: 'neutral',
    icon: 'scale',
    title: `You eat about ${Math.round(relDiff * 100)}% more on ${higher} (${Math.max(weekendAvg, weekdayAvg).toLocaleString()} vs ${Math.min(weekendAvg, weekdayAvg).toLocaleString()} kcal).`,
    detail: `${weekday.length} weekdays avg ${weekdayAvg.toLocaleString()} kcal vs ${weekend.length} weekend days avg ${weekendAvg.toLocaleString()} kcal, last 14 days.`,
    sampleWindow: `based on ${logged.length} of 14 days`,
    confidence: confidenceFrom(logged.length, relDiff),
    effect: relDiff * 0.8,
  }
}

function proteinEfficiencyRule(input: NutritionEngineInput): Insight | null {
  const top = proteinLeaderboard(input, 3)
  if (top.length < 3) return null
  return {
    id: 'ntr-protein-efficiency',
    domain: 'nutrition',
    kind: 'efficiency',
    sentiment: 'neutral',
    icon: 'protein',
    title: `Your best protein-for-calories foods: ${top.map((f) => f.name).join(', ')}. Leaning on them closes the gap without extra calories.`,
    detail: top
      .map((f) => `${f.name}: ${f.proteinPer100kcal}g protein per 100 kcal (logged ${f.timesLogged}×)`)
      .join('; '),
    sampleWindow: 'last 30 days',
    confidence: 'high',
    effect: 0.2,
  }
}

/** Always try to surface one genuine win; never manufacture one. */
function winRule(input: NutritionEngineInput): Insight | null {
  const last7 = input.days.slice(-7)
  const logged7 = last7.filter((d) => d.logged)
  if (logged7.length === 0) return null
  const goal = input.proteinGoal

  const best = logged7.reduce((a, b) => (b.protein > a.protein ? b : a))
  if (goal && best.protein >= goal) {
    const hits = logged7.filter((d) => d.protein >= goal).length
    return {
      id: 'ntr-win-protein-day',
      domain: 'nutrition',
      kind: 'win',
      sentiment: 'positive',
      icon: 'trophy',
      title: `You hit your ${goal}g protein goal ${hits === 1 ? `on ${shortDay(best.date)}` : `${hits} days this week`} — best day: ${Math.round(best.protein)}g.`,
      detail: `Best protein day: ${Math.round(best.protein)}g on ${shortDay(best.date)}; goal ${goal}g; ${hits} of ${logged7.length} logged days hit it.`,
      sampleWindow: `based on ${logged7.length} of 7 days`,
      confidence: 'high',
      effect: 0.18,
    }
  }

  if (input.calorieTarget) {
    let streak = 0
    for (let i = last7.length - 1; i >= 0; i--) {
      const d = last7[i]
      if (d.logged && d.calories > 0 && d.calories <= input.calorieTarget) streak++
      else break
    }
    if (streak >= 3) {
      return {
        id: 'ntr-win-calorie-streak',
        domain: 'nutrition',
        kind: 'win',
        sentiment: 'positive',
        icon: 'streak',
        title: `You've stayed at or under your ${input.calorieTarget.toLocaleString()} kcal target ${streak} days running.`,
        detail: `${streak} consecutive logged days at or under ${input.calorieTarget.toLocaleString()} kcal, ending today.`,
        sampleWindow: `last ${streak} days`,
        confidence: 'high',
        effect: 0.16,
      }
    }
  }

  let logStreak = 0
  for (let i = input.days.length - 1; i >= 0; i--) {
    if (input.days[i].logged) logStreak++
    else break
  }
  if (logStreak >= 5) {
    return {
      id: 'ntr-win-log-streak',
      domain: 'nutrition',
      kind: 'win',
      sentiment: 'positive',
      icon: 'streak',
      title: `${logStreak} days of food logging in a row — the data behind every insight here.`,
      detail: `Consecutive days with at least one meal logged, ending today.`,
      sampleWindow: `last ${logStreak} days`,
      confidence: 'high',
      effect: 0.14,
    }
  }

  if (goal && best.protein >= goal * 0.7) {
    return {
      id: 'ntr-win-best-protein',
      domain: 'nutrition',
      kind: 'win',
      sentiment: 'positive',
      icon: 'trophy',
      title: `Strongest protein day this week: ${Math.round(best.protein)}g on ${shortDay(best.date)} — ${Math.round((best.protein / goal) * 100)}% of goal. Repeatable.`,
      detail: `Best of ${logged7.length} logged days; goal ${goal}g.`,
      sampleWindow: `based on ${logged7.length} of 7 days`,
      confidence: 'medium',
      effect: 0.12,
    }
  }
  return null
}

function hydrationAdherenceRule(input: NutritionEngineInput): Insight | null {
  const hydration = input.hydration
  if (!hydration || hydration.length === 0) return null
  const last7 = hydration.slice(-7)
  const logged7 = last7.filter((d) => d.waterIntakeMl > 0)
  if (logged7.length < 3) return null

  const goal = Math.round(mean(logged7.map((d) => d.targetMl).filter((t) => t > 0))) || 4000
  const hitDays = logged7.filter((d) => d.targetMl > 0 && d.waterIntakeMl >= d.targetMl).length
  const avgMl = Math.round(mean(logged7.map((d) => d.waterIntakeMl)))
  const avgL = Math.round((avgMl / 1000) * 10) / 10
  const goalL = Math.round((goal / 1000) * 10) / 10
  const pctOfGoal = Math.round((avgMl / goal) * 100)
  const effect = Math.min(1, Math.abs(1 - avgMl / goal))
  const sampleWindow = `based on ${logged7.length} of 7 days`
  const detail = `7-day avg ${avgL}L vs ${goalL}L target; hit the target ${hitDays} of ${logged7.length} logged days.`

  if (hitDays >= Math.ceil(logged7.length * 0.7)) {
    return {
      id: 'ntr-hydration',
      domain: 'nutrition',
      kind: 'trend',
      sentiment: 'positive',
      icon: 'hydration',
      title: `Hydration is on track — you hit your ${goalL}L target ${hitDays} of the last ${logged7.length} logged days.`,
      detail,
      metric: { value: avgL, unit: 'L' },
      sampleWindow,
      confidence: confidenceFrom(logged7.length, Math.max(effect, 0.15)),
      effect: Math.max(effect, 0.12),
    }
  }
  if (pctOfGoal < 60) {
    return {
      id: 'ntr-hydration',
      domain: 'nutrition',
      kind: 'trend',
      sentiment: 'watch',
      icon: 'hydration',
      title: `Water intake is running low — averaging ${avgL}L, about ${pctOfGoal}% of your ${goalL}L target.`,
      detail,
      metric: { value: avgL, unit: 'L', delta: Math.round((avgL - goalL) * 10) / 10, deltaDir: 'down' },
      sampleWindow,
      confidence: confidenceFrom(logged7.length, effect),
      effect: Math.max(effect, 0.2),
    }
  }
  return {
    id: 'ntr-hydration',
    domain: 'nutrition',
    kind: 'trend',
    sentiment: 'neutral',
    icon: 'hydration',
    title: `Averaging ${avgL}L water a day — ${pctOfGoal}% of your ${goalL}L target, hit ${hitDays} of ${logged7.length} logged days.`,
    detail,
    metric: { value: avgL, unit: 'L' },
    sampleWindow,
    confidence: confidenceFrom(logged7.length, effect),
    effect: effect * 0.6,
  }
}

/** All nutrition insights that pass their thresholds, ranked. */
export function nutritionInsights(input: NutritionEngineInput): Insight[] {
  const insights = [
    proteinGapRule(input),
    calorieAdherenceRule(input),
    macroCompositionRule(input),
    mealTimingRule(input),
    loggingConsistencyRule(input),
    weekdayWeekendRule(input),
    proteinEfficiencyRule(input),
    hydrationAdherenceRule(input),
    winRule(input),
  ].filter((i): i is Insight => i != null)
  return rankInsights(insights)
}
