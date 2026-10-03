import { createElement, type CSSProperties, type MouseEvent } from 'react'
import { Check, Coffee } from 'lucide-react'

import type { CalendarItem } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { eventHue } from '../calendar-colors'
import { relativeDay } from '../calendar-dates'
import { iconForItem } from '../calendar-icons'
import { compareItems, isMoment, isTimed, itemKey, itemSpan } from '../calendar-layout'
import { formatDuration, formatMinuteRange, formatShortTime } from '../calendar-time'

type Props = {
  /** Today through the next week, every category. */
  items: CalendarItem[]
  todayIso: string
  nowMinutes: number
  onOpen: (item: CalendarItem, e: MouseEvent<HTMLElement>) => void
  onToggleDone: (item: CalendarItem) => void
  onPlan: () => void
}

function inWords(minutes: number) {
  if (minutes < 1) return 'now'
  if (minutes < 60) return `in ${minutes} min`
  return `in ${formatDuration(minutes)}`
}

/**
 * "What's happening and what's next" — the one question a calendar sidebar
 * should answer at a glance (Notion Calendar's menu bar, Fantastical's list).
 * Real items only: no placeholder meetings when the day is empty.
 */
export function UpNext({ items, todayIso, nowMinutes, onOpen, onToggleDone, onPlan }: Props) {
  const open = items.filter((item) => !item.cancelled && !item.completed && item.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date) || compareItems(a, b))
  const today = open.filter((item) => item.date === todayIso)
  const timedToday = today.filter(isTimed)
  const live = timedToday
    .filter((item) => {
      const { start, end } = itemSpan(item)
      return nowMinutes >= start && nowMinutes < end
    })
    .sort((a, b) => itemSpan(a).end - itemSpan(b).end)
  const comingToday = timedToday.filter((item) => itemSpan(item).start > nowMinutes)
  const later = open.filter((item) => item.date > todayIso)

  const hero = live[0] ?? comingToday[0] ?? later[0]
  const then = hero && hero.date === todayIso ? comingToday.filter((item) => item !== hero).slice(0, 3) : []
  const anyTime = today.filter((item) => !isTimed(item))

  if (!hero && anyTime.length === 0) {
    return (
      <section className="cv-upnext is-empty">
        <span className="cv-upnext-empty-ic" aria-hidden="true">
          <Coffee size={16} strokeWidth={2} />
        </span>
        <div>
          <strong>Nothing ahead this week</strong>
          <button type="button" onClick={onPlan}>Plan something</button>
        </div>
      </section>
    )
  }

  let eyebrow = ''
  let progress: number | null = null
  if (hero) {
    const { start, end } = itemSpan(hero)
    if (live[0] === hero) {
      eyebrow = `Now · ${formatDuration(end - nowMinutes)} left`
      progress = Math.min(100, Math.max(0, ((nowMinutes - start) / (end - start)) * 100))
    } else if (hero.date === todayIso) {
      eyebrow = `Next · ${inWords(start - nowMinutes)}`
    } else {
      eyebrow = `${relativeDay(hero.date, todayIso)} · ${isTimed(hero) ? formatShortTime(start) : 'All day'}`
    }
  }

  return (
    <section className="cv-upnext" aria-label="Up next">
      {hero && (
        <div
          role="button"
          tabIndex={0}
          className={cn('cv-upnext-hero', live[0] === hero && 'is-live')}
          style={{ '--ev': eventHue(hero) } as CSSProperties}
          onClick={(e) => onOpen(hero, e)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onOpen(hero, e as unknown as MouseEvent<HTMLElement>)
          }}
        >
          <span className="cv-upnext-eyebrow">
            <i aria-hidden="true" />
            {eyebrow}
          </span>
          <div className="cv-upnext-main">
            <span className="cv-upnext-ic" aria-hidden="true">
              {createElement(iconForItem(hero), { size: 15, strokeWidth: 2.2 })}
            </span>
            <div className="cv-upnext-text">
              <strong>{hero.title}</strong>
              <span>
                {isTimed(hero)
                  ? isMoment(hero)
                    ? formatShortTime(itemSpan(hero).start)
                    : formatMinuteRange(itemSpan(hero).start, itemSpan(hero).end)
                  : 'All day'}
                {' · '}
                {hero.category || 'Personal'}
              </span>
            </div>
            {hero.itemType === 'TASK' && (
              <button
                type="button"
                className="cv-check is-lg"
                aria-label="Mark done"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleDone(hero)
                }}
              >
                <Check size={11} strokeWidth={3.2} />
              </button>
            )}
          </div>
          {progress != null && (
            <span className="cv-upnext-progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </span>
          )}
          {hero.date !== todayIso && <span className="cv-upnext-clear">You're clear for the rest of today.</span>}
        </div>
      )}

      {(then.length > 0 || anyTime.length > 0) && (
        <ul className="cv-upnext-list">
          {then.map((item) => (
            <li key={itemKey(item)}>
              <button type="button" style={{ '--ev': eventHue(item) } as CSSProperties} onClick={(e) => onOpen(item, e)}>
                <span className="cv-upnext-time">{formatShortTime(itemSpan(item).start)}</span>
                <i aria-hidden="true" />
                <span className="cv-upnext-title">{item.title}</span>
              </button>
            </li>
          ))}
          {anyTime.slice(0, 3).map((item) => (
            <li key={itemKey(item)}>
              <button type="button" style={{ '--ev': eventHue(item) } as CSSProperties} onClick={(e) => onOpen(item, e)}>
                <span className="cv-upnext-time">Today</span>
                <i aria-hidden="true" />
                <span className="cv-upnext-title">{item.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
