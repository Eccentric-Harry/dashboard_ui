import type { CSSProperties } from 'react'

import type { CalendarItem } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { daysBetween, parseISODate, startOfWeek, toISODate } from '../calendar-dates'
import { dayLoad } from '../calendar-layout'
import { formatDuration } from '../calendar-time'

type Props = {
  selected: string
  todayIso: string
  itemsByDay: Map<string, CalendarItem[]>
  onPick: (iso: string) => void
}

/** A day reads as full at this many booked hours — the bars' scale. */
const FULL = 10 * 60

/**
 * The selected week as seven bars of booked time, so the shape of the week —
 * the crunch day, the open evening — shows before you scroll the grid. It also
 * names the lightest day still ahead: the obvious place to put something new.
 */
export function WeekPulse({ selected, todayIso, itemsByDay, onPick }: Props) {
  const days = daysBetween(startOfWeek(parseISODate(selected)), 7).map((d) => {
    const iso = toISODate(d)
    return { iso, d, minutes: dayLoad(itemsByDay.get(iso) ?? []).minutes }
  })
  const total = days.reduce((sum, x) => sum + x.minutes, 0)
  const ahead = days.filter((x) => x.iso >= todayIso)
  const lightest = ahead.length ? ahead.reduce((a, b) => (b.minutes < a.minutes ? b : a)) : null
  const busiest = days.reduce((a, b) => (b.minutes > a.minutes ? b : a))

  return (
    <section className="cv-pulse" aria-label="Week at a glance">
      <header className="cv-side-head">
        <h3>Week at a glance</h3>
        <span className="cv-pulse-total">{total ? formatDuration(total) : 'Open week'}</span>
      </header>
      <div className="cv-pulse-bars">
        {days.map((x) => (
          <button
            key={x.iso}
            type="button"
            className={cn('cv-pulse-day', x.iso === todayIso && 'is-today', x.iso < todayIso && 'is-past', x.iso === selected && 'is-selected')}
            onClick={() => onPick(x.iso)}
            title={`${x.d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · ${x.minutes ? formatDuration(x.minutes) : 'free'}`}
          >
            <span className="cv-pulse-track">
              <i style={{ '--h': `${Math.min(100, (x.minutes / FULL) * 100)}%` } as CSSProperties} />
            </span>
            <span className="cv-pulse-wd">{x.d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
          </button>
        ))}
      </div>
      <p className="cv-pulse-note">
        {lightest && busiest.minutes > 0
          ? lightest.minutes === 0
            ? `${lightest.iso === todayIso ? 'Today' : lightest.d.toLocaleDateString('en-US', { weekday: 'long' })} is wide open.`
            : `Lightest ahead: ${lightest.d.toLocaleDateString('en-US', { weekday: 'long' })} · ${formatDuration(lightest.minutes)}`
          : 'Nothing booked yet — plenty of room.'}
      </p>
    </section>
  )
}
