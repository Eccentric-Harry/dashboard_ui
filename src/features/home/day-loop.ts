// The day loop: the four signals /home scores a day on, and how each one is scored.
//
// Everything else about the loop — the arc, the tiles under it, the headline, the
// celebration at 100% — reads this module, so the picture and the number can never
// drift apart.
//
// Why these four: sleep, water, fuel and tasks are the day's base load — rested,
// hydrated, fed, and moving through what you said you'd do. Mood, movement and
// learning still live on the page (and on their own routes); they just don't score
// the loop, which keeps the hero to one glanceable row of four rather than a wall
// of counters.

import type { MealQualityDay } from './home-types'
import { formatMinutes, MEAL_COVERAGE_TARGET, SLEEP_TARGET_MINUTES } from './home-types'

export type LoopMetricId = 'sleep' | 'water' | 'fuel' | 'tasks'

export interface LoopMetric {
  id: LoopMetricId
  label: string
  /** 0–1. Drives both the arc's fill and the tile's bar. */
  ratio: number
  /** Whether the day's ask for this signal is met. */
  done: boolean
  /** The number/word the tile leads with. */
  display: string
  /** Trailing context on the tile ("/7h 30m", "· 2 meals"), omitted when there is none. */
  sub?: string
  /** The tile's aria description — what this number means. */
  hint: string
  /** Button text when this is the signal the hero suggests closing next. */
  cta: string
  /** Nothing recorded for this signal today. */
  empty: boolean
}

export interface DayLoopInput {
  /** Minutes slept on the night that ended this morning; null when unlogged. */
  sleepMinutes: number | null
  /** Water logged today, in ml. */
  waterMl: number
  /** The day's hydration target in ml; falls back internally when unset. */
  waterTargetMl: number
  /** Today's meal-quality aggregate from the nutrition summary. */
  meal: MealQualityDay | null
  /** Tasks completed today, and how many are on the list. */
  tasksCompleted: number
  tasksTotal: number
}

/** Used when the hydration record carries no target of its own. */
const WATER_TARGET_FALLBACK_ML = 3000

/**
 * Grade points (A=4 … D=1) → how much of the fuel tile that day's eating earns.
 *
 * Not a straight rescale: a straight one would score a day of D-grade meals at
 * zero, making "ate badly" indistinguishable from "ate nothing", and would treat
 * a C day as a near-total loss. Logging honestly should always beat logging
 * nothing, so the ramp bottoms out at 0.25 and bends — the gap between B and A is
 * smaller than the gap between C and B.
 */
const QUALITY_AT_POINTS: Record<number, number> = { 1: 0.25, 2: 0.5, 3: 0.8, 4: 1 }

export function qualityFromPoints(averagePoints: number): number {
  const clamped = Math.min(Math.max(averagePoints, 1), 4)
  const lower = Math.floor(clamped)
  const upper = Math.ceil(clamped)
  if (lower === upper) return QUALITY_AT_POINTS[lower]
  return (
    QUALITY_AT_POINTS[lower] + (QUALITY_AT_POINTS[upper] - QUALITY_AT_POINTS[lower]) * (clamped - lower)
  )
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

function sleepMetric(minutes: number | null): LoopMetric {
  if (minutes == null) {
    return {
      id: 'sleep',
      label: 'Sleep',
      ratio: 0,
      done: false,
      display: 'Not logged',
      hint: 'No night logged yet',
      cta: "Log last night's sleep",
      empty: true,
    }
  }
  const ratio = clamp01(minutes / SLEEP_TARGET_MINUTES)
  return {
    id: 'sleep',
    label: 'Sleep',
    ratio,
    done: ratio >= 1,
    display: formatMinutes(minutes),
    sub: `/${formatMinutes(SLEEP_TARGET_MINUTES)}`,
    hint: 'Last night',
    cta: "Log last night's sleep",
    empty: false,
  }
}

/** Water against the day's target — the tile itself is the +250ml button. */
function waterMetric(ml: number, targetMl: number): LoopMetric {
  const target = targetMl > 0 ? targetMl : WATER_TARGET_FALLBACK_ML
  if (ml <= 0) {
    return {
      id: 'water',
      label: 'Water',
      ratio: 0,
      done: false,
      display: 'None yet',
      hint: 'Nothing logged — tap to add 250ml',
      cta: 'Log your first glass',
      empty: true,
    }
  }
  const ratio = clamp01(ml / target)
  return {
    id: 'water',
    label: 'Water',
    ratio,
    done: ratio >= 1,
    display: ml.toLocaleString(),
    sub: `/${target.toLocaleString()} ml`,
    hint: 'Logged today — tap to add 250ml',
    cta: 'Add a glass of water',
    empty: false,
  }
}

/**
 * Fuel is quality × coverage: how well the meals scored, scaled by how much of the
 * day they account for. Quality alone would call one grade-A snack a perfect day of
 * eating; coverage alone would reward logging three bad meals.
 *
 * Ungraded meals (manual entries, analyses that never finished) still count toward
 * coverage but sit out of the average — they say nothing about quality either way.
 * A day with meals but no grades falls back to coverage at a neutral B-ish quality,
 * so logging still registers instead of reading as a zero.
 */
export interface FuelBreakdown {
  quality: number
  coverage: number
  qualitySource: 'graded' | 'assumed'
}

/** The quality/coverage split behind the fuel ratio — for surfacing the "why" in UI, not for scoring (fuelMetric owns that). */
export function fuelBreakdown(meal: MealQualityDay | null): FuelBreakdown | null {
  const mealsLogged = meal?.mealsLogged ?? 0
  if (mealsLogged <= 0) return null
  const coverage = clamp01(mealsLogged / MEAL_COVERAGE_TARGET)
  const quality = meal?.averagePoints != null ? qualityFromPoints(meal.averagePoints) : QUALITY_AT_POINTS[3]
  return { quality, coverage, qualitySource: meal?.averagePoints != null ? 'graded' : 'assumed' }
}

function fuelMetric(meal: MealQualityDay | null): LoopMetric {
  const mealsLogged = meal?.mealsLogged ?? 0
  if (mealsLogged <= 0) {
    return {
      id: 'fuel',
      label: 'Fuel',
      ratio: 0,
      done: false,
      display: 'No meals',
      hint: 'Grades come from your meal scans',
      cta: 'Log a meal',
      empty: true,
    }
  }

  const coverage = clamp01(mealsLogged / MEAL_COVERAGE_TARGET)
  const graded = meal?.gradedMeals ?? 0
  const quality = meal?.averagePoints != null ? qualityFromPoints(meal.averagePoints) : QUALITY_AT_POINTS[3]
  const ratio = clamp01(quality * coverage)
  const mealsWord = `${mealsLogged} meal${mealsLogged === 1 ? '' : 's'}`

  return {
    id: 'fuel',
    label: 'Fuel',
    ratio,
    done: ratio >= 1,
    display: meal?.letter ? `${meal.letter} avg` : 'Ungraded',
    sub: graded > 0 && graded < mealsLogged ? `${mealsWord} · ${graded} graded` : mealsWord,
    hint: graded > 0 ? 'Average meal grade today' : 'Meals logged, none graded yet',
    cta: 'Log a meal',
    empty: false,
  }
}

/**
 * Tasks closed out of the ones planned.
 *
 * An empty list reads as unplanned, not as finished — scoring "no tasks" at 100%
 * would hand the loop a quarter of its score for a day nobody decided anything
 * about. So it counts as an open signal the day can still fix, with a nudge to
 * put something on the list.
 */
function tasksMetric(completed: number, total: number): LoopMetric {
  if (total <= 0) {
    return {
      id: 'tasks',
      label: 'Tasks',
      ratio: 0,
      done: false,
      display: 'None planned',
      hint: "Nothing on today's list yet",
      cta: "Plan today's tasks",
      empty: true,
    }
  }
  const ratio = clamp01(completed / total)
  return {
    id: 'tasks',
    label: 'Tasks',
    ratio,
    done: ratio >= 1,
    display: `${completed}`,
    sub: `/${total} done`,
    hint: 'Completed today',
    cta: 'Close out a task',
    empty: false,
  }
}

/** The four loop signals, in the order they read on the arc and in the tiles. */
export function buildDayLoop(input: DayLoopInput): LoopMetric[] {
  return [
    sleepMetric(input.sleepMinutes),
    waterMetric(input.waterMl, input.waterTargetMl),
    fuelMetric(input.meal),
    tasksMetric(input.tasksCompleted, input.tasksTotal),
  ]
}

/**
 * The gauge percentage: an unweighted mean of the four ratios.
 *
 * Unweighted on purpose — the whole point of naming four signals is that no one of
 * them can carry the day on its own, and a weighting would quietly re-rank them.
 * Every metric always counts, including the ones with nothing logged: a day with no
 * sleep entry is a day the loop can't call closed, not a day sleep didn't apply to.
 */
export function loopScore(metrics: LoopMetric[]): number {
  if (metrics.length === 0) return 0
  const total = metrics.reduce((sum, metric) => sum + metric.ratio, 0)
  return Math.round((total / metrics.length) * 100)
}

/** How many of the four are closed — the "3 of 4" line under the gauge. */
export function loopClosedCount(metrics: LoopMetric[]): number {
  return metrics.filter((metric) => metric.done).length
}

/** Cheapest signal to close first, for breaking ties between equally-open ones. */
const EFFORT: Record<LoopMetricId, number> = { water: 0, tasks: 1, fuel: 2, sleep: 3 }

/**
 * The one thing most worth doing next, or null when there's nothing to suggest.
 *
 * Only *unlogged* signals qualify. A six-hour night scores 0.8 and never reaches
 * done, but no button can fix it before tomorrow — suggesting it would be nagging
 * about a closed decision. Empty signals are the ones still open to being changed
 * today, and among those the cheapest wins: a glass of water beats cooking a meal.
 */
export function nextLoopNudge(metrics: LoopMetric[]): LoopMetric | null {
  const actionable = metrics.filter((metric) => metric.empty)
  if (actionable.length === 0) return null
  return [...actionable].sort((a, b) => EFFORT[a.id] - EFFORT[b.id])[0]
}
