// Shared nutrition reads for the /nutrition route, behind short-lived promise
// caches. Five cards mount at once and each used to fire its own GET; the
// history window, the calendar dots, the analytics window and the two copies of
// the 7-day summary now collapse into one request each.
import { nutritionService } from '../../../../services/nutrition-service'

export type HistoryFoodEntry = {
  id?: string
  description?: string
  mealType?: string
  proteinGrams?: number
  calories?: number
  date?: string
  loggedDate?: string
  createdAt?: string
  mealQuality?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

type FoodEntriesResponse = {
  data?: HistoryFoodEntry[] | { entries?: HistoryFoodEntry[]; foodEntries?: HistoryFoodEntry[] }
  entries?: HistoryFoodEntry[]
}

export const extractEntries = (response: unknown): HistoryFoodEntry[] => {
  if (Array.isArray(response)) return response as HistoryFoodEntry[]
  const payload = response as FoodEntriesResponse
  if (Array.isArray(payload?.data)) return payload.data
  if (!Array.isArray(payload?.data) && Array.isArray(payload?.data?.entries)) return payload.data.entries
  if (!Array.isArray(payload?.data) && Array.isArray(payload?.data?.foodEntries)) return payload.data.foodEntries
  if (Array.isArray(payload?.entries)) return payload.entries
  return []
}

const TTL_MS = 15_000
let cache: { promise: Promise<HistoryFoodEntry[]>; time: number } | null = null

export function getFoodHistory(options?: { fresh?: boolean }): Promise<HistoryFoodEntry[]> {
  const now = Date.now()
  if (!options?.fresh && cache && now - cache.time < TTL_MS) {
    return cache.promise
  }
  // Summary view — a year of entries stays small enough to be the one shared read
  // that the history list, the calendar dots and the analytics window all sit on.
  const promise = nutritionService.getFoodEntries(365).then((res) => {
    if (res.error) throw res.error
    return extractEntries(res)
  })
  // a failed fetch shouldn't poison the cache for the TTL window
  promise.catch(() => {
    if (cache?.promise === promise) cache = null
  })
  cache = { promise, time: now }
  return promise
}

/** Same TTL treatment for the 7-day summary, which two cards ask for on mount. */
const summaryCache = new Map<string, { promise: Promise<unknown>; time: number }>()

export function getNutritionSummaryShared(date: string): Promise<unknown> {
  const now = Date.now()
  const hit = summaryCache.get(date)
  if (hit && now - hit.time < TTL_MS) return hit.promise

  const promise = nutritionService.getSummary(date).then((res) => {
    if (res.error) throw res.error
    return res.data
  })
  promise.catch(() => {
    if (summaryCache.get(date)?.promise === promise) summaryCache.delete(date)
  })
  summaryCache.set(date, { promise, time: now })
  return promise
}

const isoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Consecutive days with at least one logged meal, walking back from today.
 *  An unlogged today doesn't break the streak — it just doesn't count yet. */
export function computeLoggingStreak(entries: HistoryFoodEntry[]): number {
  const loggedDates = new Set<string>()
  for (const entry of entries) {
    const raw = entry.date || entry.loggedDate || entry.createdAt
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
      loggedDates.add(raw.slice(0, 10))
    }
  }
  if (loggedDates.size === 0) return 0

  const cursor = new Date()
  if (!loggedDates.has(isoDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (loggedDates.has(isoDate(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
