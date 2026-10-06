// The camp's calendar: which festival (if any) the camp is dressed for today, and which
// season's weather drifts through the sky. Pure — a day in, a festival out — so a reload
// never changes the decorations, and nothing here reads progress: a festival comes to camp
// whether or not a single lantern was lit.

import type { CampSeasonName } from '@/types/goals'
import { addDays } from './goal-format'

export type CampFestival = 'diwali' | 'new-year-eve' | 'new-year' | 'birthday'

/**
 * Lakshmi Puja, the main night of Diwali, by year — it follows the lunar calendar, so it
 * moves. The camp dresses for the five days around it (Dhanteras → Bhai Dooj).
 * Extend this table before 2029.
 */
const DIWALI: Record<number, string> = {
  2026: '2026-11-08',
  2027: '2027-10-29',
  2028: '2028-10-17',
}

/** Days either side of Diwali night the diyas stay out. */
const DIWALI_SPAN = 2

function diwaliDay(today: string): string | null {
  const night = DIWALI[Number(today.slice(0, 4))]
  if (!night) return null
  return today >= addDays(night, -DIWALI_SPAN) && today <= addDays(night, DIWALI_SPAN) ? night : null
}

/**
 * Today's festival, if any. `birthday` is a YYYY-MM-DD whose month and day repeat every
 * year (the Lighthouse program's, when there is one). The birthday wins a clash.
 */
export function festivalOn(today: string, birthday?: string | null): CampFestival | null {
  if (birthday && birthday.slice(5) === today.slice(5)) return 'birthday'
  if (diwaliDay(today)) return 'diwali'
  if (today.slice(5) === '12-31') return 'new-year-eve'
  if (today.slice(5) === '01-01') return 'new-year'
  return null
}

/** Is it Diwali night itself (not the days around it)? */
export const isDiwaliNight = (today: string) => diwaliDay(today) === today

/** Which festivals light the night sky with fireworks. */
export const FIREWORK_FESTIVALS: ReadonlySet<CampFestival> = new Set(['diwali', 'new-year-eve', 'new-year', 'birthday'])

/** The calendar season, for weather when the camp's own season view hasn't loaded. */
export function calendarSeason(today: string): CampSeasonName {
  const m = Number(today.slice(5, 7))
  if (m === 12 || m <= 2) return 'winter'
  if (m <= 5) return 'spring'
  if (m <= 8) return 'summer'
  return 'autumn'
}

export interface CampPreview {
  festival?: CampFestival
  season?: CampSeasonName
}

const FESTIVALS: readonly CampFestival[] = ['diwali', 'new-year-eve', 'new-year', 'birthday']
const SEASONS: readonly CampSeasonName[] = ['winter', 'spring', 'summer', 'autumn']

/**
 * Dev only: `/goals?camp-preview=diwali` (or a season) dresses the camp without waiting
 * for the date, so a festival can be reviewed in October. Production builds ignore it.
 */
export function campPreview(): CampPreview {
  if (!import.meta.env.DEV) return {}
  const value = new URLSearchParams(window.location.search).get('camp-preview')
  if (!value) return {}
  if ((FESTIVALS as readonly string[]).includes(value)) return { festival: value as CampFestival }
  if ((SEASONS as readonly string[]).includes(value)) return { season: value as CampSeasonName }
  return {}
}
