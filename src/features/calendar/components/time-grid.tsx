import { useMemo, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type RefObject } from 'react'
import { ChevronDown } from 'lucide-react'

import type { CalendarItem } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { eventHue } from '../calendar-colors'
import { isWeekend, toISODate } from '../calendar-dates'
import { dayLoad, isRecurring, isTimed, itemKey, itemStatus, layoutDay, matchesQuery } from '../calendar-layout'
import { DAY_MINUTES, formatDuration, formatMinuteRange, formatShortTime } from '../calendar-time'
import type { GridDrag, useGridDrag } from '../use-grid-drag'
import { AllDayChip, EventBlock } from './event-block'

const pct = (minutes: number) => `${(minutes / DAY_MINUTES) * 100}%`
const HOURS = Array.from({ length: 24 }, (_, h) => h)
const hourLabel = (h: number) => (h === 0 ? '' : h === 12 ? 'Noon' : h < 12 ? `${h} AM` : `${h - 12} PM`)
/** All-day chips shown per day before the lane folds the rest behind "+N". */
const ALL_DAY_FOLD = 2

type Open = (item: CalendarItem, e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void

type Props = {
  days: Date[]
  itemsByDay: Map<string, CalendarItem[]>
  todayIso: string
  nowMinutes: number
  hourPx: number
  activeKey: string | null
  query: string
  scrollRef: RefObject<HTMLDivElement | null>
  grid: ReturnType<typeof useGridDrag>
  /** The composer's pending block, kept on the grid while the composer is open. */
  pendingDraft: GridDrag | null
  /** False while a popover or the composer is open: no hover hint. */
  interactive: boolean
  showDayLoad: boolean
  onOpen: Open
  onToggleDone: (item: CalendarItem) => void
  onPickDay: (iso: string) => void
  onCreateAllDay: (iso: string) => void
}

/**
 * The Day / Work week / Week time grid. One scroll container holds a sticky head
 * (day headers + all-day lane) and the 24-hour body, so the columns can never
 * drift out of line with their headers whatever the scrollbar does.
 */
export function TimeGrid({
  days,
  itemsByDay,
  todayIso,
  nowMinutes,
  hourPx,
  activeKey,
  query,
  scrollRef,
  grid,
  pendingDraft,
  showDayLoad,
  onOpen,
  onToggleDone,
  onPickDay,
  onCreateAllDay,
}: Props) {
  const [allDayOpen, setAllDayOpen] = useState(false)
  const isos = useMemo(() => days.map(toISODate), [days])
  const todayInView = isos.includes(todayIso)
  const { drag, registerColumn, columnPointerDown, columnPointerMove, clearHover, itemPointerDown, consumeClick } = grid

  const allDay = isos.map((iso) => (itemsByDay.get(iso) ?? []).filter((item) => !isTimed(item)))
  const maxAllDay = Math.max(0, ...allDay.map((list) => list.length))
  const foldable = maxAllDay > ALL_DAY_FOLD + 1
  const draggingId = drag && drag.kind !== 'create' ? drag.item.id : undefined
  // Shortest drawn height, in minutes: two tiny blocks must not overprint.
  const minVisual = Math.ceil((20 / hourPx) * 60)

  return (
    <div
      className="cv-grid route-scroll"
      ref={scrollRef}
      style={{ '--cv-hour': `${hourPx}px`, '--cv-cols': days.length } as CSSProperties}
    >
      <div className="cv-grid-head">
        <div className="cv-row cv-dayheads">
          <div className="cv-gutter-cell cv-tz" title="India Standard Time (GMT+5:30)">
            IST
          </div>
          {days.map((d, i) => {
            const iso = isos[i]
            const load = dayLoad(itemsByDay.get(iso) ?? [])
            const isToday = iso === todayIso
            const loadText = load.count
              ? `${load.count} ${load.count === 1 ? 'block' : 'blocks'}${load.minutes ? ` · ${formatDuration(load.minutes)}` : ''}`
              : 'Free'
            return (
              <button
                key={iso}
                type="button"
                className={cn('cv-dayhead', isToday && 'is-today', iso < todayIso && 'is-past', isWeekend(d) && 'is-weekend')}
                onClick={() => onPickDay(iso)}
                title={`${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · ${loadText}`}
              >
                <span className="cv-dayhead-wd">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className="cv-dayhead-num">{d.getDate()}</span>
                {showDayLoad ? (
                  <span className="cv-dayhead-load">{loadText}</span>
                ) : (
                  <span className={cn('cv-dayhead-booked', !load.minutes && 'is-free')} aria-hidden="true">
                    {load.minutes ? formatDuration(load.minutes) : load.count ? `${load.count} all-day` : 'free'}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {maxAllDay > 0 && (
          <div className="cv-row cv-allday">
            <div className="cv-gutter-cell cv-allday-label">
              <span>All day</span>
              {foldable && (
                <button
                  type="button"
                  className={cn('cv-allday-toggle', allDayOpen && 'is-open')}
                  onClick={() => setAllDayOpen((o) => !o)}
                  aria-label={allDayOpen ? 'Fold all-day items' : 'Show every all-day item'}
                >
                  <ChevronDown size={12} strokeWidth={2.4} />
                </button>
              )}
            </div>
            {allDay.map((list, i) => {
              const iso = isos[i]
              const visible = foldable && !allDayOpen ? list.slice(0, ALL_DAY_FOLD) : list
              const hidden = list.length - visible.length
              return (
                <div
                  key={iso}
                  className="cv-allday-cell"
                  onDoubleClick={(e) => {
                    if (e.target === e.currentTarget) onCreateAllDay(iso)
                  }}
                >
                  {visible.map((item) => (
                    <AllDayChip
                      key={itemKey(item)}
                      item={item}
                      active={activeKey === itemKey(item)}
                      dimmed={!matchesQuery(item, query)}
                      status={itemStatus(item, todayIso, nowMinutes)}
                      onOpen={(e) => onOpen(item, e)}
                      onToggleDone={() => onToggleDone(item)}
                    />
                  ))}
                  {hidden > 0 && (
                    <button type="button" className="cv-allday-more" onClick={() => setAllDayOpen(true)}>
                      +{hidden} more
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="cv-grid-body">
        <div className="cv-hours" aria-hidden="true">
          {HOURS.map((h) => (
            <span key={h} className="cv-hour-label" style={{ top: pct(h * 60) }}>
              {hourLabel(h)}
            </span>
          ))}
          {todayInView && (
            <span className="cv-now-pill" style={{ top: pct(nowMinutes) }}>
              {formatShortTime(nowMinutes).replace(/ (AM|PM)$/, '')}
            </span>
          )}
        </div>

        <div className="cv-cols" onPointerLeave={clearHover}>
          <div className="cv-night is-early" aria-hidden="true" />
          <div className="cv-night is-late" aria-hidden="true" />
          {days.map((d, i) => {
            const iso = isos[i]
            const isToday = iso === todayIso
            const placed = layoutDay(itemsByDay.get(iso) ?? [], minVisual)
            const ghost = drag?.kind === 'create' && drag.date === iso ? drag : pendingDraft?.date === iso ? pendingDraft : null
            const moveGhost = drag && drag.kind !== 'create' && drag.date === iso ? drag : null
            return (
              <div
                key={iso}
                ref={registerColumn(iso)}
                className={cn('cv-col', isToday && 'is-today', isWeekend(d) && 'is-weekend')}
                onPointerDown={(e) => columnPointerDown(e, iso)}
                onPointerMove={(e) => columnPointerMove(e, iso)}
              >
                {placed.map((p) => {
                  const key = itemKey(p.item)
                  const canDrag = Boolean(p.item.id) && !isRecurring(p.item)
                  return (
                    <EventBlock
                      key={key}
                      {...p}
                      hourPx={hourPx}
                      status={itemStatus(p.item, todayIso, nowMinutes)}
                      active={activeKey === key}
                      dimmed={!matchesQuery(p.item, query)}
                      dragSource={Boolean(draggingId) && p.item.id === draggingId}
                      canDrag={canDrag}
                      onPointerDown={canDrag ? (e) => itemPointerDown(e, p.item, iso, 'move') : (e) => e.stopPropagation()}
                      onResizePointerDown={(e) => itemPointerDown(e, p.item, iso, 'resize')}
                      onOpen={(e) => {
                        e.stopPropagation()
                        if (consumeClick()) return
                        onOpen(p.item, e)
                      }}
                      onToggleDone={() => onToggleDone(p.item)}
                    />
                  )
                })}

                {moveGhost && (
                  <div
                    className="cv-ghost is-move"
                    style={{ '--ev': eventHue(moveGhost.item), top: pct(moveGhost.start), height: pct(moveGhost.end - moveGhost.start) } as CSSProperties}
                    aria-hidden="true"
                  >
                    <strong>{moveGhost.item.title}</strong>
                    <span>{formatMinuteRange(moveGhost.start, moveGhost.end)}</span>
                  </div>
                )}

                {ghost && (
                  <div className="cv-ghost is-create" style={{ top: pct(ghost.start), height: pct(ghost.end - ghost.start) }} aria-hidden="true">
                    <strong>New block</strong>
                    <span>
                      {formatMinuteRange(ghost.start, ghost.end)} · {formatDuration(ghost.end - ghost.start)}
                    </span>
                  </div>
                )}

                {todayInView && (
                  <div className={cn('cv-now', !isToday && 'is-faint')} style={{ top: pct(nowMinutes) }} aria-hidden="true">
                    {isToday && <span className="cv-now-dot" />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
