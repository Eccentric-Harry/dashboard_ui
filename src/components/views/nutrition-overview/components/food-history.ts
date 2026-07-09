// Shared 365-day food-entry history with a short-lived promise cache so the
// header (streak badge) and the recent-logs card don't each fire the same
// heavy GET on page load.
import { fetchFoodEntries } from '../../../../lib/api'

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
  const promise = fetchFoodEntries(365).then(extractEntries)
  // a failed fetch shouldn't poison the cache for the TTL window
  promise.catch(() => {
    if (cache?.promise === promise) cache = null
  })
  cache = { promise, time: now }
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
