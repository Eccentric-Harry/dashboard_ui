// Minute-of-day arithmetic for the time grid and the add/edit modal.
// Times travel as 'HH:mm' strings (the API shape); the grid works in minutes.

export const DAY_MINUTES = 24 * 60
/** Drag and resize snap, matching Google Calendar. */
export const SNAP_MINUTES = 15
/** Length of a block made by a click or long-press rather than a drag. */
export const DEFAULT_BLOCK_MINUTES = 60

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** 'HH:mm' for a minute of the day. The end of the day clamps to 23:59 — the API has no 24:00. */
export function minutesToTime(minutes: number) {
  const clamped = Math.max(0, Math.min(DAY_MINUTES - 1, Math.round(minutes)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function snapMinutes(minutes: number, step = SNAP_MINUTES) {
  return Math.round(minutes / step) * step
}

export function floorMinutes(minutes: number, step = SNAP_MINUTES) {
  return Math.floor(minutes / step) * step
}

export function formatClockTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** '4 PM' / '4:30 PM' — the compact form used on blocks and the drag ghost. */
export function formatShortTime(minutes: number) {
  const m = Math.max(0, Math.min(DAY_MINUTES, minutes))
  const h24 = Math.floor(m / 60) % 24
  const mins = m % 60
  const suffix = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return mins ? `${h12}:${String(mins).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`
}

/** '4 – 5:30 PM', dropping the first meridiem when both ends share it. */
export function formatMinuteRange(start: number, end: number) {
  const a = formatShortTime(start)
  const b = formatShortTime(end)
  const sameHalf = (start < 720) === (end < 720 || end === DAY_MINUTES) && end !== DAY_MINUTES
  return sameHalf ? `${a.replace(/ (AM|PM)$/, '')} – ${b}` : `${a} – ${b}`
}

/** '45m', '1h', '1h 30m'. */
export function formatDuration(minutes: number) {
  if (minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}
