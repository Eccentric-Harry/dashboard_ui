// Date arithmetic for the calendar route. Dates travel as local 'YYYY-MM-DD'
// strings (the API shape) and are only turned into Date objects at local
// midnight, so a date never shifts across the UTC boundary (IST is +5:30).
// Weeks start on Sunday, matching the month grid the route has always used.

export type CalendarView = 'day' | 'workweek' | 'week' | 'month' | 'agenda'

export const VIEWS: { id: CalendarView; label: string; key: string; mobile: boolean }[] = [
  { id: 'day', label: 'Day', key: 'D', mobile: true },
  { id: 'workweek', label: 'Work week', key: 'X', mobile: false },
  { id: 'week', label: 'Week', key: 'W', mobile: false },
  { id: 'month', label: 'Month', key: 'M', mobile: true },
  { id: 'agenda', label: 'Agenda', key: 'A', mobile: true },
]

/** How many days the agenda reads ahead of the selected date. */
export const AGENDA_DAYS = 21

export function parseISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: Date, n: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + n)
  return next
}

export function addDaysIso(iso: string, n: number) {
  return toISODate(addDays(parseISODate(iso), n))
}

export function daysBetween(start: Date, count: number) {
  return Array.from({ length: count }, (_, i) => addDays(start, i))
}

export function startOfWeek(date: Date) {
  return addDays(date, -date.getDay())
}

/** Whole weeks covering the month, Sunday to Saturday. */
export function monthGrid(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const start = startOfWeek(first)
  const end = addDays(startOfWeek(last), 6)
  const count = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  return daysBetween(start, count)
}

/** ISO-8601 week number (weeks start Monday there; it's only a label). */
export function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

/** The day columns a time-grid view draws. */
export function gridDays(view: CalendarView, selected: string) {
  const d = parseISODate(selected)
  if (view === 'workweek') return daysBetween(addDays(startOfWeek(d), 1), 5)
  if (view === 'week') return daysBetween(startOfWeek(d), 7)
  return [d]
}

/** Every date a view can show, as ISO strings (drives per-range summaries). */
export function viewDates(view: CalendarView, selected: string) {
  const d = parseISODate(selected)
  if (view === 'month') {
    const month = d.getMonth()
    return monthGrid(d).filter((day) => day.getMonth() === month).map(toISODate)
  }
  if (view === 'agenda') return daysBetween(d, AGENDA_DAYS).map(toISODate)
  return gridDays(view, selected).map(toISODate)
}

/**
 * The fetch window: everything the view can render plus the selected date's
 * whole month grid (the sidebar mini month draws density dots from the same
 * list). Time-grid views take a 4-week block snapped to weeks so stepping a
 * few days reuses the loaded range instead of refetching.
 */
export function fetchRange(view: CalendarView, selected: string) {
  const d = parseISODate(selected)
  const grid = monthGrid(d)
  let start = grid[0]
  let end = grid[grid.length - 1]
  if (view === 'agenda') {
    const agendaEnd = addDays(d, AGENDA_DAYS - 1)
    if (agendaEnd > end) end = agendaEnd
  } else if (view !== 'month') {
    const anchor = startOfWeek(d)
    const a = addDays(anchor, -7)
    const b = addDays(anchor, 20)
    if (a < start) start = a
    if (b > end) end = b
  }
  return { start: toISODate(start), end: toISODate(end) }
}

export function stepDate(view: CalendarView, selected: string, direction: 1 | -1) {
  const d = parseISODate(selected)
  if (view === 'month') {
    // Clamp to the last day so Jan 31 → Feb 28 rather than rolling into March.
    const target = new Date(d.getFullYear(), d.getMonth() + direction, 1)
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
    target.setDate(Math.min(d.getDate(), last))
    return toISODate(target)
  }
  const size = view === 'week' || view === 'workweek' || view === 'agenda' ? 7 : 1
  return toISODate(addDays(d, size * direction))
}

const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', opts)

/** Eyebrow + title for the toolbar, e.g. "Week 40 · Sep 27 – Oct 3" / "October" "2026". */
export function rangeHeading(view: CalendarView, selected: string) {
  const d = parseISODate(selected)
  const span = (a: Date, b: Date) =>
    a.getMonth() === b.getMonth()
      ? `${fmt(a, { month: 'short', day: 'numeric' })} – ${b.getDate()}`
      : `${fmt(a, { month: 'short', day: 'numeric' })} – ${fmt(b, { month: 'short', day: 'numeric' })}`
  if (view === 'day') {
    return {
      eyebrow: `${fmt(d, { weekday: 'long' })} · Week ${isoWeek(d)}`,
      title: fmt(d, { month: 'long', day: 'numeric' }),
      year: String(d.getFullYear()),
    }
  }
  const days = view === 'month' ? null : view === 'agenda' ? daysBetween(d, AGENDA_DAYS) : gridDays(view, selected)
  const eyebrow = days
    ? view === 'week'
      ? `Week ${isoWeek(days[0])} · ${span(days[0], days[days.length - 1])}`
      : span(days[0], days[days.length - 1])
    : `${monthGrid(d).length / 7} weeks`
  // A range that crosses months is titled by the month most of it sits in.
  const mid = days ? days[Math.floor(days.length / 2)] : d
  return { eyebrow, title: fmt(mid, { month: 'long' }), year: String(mid.getFullYear()) }
}

/** 'Today' / 'Tomorrow' / 'Yesterday' / 'Mon, Oct 5'. */
export function relativeDay(iso: string, todayIso: string) {
  const diff = Math.round((parseISODate(iso).getTime() - parseISODate(todayIso).getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return fmt(parseISODate(iso), { weekday: 'short', month: 'short', day: 'numeric' })
}

export function longDate(iso: string) {
  return fmt(parseISODate(iso), { weekday: 'long', month: 'long', day: 'numeric' })
}

export function isWeekend(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}
