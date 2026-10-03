import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'

import type { CalendarItem } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { eventHue } from '../calendar-colors'
import { isWeekend, monthGrid, parseISODate, toISODate } from '../calendar-dates'
import { isTimed, itemKey, itemStatus, matchesQuery } from '../calendar-layout'
import { formatShortTime, timeToMinutes } from '../calendar-time'
import { AllDayChip } from './event-block'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Height of one event row inside a cell, and the cell's date header (phones run tighter). */
const ROW_PX = { desktop: 20, phone: 18 }
const CELL_HEAD_PX = { desktop: 30, phone: 26 }

type Open = (item: CalendarItem, e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void

type Props = {
  selected: string
  itemsByDay: Map<string, CalendarItem[]>
  todayIso: string
  nowMinutes: number
  activeKey: string | null
  query: string
  onOpen: Open
  onToggleDone: (item: CalendarItem) => void
  onOverflow: (iso: string, cell: HTMLElement) => void
  onPickDay: (iso: string) => void
  onCreate: (iso: string) => void
}

/**
 * Month grid. Rows share the stage height; each cell fits as many event rows
 * as its measured height allows and folds the rest behind "+N more". Timed
 * items read as dot · time · title, all-day ones as filled bars (Google's split).
 */
export function MonthView({
  selected,
  itemsByDay,
  todayIso,
  nowMinutes,
  activeKey,
  query,
  onOpen,
  onToggleDone,
  onOverflow,
  onPickDay,
  onCreate,
}: Props) {
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const [rowsFit, setRowsFit] = useState(3)
  const current = parseISODate(selected)
  const days = monthGrid(current)
  const weeks = days.length / 7

  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const measure = () => {
      const size = window.matchMedia('(max-width: 768px)').matches ? 'phone' : 'desktop'
      const cellH = el.clientHeight / weeks
      setRowsFit(Math.max(1, Math.floor((cellH - CELL_HEAD_PX[size]) / ROW_PX[size])))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [weeks])

  return (
    <div className="cv-month">
      <div className="cv-month-head">
        {WEEKDAYS.map((d, i) => (
          <span key={d} className={cn(i === 0 || i === 6 ? 'is-weekend' : undefined)}>
            {d}
          </span>
        ))}
      </div>
      <div className="cv-month-body" ref={bodyRef} style={{ '--cv-weeks': weeks } as CSSProperties}>
        {days.map((d) => {
          const iso = toISODate(d)
          const list = itemsByDay.get(iso) ?? []
          // Keep room for the "+N more" row whenever anything is folded.
          const fits = list.length > rowsFit ? Math.max(0, rowsFit - 1) : rowsFit
          const shown = list.slice(0, fits)
          const hidden = list.length - shown.length
          const isToday = iso === todayIso
          const outside = d.getMonth() !== current.getMonth()
          return (
            <div
              key={iso}
              className={cn(
                'cv-mcell',
                isToday && 'is-today',
                iso === selected && 'is-selected',
                outside && 'is-outside',
                isWeekend(d) && 'is-weekend',
                iso < todayIso && 'is-past',
              )}
              onClick={(e) => {
                if (e.target === e.currentTarget) onCreate(iso)
              }}
            >
              <button
                type="button"
                className="cv-mcell-num"
                onClick={() => onPickDay(iso)}
                aria-label={`Open ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
              >
                {d.getDate() === 1 && <span className="cv-mcell-mo">{d.toLocaleDateString('en-US', { month: 'short' })} </span>}
                {d.getDate()}
              </button>
              <div
                className="cv-mcell-list"
                onClick={(e) => {
                  if (e.target === e.currentTarget) onCreate(iso)
                }}
              >
                {shown.map((item) =>
                  isTimed(item) ? (
                    <div
                      key={itemKey(item)}
                      role="button"
                      tabIndex={0}
                      data-ev-key={item.occurrenceId ?? item.id}
                      className={cn(
                        'cv-mrow',
                        `is-${itemStatus(item, todayIso, nowMinutes)}`,
                        activeKey === itemKey(item) && 'is-active',
                        !matchesQuery(item, query) && 'is-dimmed',
                      )}
                      style={{ '--ev': eventHue(item) } as CSSProperties}
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpen(item, e)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onOpen(item, e)
                      }}
                      title={item.title}
                    >
                      <span className="cv-mrow-dot" />
                      <span className="cv-mrow-time">{formatShortTime(timeToMinutes(item.startTime!)).replace(':00', '')}</span>
                      <span className="cv-mrow-title">{item.title}</span>
                    </div>
                  ) : (
                    <AllDayChip
                      key={itemKey(item)}
                      item={item}
                      className="is-month"
                      active={activeKey === itemKey(item)}
                      dimmed={!matchesQuery(item, query)}
                      status={itemStatus(item, todayIso, nowMinutes)}
                      onOpen={(e) => {
                        e.stopPropagation()
                        onOpen(item, e)
                      }}
                      onToggleDone={() => onToggleDone(item)}
                    />
                  ),
                )}
                {hidden > 0 && (
                  <button
                    type="button"
                    className="cv-mmore"
                    onClick={(e) => {
                      e.stopPropagation()
                      const cell = e.currentTarget.closest('.cv-mcell') as HTMLElement | null
                      onOverflow(iso, cell ?? e.currentTarget)
                    }}
                  >
                    +{hidden}<span className="cv-mmore-label"> more</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
