// The day loop: the five signals /home scores a day on, and how each one is scored.
//
// Everything else about the loop — the segmented arc, the rows under it, the
// headline, the celebration at 100% — reads this module, so the picture and the
// number can never drift apart.
//
// Why these five: they are the daily base the rest of the app hangs off — a night
// of sleep, a mood check-in, movement, one step of learning, and eating decently.
// Focus minutes, task counts, water and calories still matter and still show in
// the hero, but they sit *outside* the loop: they measure output volume, which
// swings with what the day demanded, while these five are the same ask every day.

import type { MealQualityDay } from './home-types'
import {
  formatMinutes,
  LEARNING_TARGET_ENTRIES,
  MEAL_COVERAGE_TARGET,
  MOVEMENT_TARGET_SESSIONS,
  SLEEP_TARGET_MINUTES,
} from './home-types'

export type LoopMetricId = 'sleep' | 'mood' | 'movement' | 'learning' | 'fuel'

export interface LoopMetric {
  id: LoopMetricId
  label: string
  /** 0–1. Drives both the arc segment and the row's bar. */
  ratio: number
  /** Whether the day's ask for this signal is met — the arc's segment reads full. */
  done: boolean
  /** The number/word the row leads with. */
  display: string
  /** Trailing context on the row ("/7h 30m", "· 2 meals"), omitted when there is none. */
  sub?: string
  /** The row's aria description — what this number means. */
  hint: string
  /** Button text when this is the signal the hero suggests closing next. */
  cta: string
  /** Nothing recorded for this signal today. */
  empty: boolean
}

export interface DayLoopInput {
  /** Minutes slept on the night that ended this morning; null when unlogged. */
  sleepMinutes: number | null
  /** Today's mood check-in, 1–5; null when the user hasn't checked in. */
  moodScore: number | null
  /** Workouts recorded today. */
  workouts: number
  /** First workout's name, for the row's sub-label. */
  workoutLabel: string | null
  /** Learning entries logged today. */
  learnings: number
  /** Today's meal-quality aggregate from the nutrition summary. */
  meal: MealQualityDay | null
}

const MOOD_WORDS = ['Heavy', 'Low', 'Okay', 'Good', 'Light'] as const

/**
 * Grade points (A=4 … D=1) → how much of the fuel row that day's eating earns.
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

/**
 * Mood is scored on *having checked in*, not on the score itself. A heavy day is
 * still a logged day, and a loop that drops because you felt low would be asking
 * you to feel better to make a number go up.
 */
function moodMetric(score: number | null): LoopMetric {
  if (score == null) {
    return {
      id: 'mood',
      label: 'Mood',
      ratio: 0,
      done: false,
      display: 'No check-in',
      hint: 'No mood logged yet',
      cta: 'Check in on your mood',
      empty: true,
    }
  }
  return {
    id: 'mood',
    label: 'Mood',
    ratio: 1,
    done: true,
    display: MOOD_WORDS[Math.min(Math.max(score, 1), 5) - 1],
    sub: `${score}/5`,
    hint: 'Checked in today',
    cta: 'Check in on your mood',
    empty: false,
  }
}

function movementMetric(workouts: number, label: string | null): LoopMetric {
  const ratio = clamp01(workouts / MOVEMENT_TARGET_SESSIONS)
  if (workouts <= 0) {
    return {
      id: 'movement',
      label: 'Movement',
      ratio: 0,
      done: false,
      display: 'Rest day',
      hint: 'Nothing logged yet — any session counts',
      cta: 'Log a workout',
      empty: true,
    }
  }
  return {
    id: 'movement',
    label: 'Movement',
    ratio,
    done: ratio >= 1,
    display: workouts === 1 ? 'Moved' : `${workouts} sessions`,
    sub: workouts === 1 && label ? label : undefined,
    hint: 'Logged today',
    cta: 'Log a workout',
    empty: false,
  }
}

function learningMetric(learnings: number): LoopMetric {
  if (learnings <= 0) {
    return {
      id: 'learning',
      label: 'Learning',
      ratio: 0,
      done: false,
      display: 'Nothing yet',
      hint: 'One entry closes this',
      cta: 'Log a learning',
      empty: true,
    }
  }
  const ratio = clamp01(learnings / LEARNING_TARGET_ENTRIES)
  return {
    id: 'learning',
    label: 'Learning',
    ratio,
    done: ratio >= 1,
    display: `${learnings}`,
    sub: learnings === 1 ? 'entry' : 'entries',
    hint: 'Logged today',
    cta: 'Log a learning',
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
function fuelMetric(meal: MealQualityDay | null): LoopMetric {
  const mealsLogged = meal?.mealsLogged ?? 0
  if (mealsLogged <= 0) {
    return {
      id: 'fuel',
      label: 'Fuel quality',
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
    label: 'Fuel quality',
    ratio,
    done: ratio >= 1,
    display: meal?.letter ? `${meal.letter} avg` : 'Ungraded',
    sub: graded > 0 && graded < mealsLogged ? `${mealsWord} · ${graded} graded` : mealsWord,
    hint: graded > 0 ? 'Average meal grade today' : 'Meals logged, none graded yet',
    cta: 'Log a meal',
    empty: false,
  }
}

/** The five loop signals, in the order they read on the arc and in the rows. */
export function buildDayLoop(input: DayLoopInput): LoopMetric[] {
  return [
    sleepMetric(input.sleepMinutes),
    moodMetric(input.moodScore),
    movementMetric(input.workouts, input.workoutLabel),
    learningMetric(input.learnings),
    fuelMetric(input.meal),
  ]
}

/**
 * The gauge percentage: an unweighted mean of the five ratios.
 *
 * Unweighted on purpose — the whole point of naming five signals is that no one of
 * them can carry the day on its own, and a weighting would quietly re-rank them.
 * Every metric always counts, including the ones with nothing logged: a day with no
 * sleep entry is a day the loop can't call closed, not a day sleep didn't apply to.
 */
export function loopScore(metrics: LoopMetric[]): number {
  if (metrics.length === 0) return 0
  const total = metrics.reduce((sum, metric) => sum + metric.ratio, 0)
  return Math.round((total / metrics.length) * 100)
}

/** How many of the five are closed — the "3 of 5" line under the gauge. */
export function loopClosedCount(metrics: LoopMetric[]): number {
  return metrics.filter((metric) => metric.done).length
}

/** Cheapest signal to close first, for breaking ties between equally-open ones. */
const EFFORT: Record<LoopMetricId, number> = { mood: 0, learning: 1, fuel: 2, sleep: 3, movement: 4 }

/**
 * The one thing most worth doing next, or null when there's nothing to suggest.
 *
 * Only *unlogged* signals qualify. A six-hour night scores 0.8 and never reaches
 * done, but no button can fix it before tomorrow — suggesting it would be nagging
 * about a closed decision. Empty signals are the ones still open to being changed
 * today, and among those the cheapest wins: a mood tap beats going for a run.
 */
export function nextLoopNudge(metrics: LoopMetric[]): LoopMetric | null {
  const actionable = metrics.filter((metric) => metric.empty)
  if (actionable.length === 0) return null
  return [...actionable].sort((a, b) => EFFORT[a.id] - EFFORT[b.id])[0]
}
