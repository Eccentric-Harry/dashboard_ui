import { createElement, Fragment, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import { CalendarCheck2, Check, Plus, Repeat } from 'lucide-react'

import type { CalendarItem } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { eventHue } from '../calendar-colors'
import { addDays, parseISODate, toISODate } from '../calendar-dates'
import { iconForItem } from '../calendar-icons'
import { isMoment, isRecurring, isTimed, itemKey, itemSpan, itemStatus, matchesQuery } from '../calendar-layout'
import { formatClockTime, formatDuration, formatMinuteRange, formatShortTime } from '../calendar-time'

type Open = (item: CalendarItem, e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void

type Props = {
  start: string
  days: number
  itemsByDay: Map<string, CalendarItem[]>
  todayIso: string
  nowMinutes: number
  activeKey: string | null
  query: string
  onOpen: Open
  onToggleDone: (item: CalendarItem) => void
  onCreate: (iso: string) => void
  onPickDay: (iso: string) => void
}

type Group = { kind: 'day'; iso: string; items: CalendarItem[] } | { kind: 'free'; from: string; to: string }

/**
 * Schedule list (Google's Schedule, Outlook's Agenda): "what's next" without
 * the grid. Runs of empty days fold into one quiet "Nothing planned" line, and
 * today carries a now-marker between what's done and what's coming.
 */
export function AgendaView({ start, days, itemsByDay, todayIso, nowMinutes, activeKey, query, onOpen, onToggleDone, onCreate, onPickDay }: Props) {
  const groups: Group[] = []
  const first = parseISODate(start)
  for (let i = 0; i < days; i++) {
    const iso = toISODate(addDays(first, i))
    const items = itemsByDay.get(iso) ?? []
    if (items.length || iso === todayIso) {
      groups.push({ kind: 'day', iso, items })
    } else {
      const last = groups[groups.length - 1]
      if (last?.kind === 'free') last.to = iso
      else groups.push({ kind: 'free', from: iso, to: iso })
    }
  }
  const anything = groups.some((g) => g.kind === 'day' && g.items.length > 0)

  return (
    <div className="cv-agenda route-scroll">
      {!anything && (
        <div className="cv-empty">
          <CalendarCheck2 size={22} strokeWidth={1.8} />
          <strong>A clear three weeks</strong>
          <span>Nothing is planned from here. Add a block, or type one into Quick add.</span>
        </div>
      )}
      {anything &&
        groups.map((g) => {
          if (g.kind === 'free') {
            const a = parseISODate(g.from)
            const b = parseISODate(g.to)
            const label =
              g.from === g.to
                ? a.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                : `${a.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} – ${b.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
            return (
              <button key={g.from} type="button" className="cv-agenda-free" onClick={() => onCreate(g.from)}>
                <span className="cv-agenda-free-line" />
                <span>Nothing planned · {label}</span>
                <Plus size={12} strokeWidth={2.4} />
              </button>
            )
          }
          const d = parseISODate(g.iso)
          const isToday = g.iso === todayIso
          // Where the now-marker goes: before the first block that hasn't ended.
          const nowIndex = isToday
            ? g.items.findIndex((item) => isTimed(item) && itemSpan(item).end > nowMinutes)
            : -1
          return (
            <section key={g.iso} className={cn('cv-agenda-day', isToday && 'is-today', g.iso < todayIso && 'is-past')}>
              <button type="button" className="cv-agenda-date" onClick={() => onPickDay(g.iso)} title="Open this day">
                <span className="cv-agenda-wd">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="cv-agenda-num">{d.getDate()}</span>
                <span className="cv-agenda-mo">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
              </button>
              <div className="cv-agenda-list">
                {g.items.length === 0 && (
                  <button type="button" className="cv-agenda-none" onClick={() => onCreate(g.iso)}>
                    Nothing on today — <span>add something</span>
                  </button>
                )}
                {g.items.map((item, i) => {
                  const key = itemKey(item)
                  const timed = isTimed(item)
                  const span = timed ? itemSpan(item) : null
                  const status = itemStatus(item, todayIso, nowMinutes)
                  const isTask = item.itemType === 'TASK'
                  return (
                    <Fragment key={key}>
                      {i === nowIndex && <NowMarker minutes={nowMinutes} />}
                      <div
                        role="button"
                        tabIndex={0}
                        data-ev-key={item.occurrenceId ?? item.id}
                        className={cn(
                          'cv-agenda-row',
                          `is-${status}`,
                          activeKey === key && 'is-active',
                          !matchesQuery(item, query) && 'is-dimmed',
                        )}
                        style={{ '--ev': eventHue(item) } as CSSProperties}
                        onClick={(e) => onOpen(item, e)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onOpen(item, e)
                        }}
                      >
                        <span className="cv-agenda-time">
                          {!span ? 'All day' : isMoment(item) ? formatShortTime(span.start) : formatMinuteRange(span.start, span.end)}
                        </span>
                        <span className="cv-agenda-mark">
                          {isTask ? (
                            <button
                              type="button"
                              className="cv-check"
                              aria-label={item.completed ? 'Mark not done' : 'Mark done'}
                              aria-pressed={Boolean(item.completed)}
                              onClick={(e) => {
                                e.stopPropagation()
                                onToggleDone(item)
                              }}
                            >
                              <Check size={9} strokeWidth={3.4} />
                            </button>
                          ) : (
                            <span className="cv-agenda-ic">
                              {createElement(iconForItem(item), { size: 12, strokeWidth: 2.3, 'aria-hidden': true })}
                            </span>
                          )}
                        </span>
                        <span className="cv-agenda-title">
                          {item.title}
                          {isRecurring(item) && <Repeat size={10} strokeWidth={2.6} aria-label="Repeats" />}
                        </span>
                        <span className="cv-agenda-cat">{item.category || 'Personal'}</span>
                        <span className="cv-agenda-dur">
                          {span && !isMoment(item) ? formatDuration(span.end - span.start) : ''}
                        </span>
                      </div>
                    </Fragment>
                  )
                })}
                {isToday && nowIndex === -1 && g.items.some(isTimed) && <NowMarker minutes={nowMinutes} />}
              </div>
            </section>
          )
        })}
    </div>
  )
}

function NowMarker({ minutes }: { minutes: number }) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mm = String(minutes % 60).padStart(2, '0')
  return (
    <div className="cv-agenda-now" aria-label="Now">
      <span>{formatClockTime(`${hh}:${mm}`)}</span>
    </div>
  )
}
