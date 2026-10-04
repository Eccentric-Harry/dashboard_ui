import { useRef, type CSSProperties } from 'react'

import type { CalendarItem } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { eventHue } from '../calendar-colors'
import { daysBetween, parseISODate, startOfWeek, toISODate } from '../calendar-dates'

type Props = {
  selected: string
  todayIso: string
  itemsByDay: Map<string, CalendarItem[]>
  onPick: (iso: string) => void
  /** Swipe the strip sideways: the same weekday one week back or ahead. */
  onWeek: (direction: 1 | -1) => void
}

/**
 * Phone day view's week strip (iOS Calendar / Fantastical's DayTicker): the
 * selected week as seven tappable days with busy dots, today in ember, the
 * chosen day in ink. Swipe it to move a week.
 */
export function WeekStrip({ selected, todayIso, itemsByDay, onPick, onWeek }: Props) {
  const touch = useRef<{ x: number; y: number } | null>(null)
  const days = daysBetween(startOfWeek(parseISODate(selected)), 7)

  return (
    <div
      className="cv-strip"
      role="tablist"
      aria-label="Week"
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }}
      onTouchEnd={(e) => {
        const start = touch.current
        touch.current = null
        if (!start) return
        const dx = e.changedTouches[0].clientX - start.x
        const dy = e.changedTouches[0].clientY - start.y
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onWeek(dx < 0 ? 1 : -1)
      }}
    >
      {days.map((d) => {
        const iso = toISODate(d)
        const hues = [...new Set((itemsByDay.get(iso) ?? []).filter((it) => !it.cancelled).map(eventHue))].slice(0, 3)
        return (
          <button
            key={iso}
            type="button"
            role="tab"
            aria-selected={iso === selected}
            className={cn('cv-strip-day', iso === selected && 'is-selected', iso === todayIso && 'is-today', iso < todayIso && 'is-past')}
            onClick={() => onPick(iso)}
            aria-label={d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          >
            <span className="cv-strip-wd">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
            <span className="cv-strip-num">{d.getDate()}</span>
            <span className="cv-strip-dots" aria-hidden="true">
              {hues.map((h) => (
                <i key={h} style={{ '--ev': h } as CSSProperties} />
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}
