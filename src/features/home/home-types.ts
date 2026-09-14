// Home route constants + date helpers shared by the cards and the insights engine.
// The dashboard summary shapes Home consumes are canonical in types/; re-exported
// here so the feature keeps a single local import.

export type { MealQualityDay, NutritionSummary } from '@/types/nutrition'
export type { SpendingSummary } from '@/types/finance'

// TODO: make the sleep target user-editable from Profile; hardcoded for now.
export const SLEEP_TARGET_HOURS = 7.5
export const SLEEP_TARGET_MINUTES = SLEEP_TARGET_HOURS * 60

export const WATER_QUICK_ADD_ML = 250

// ---------- Day-loop targets ----------
// Deliberately low bars. The loop asks "did the day happen", not "was it
// perfect". See day-loop.ts.

/** Meals a fully-logged day is expected to carry, for the fuel row's coverage factor. */
export const MEAL_COVERAGE_TARGET = 3

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
