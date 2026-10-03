// Pure maths behind the calendar views: where a block sits on the time grid,
// how full a day is, what is live right now and where the open time is.
// Nothing here touches the DOM, so it is unit tested directly.

import type { CalendarItem } from '@/types/calendar'
import { DAY_MINUTES, DEFAULT_BLOCK_MINUTES, timeToMinutes } from './calendar-time'

/** A reminder with no end is a moment, not a block — drawn as a short pill. */
export const MOMENT_MINUTES = 30

export function itemKey(item: CalendarItem) {
  return item.occurrenceId ?? `${item.id ?? item.title}-${item.date}-${item.startTime ?? 'all-day'}`
}

export function isRecurring(item: CalendarItem) {
  return Boolean(item.recurrenceFrequency && item.recurrenceFrequency !== 'NONE')
}

export function isTimed(item: CalendarItem) {
  return Boolean(item.startTime) && !item.allDay
}

export function isMoment(item: CalendarItem) {
  return isTimed(item) && !item.endTime && item.itemType === 'REMINDER'
}

/** Start and end in minutes of the day. Synced items with a start but no end read as an hour. */
export function itemSpan(item: CalendarItem) {
  const start = timeToMinutes(item.startTime ?? '00:00')
  if (!item.endTime) return { start, end: Math.min(DAY_MINUTES, start + (isMoment(item) ? MOMENT_MINUTES : DEFAULT_BLOCK_MINUTES)) }
  const end = timeToMinutes(item.endTime)
  // 23:59 is how the API spells midnight.
  return { start, end: end >= DAY_MINUTES - 1 ? DAY_MINUTES : Math.max(end, start + 5) }
}

/** All-day first, then by start time. */
export function compareItems(a: CalendarItem, b: CalendarItem) {
  const aTimed = isTimed(a)
  const bTimed = isTimed(b)
  if (aTimed !== bTimed) return aTimed ? 1 : -1
  return (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.title.localeCompare(b.title)
}

export function byDate(items: CalendarItem[], iso: string) {
  return items.filter((item) => item.date === iso).sort(compareItems)
}

export type Placed = {
  item: CalendarItem
  start: number
  end: number
  /** Column index inside its overlap cluster, and how many columns it may span. */
  col: number
  span: number
  cols: number
}

/**
 * Google Calendar-style placement. Blocks that overlap (transitively) form a
 * cluster; each takes the leftmost free column in its cluster and then widens
 * into any columns to its right that stay free for its whole duration. A day
 * with one clash no longer squeezes every other block on it to half width.
 *
 * `minVisual` is the shortest height a block is drawn at, in minutes — two
 * 10-minute blocks 10 minutes apart would otherwise be drawn on top of each
 * other even though their times don't overlap.
 */
export function layoutDay(items: CalendarItem[], minVisual = 0): Placed[] {
  const timed = items
    .filter(isTimed)
    .map((item) => {
      const { start, end } = itemSpan(item)
      return { item, start, end, visualEnd: Math.max(end, start + minVisual) }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const out: Placed[] = []
  let cluster: { item: CalendarItem; start: number; end: number; visualEnd: number; col: number }[] = []
  let columnsEnd: number[] = []
  let clusterEnd = -1

  const flush = () => {
    const cols = columnsEnd.length
    for (const entry of cluster) {
      let span = 1
      for (let c = entry.col + 1; c < cols; c++) {
        const blocked = cluster.some((o) => o.col === c && o.start < entry.visualEnd && entry.start < o.visualEnd)
        if (blocked) break
        span++
      }
      out.push({ item: entry.item, start: entry.start, end: entry.end, col: entry.col, span, cols })
    }
    cluster = []
    columnsEnd = []
  }

  for (const entry of timed) {
    if (cluster.length && entry.start >= clusterEnd) flush()
    let col = columnsEnd.findIndex((end) => end <= entry.start)
    if (col === -1) {
      col = columnsEnd.length
      columnsEnd.push(entry.visualEnd)
    } else {
      columnsEnd[col] = entry.visualEnd
    }
    cluster.push({ ...entry, col })
    clusterEnd = cluster.length === 1 ? entry.visualEnd : Math.max(clusterEnd, entry.visualEnd)
  }
  if (cluster.length) flush()
  return out
}

/** Booked minutes and live block count — cancelled blocks don't count. */
export function dayLoad(items: CalendarItem[]) {
  const live = items.filter((item) => !item.cancelled)
  const minutes = live.filter(isTimed).reduce((sum, item) => {
    const { start, end } = itemSpan(item)
    return sum + (isMoment(item) ? 0 : end - start)
  }, 0)
  return { count: live.length, minutes }
}

export type ItemStatus = 'cancelled' | 'done' | 'past' | 'live' | 'upcoming'

export function itemStatus(item: CalendarItem, todayIso: string, nowMinutes: number): ItemStatus {
  if (item.cancelled) return 'cancelled'
  if (item.completed) return 'done'
  if (item.date < todayIso) return 'past'
  if (item.date > todayIso || !isTimed(item)) return 'upcoming'
  const { start, end } = itemSpan(item)
  if (nowMinutes >= start && nowMinutes < end) return 'live'
  return nowMinutes >= end ? 'past' : 'upcoming'
}

export type Slot = { start: number; end: number }

/**
 * Open stretches of a day between `from` and `to` that are at least `min`
 * minutes long — the gaps a new block could go into.
 */
export function freeSlots(items: CalendarItem[], from: number, to: number, min = 30): Slot[] {
  if (to - from < min) return []
  const busy = items
    .filter((item) => isTimed(item) && !item.cancelled && !isMoment(item))
    .map(itemSpan)
    .sort((a, b) => a.start - b.start)
  const slots: Slot[] = []
  let cursor = from
  for (const b of busy) {
    if (b.end <= cursor) continue
    if (b.start >= to) break
    if (b.start - cursor >= min) slots.push({ start: cursor, end: b.start })
    cursor = Math.max(cursor, b.end)
  }
  if (to - cursor >= min) slots.push({ start: cursor, end: to })
  return slots
}

/** Planned minutes per category across a set of items (cancelled and moments excluded). */
export function minutesByCategory(items: CalendarItem[]) {
  const totals = new Map<string, number>()
  for (const item of items) {
    if (item.cancelled || !isTimed(item) || isMoment(item)) continue
    const { start, end } = itemSpan(item)
    const key = item.category?.trim() || 'Personal'
    totals.set(key, (totals.get(key) ?? 0) + (end - start))
  }
  return totals
}

/** Notes split into prose and a "- [ ] item" checklist. */
export function splitNotes(notes?: string) {
  const prose: string[] = []
  const checklist: { text: string; done: boolean }[] = []
  for (const line of (notes ?? '').split('\n')) {
    const m = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line)
    if (m) checklist.push({ text: m[2], done: m[1].toLowerCase() === 'x' })
    else if (line.trim()) prose.push(line.trim())
  }
  return { prose: prose.join('\n'), checklist }
}

export function matchesQuery(item: CalendarItem, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    item.title.toLowerCase().includes(q) ||
    (item.notes ?? '').toLowerCase().includes(q) ||
    (item.category ?? '').toLowerCase().includes(q)
  )
}
