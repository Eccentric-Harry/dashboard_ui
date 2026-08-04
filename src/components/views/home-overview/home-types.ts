// Home route types + date helpers. Canonical API types live in lib/api.ts;
// these are the shapes of the two untyped dashboard endpoints Home consumes,
// plus small pure helpers shared by the cards and the insights engine.

/**
 * One day's meal-quality aggregate, from DashboardService.mealQualityOf.
 *
 * `averagePoints` runs on the GPA-shaped ramp the grade badges use (A=4 … D=1) and
 * covers only the graded meals — manual entries never get a grade, which is why
 * `gradedMeals` is reported separately from `mealsLogged`. Null average means
 * "nothing assessed yet", never "poor".
 */
export interface MealQualityDay {
  mealsLogged: number
  gradedMeals: number
  averagePoints: number | null
  letter: 'A' | 'B' | 'C' | 'D' | null
}

/** Shape of GET /dashboard/nutrition-summary (DashboardService.getNutritionSummary). */
export interface NutritionSummary {
  date: string
  dailyCalories: Record<string, number>
  dailyProtein: Record<string, number>
  mealTypeBreakdown: Record<string, number>
  todayTotalCalories: number
  todayTotalProtein: number
  calorieGoal: number
  proteinGoal: number
  /** Optional: absent when the UI is running against a backend older than the day-loop change. */
  dailyMealQuality?: Record<string, MealQualityDay>
  todayMealQuality?: MealQualityDay | null
}

/** Shape of GET /dashboard/spending-summary (DashboardService.getSpendingSummary). */
export interface SpendingSummary {
  month: string
  totalSpent: number
  monthlyBudget: number
  budgetRemaining: number
  budgetUtilization: number
  categoryBreakdown: Record<string, number>
}

// TODO: make the sleep target user-editable from Profile; hardcoded for now.
export const SLEEP_TARGET_HOURS = 7.5
export const SLEEP_TARGET_MINUTES = SLEEP_TARGET_HOURS * 60

// TODO: make the daily focus target user-editable from Profile; hardcoded for now.
export const FOCUS_TARGET_MINUTES = 120

export const WATER_QUICK_ADD_ML = 250

// ---------- Day-loop targets ----------
// Deliberately low bars. The loop asks "did the day happen", not "was it perfect":
// one workout, one learning entry, a mood check-in. See day-loop.ts.

/** Meals a fully-logged day is expected to carry, for the fuel row's coverage factor. */
export const MEAL_COVERAGE_TARGET = 3
/** Learning entries that count as having taken a step. */
export const LEARNING_TARGET_ENTRIES = 1
/** Workouts that count as having moved. */
export const MOVEMENT_TARGET_SESSIONS = 1

export function isoDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

/** The n dates ending at endIso, ascending. */
export function lastNDates(n: number, endIso: string): string[] {
  return Array.from({ length: n }, (_, i) => addDaysIso(endIso, i - (n - 1)))
}

/** 432 → "7h 12m"; 45 → "45m". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h <= 0) return `${m}m`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export function weekdayLetter(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' })
}

export function shortDayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
}

/** ISO timestamp → "2m ago" / "3h ago" / "5d ago". */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

/** "12:30" (24h) → "12:30 PM" per the calendar view's convention. */
export function formatTimeLabel(time?: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return time
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`
}
