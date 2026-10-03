import { type CSSProperties, type MouseEvent } from 'react'
import { Check, Plus } from 'lucide-react'

import type { CalendarItem } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { eventHue } from '../calendar-colors'
import { dayLoad, freeSlots, isMoment, isTimed, itemKey, itemSpan } from '../calendar-layout'
import { formatDuration, formatMinuteRange, formatShortTime } from '../calendar-time'

/** The planning window open time is measured in: 8 AM to 10 PM. */
const DAY_FROM = 8 * 60
const DAY_TO = 22 * 60
/** The ribbon spans a little wider so early/late blocks still show. */
const RIBBON_FROM = 6 * 60
const RIBBON_TO = 24 * 60

type Props = {
  iso: string
  items: CalendarItem[]
  todayIso: string
  nowMinutes: number
  activeKey: string | null
  onOpen: (item: CalendarItem, e: MouseEvent<HTMLElement>) => void
  onToggleDone: (item: CalendarItem) => void
  onCreateSlot: (start: number, end: number) => void
}

/**
 * Day view's side column: the day at a glance, where the open time is, and the
 * day's tasks to tick off. Open time on today starts from now — the morning
 * that already happened isn't free any more.
 */
export function DayBrief({ iso, items, todayIso, nowMinutes, activeKey, onOpen, onToggleDone, onCreateSlot }: Props) {
  const live = items.filter((item) => !item.cancelled)
  const load = dayLoad(items)
  const tasks = live.filter((item) => item.itemType === 'TASK')
  const tasksDone = tasks.filter((item) => item.completed).length
  const isToday = iso === todayIso
  const isPast = iso < todayIso
  const from = isToday ? Math.max(DAY_FROM, Math.ceil(nowMinutes / 15) * 15) : DAY_FROM
  const slots = isPast ? [] : freeSlots(items, from, DAY_TO, 30)
  const openMinutes = slots.reduce((sum, s) => sum + s.end - s.start, 0)
  const ribbon = live
    .filter((item) => isTimed(item) && !isMoment(item))
    .map((item) => ({ item, ...itemSpan(item) }))
    .filter((s) => s.end > RIBBON_FROM && s.start < RIBBON_TO)
  const at = (m: number) => `${((Math.min(RIBBON_TO, Math.max(RIBBON_FROM, m)) - RIBBON_FROM) / (RIBBON_TO - RIBBON_FROM)) * 100}%`

  return (
    <aside className="cv-brief route-scroll" aria-label="Day summary">
      <div className="cv-brief-stats">
        <div>
          <strong>{load.count}</strong>
          <span>{load.count === 1 ? 'block' : 'blocks'}</span>
        </div>
        <div>
          <strong>{load.minutes ? formatDuration(load.minutes) : '0h'}</strong>
          <span>booked</span>
        </div>
        <div>
          <strong>{tasks.length ? `${tasksDone}/${tasks.length}` : '—'}</strong>
          <span>tasks done</span>
        </div>
      </div>

      <div className="cv-ribbon" aria-hidden="true">
        {ribbon.map((s) => (
          <span
            key={itemKey(s.item)}
            className={cn('cv-ribbon-block', s.item.completed && 'is-done')}
            style={{ '--ev': eventHue(s.item), left: at(s.start), width: `calc(${at(s.end)} - ${at(s.start)})` } as CSSProperties}
          />
        ))}
        {isToday && <span className="cv-ribbon-now" style={{ left: at(nowMinutes) }} />}
        <span className="cv-ribbon-ticks">
          <span>6a</span>
          <span>12p</span>
          <span>6p</span>
          <span>12a</span>
        </span>
      </div>

      <section className="cv-brief-sec">
        <header>
          <h3>Open time</h3>
          {slots.length > 0 && <span>{formatDuration(openMinutes)} free</span>}
        </header>
        {isPast ? (
          <p className="cv-brief-quiet">This day has passed.</p>
        ) : slots.length === 0 ? (
          <p className="cv-brief-quiet">{isToday && nowMinutes >= DAY_TO ? 'The day is winding down.' : 'Booked solid between 8 AM and 10 PM.'}</p>
        ) : (
          <ul className="cv-slots">
            {slots.slice(0, 5).map((s) => (
              <li key={s.start}>
                <button type="button" className="cv-slot" onClick={() => onCreateSlot(s.start, Math.min(s.end, s.start + 60))}>
                  <span className="cv-slot-range">{formatMinuteRange(s.start, s.end)}</span>
                  <span className="cv-slot-len">{formatDuration(s.end - s.start)}</span>
                  <span className="cv-slot-add" aria-hidden="true">
                    <Plus size={12} strokeWidth={2.6} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cv-brief-sec">
        <header>
          <h3>Tasks</h3>
          {tasks.length > 0 && <span>{tasks.length - tasksDone} left</span>}
        </header>
        {tasks.length === 0 ? (
          <p className="cv-brief-quiet">No tasks on this day.</p>
        ) : (
          <ul className="cv-brief-tasks">
            {tasks.map((item) => (
              <li key={itemKey(item)}>
                <div
                  className={cn('cv-brief-task', item.completed && 'is-done', activeKey === itemKey(item) && 'is-active')}
                  style={{ '--ev': eventHue(item) } as CSSProperties}
                >
                  <button
                    type="button"
                    className="cv-check"
                    aria-label={item.completed ? 'Mark not done' : 'Mark done'}
                    aria-pressed={Boolean(item.completed)}
                    onClick={() => onToggleDone(item)}
                  >
                    <Check size={9} strokeWidth={3.4} />
                  </button>
                  <button type="button" className="cv-brief-task-title" onClick={(e) => onOpen(item, e)}>
                    {item.title}
                  </button>
                  <span className="cv-brief-task-time">
                    {isTimed(item) ? formatShortTime(itemSpan(item).start) : 'Any time'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
