import { useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { CalendarItem } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { eventHue } from '../calendar-colors'
import { monthGrid, parseISODate, toISODate } from '../calendar-dates'

type Props = {
  selected: string
  todayIso: string
  /** Dates the main view is showing — drawn as one soft band. */
  inView: string[]
  itemsByDay: Map<string, CalendarItem[]>
  onSelect: (iso: string) => void
}

/**
 * Sidebar month. Up to three dots under each date, one per distinct hue that
 * day (Fantastical's density read), so a busy week shows before you open it.
 * Its own arrows only browse; clicking a date moves the main view.
 */
export function MiniMonth({ selected, todayIso, inView, itemsByDay, onSelect }: Props) {
  const [browse, setBrowse] = useState(() => selected.slice(0, 7))
  const [synced, setSynced] = useState(selected)
  if (synced !== selected) {
    setSynced(selected)
    setBrowse(selected.slice(0, 7))
  }

  const month = parseISODate(`${browse}-01`)
  const days = monthGrid(month)
  const inViewSet = new Set(inView)
  const shift = (n: number) => {
    const d = new Date(month.getFullYear(), month.getMonth() + n, 1)
    setBrowse(toISODate(d).slice(0, 7))
  }

  return (
    <div className="cv-mini" aria-label="Month">
      <div className="cv-mini-head">
        <strong>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
        <span className="cv-mini-nav">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft size={13} strokeWidth={2.4} />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight size={13} strokeWidth={2.4} />
          </button>
        </span>
      </div>
      <div className="cv-mini-grid" role="grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="cv-mini-wd" aria-hidden="true">
            {d}
          </span>
        ))}
        {days.map((d, i) => {
          const iso = toISODate(d)
          const hues = [...new Set((itemsByDay.get(iso) ?? []).filter((it) => !it.cancelled).map(eventHue))].slice(0, 3)
          const band = inViewSet.has(iso)
          const prevBand = i % 7 !== 0 && inViewSet.has(toISODate(days[i - 1]))
          const nextBand = i % 7 !== 6 && i + 1 < days.length && inViewSet.has(toISODate(days[i + 1]))
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              aria-selected={iso === selected}
              className={cn(
                'cv-mini-day',
                d.getMonth() !== month.getMonth() && 'is-outside',
                iso === todayIso && 'is-today',
                iso === selected && 'is-selected',
                band && 'is-band',
                band && !prevBand && 'is-band-start',
                band && !nextBand && 'is-band-end',
              )}
              onClick={() => onSelect(iso)}
              aria-label={d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            >
              <span className="cv-mini-num">{d.getDate()}</span>
              <span className="cv-mini-dots" aria-hidden="true">
                {hues.map((hue) => (
                  <i key={hue} style={{ '--ev': hue } as CSSProperties} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
