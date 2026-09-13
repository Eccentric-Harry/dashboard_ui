// One read of sleep for the whole Home route.
//
// Sleep shows up on four surfaces — the Day Loop row, the Sleep card, the Trends
// tile and the week rollup — and they used to each key entries by date on their
// own. When one of them disagreed about which entry was "last night", the Day Loop
// said "Not logged" directly above a card showing a closed night. Every consumer
// now reads the entries normalized here, so they can't drift again.

import type { SleepEntry } from '@/lib/api'
import { addDaysIso, isoDate, lastNDates, SLEEP_TARGET_MINUTES } from './home-types'

/** An entry as Home reads it: `date` may be re-attributed, `storedDate` is what the backend holds. */
export type HomeSleepEntry = SleepEntry & { storedDate: string }

export interface SleepSummary {
  /** Entries ascending by (attributed) date. */
  entries: HomeSleepEntry[]
  byDate: Map<string, HomeSleepEntry>
  /** The night that ended this morning, or null when unlogged. */
  lastNight: HomeSleepEntry | null
  /** Most recent entry of any date, for the card when last night is missing. */
  latest: HomeSleepEntry | null
  /** Entries within the last 7 days (today inclusive). */
  week: HomeSleepEntry[]
  /** Mean minutes per logged night this week. */
  avgMinutes: number | null
  /** Average night vs the nightly target, in minutes (positive = over). */
  avgVsTargetMinutes: number | null
}

const crossesMidnight = (e: SleepEntry) => Boolean(e.bedtime && e.wakeTime && e.bedtime > e.wakeTime)

/**
 * `date` is the wake-up date, but the log form used to label it "Night of", which
 * reads as the bedtime date. A 23:30 → 07:30 night logged this morning therefore
 * landed on yesterday. When yesterday's entry crosses midnight, was written today,
 * and today has no entry of its own, it can only be last night — attribute it so.
 */
function attribute(entry: SleepEntry, today: string, hasToday: boolean): string {
  if (hasToday || entry.date !== addDaysIso(today, -1) || !crossesMidnight(entry)) return entry.date
  const written = entry.updatedAt ?? entry.createdAt
  if (!written) return entry.date
  const writtenDay = isoDate(new Date(written))
  return writtenDay === today ? today : entry.date
}

export function summarizeSleep(raw: SleepEntry[] | null, today: string): SleepSummary {
  const list = raw ?? []
  const hasToday = list.some((e) => e.date === today)
  const entries = list
    .map((e) => ({ ...e, storedDate: e.date, date: attribute(e, today, hasToday) }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const byDate = new Map(entries.map((e) => [e.date, e]))

  const week = lastNDates(7, today)
    .map((d) => byDate.get(d))
    .filter((e): e is HomeSleepEntry => Boolean(e))
  const avgMinutes =
    week.length > 0 ? Math.round(week.reduce((sum, e) => sum + e.durationMinutes, 0) / week.length) : null

  return {
    entries,
    byDate,
    lastNight: byDate.get(today) ?? null,
    latest: entries[entries.length - 1] ?? null,
    week,
    avgMinutes,
    avgVsTargetMinutes: avgMinutes != null ? avgMinutes - SLEEP_TARGET_MINUTES : null,
  }
}
