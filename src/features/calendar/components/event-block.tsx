import { createElement, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { Check, Repeat } from 'lucide-react'

import type { CalendarItem } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { eventHue } from '../calendar-colors'
import { iconForItem } from '../calendar-icons'
import { isMoment, isRecurring, type ItemStatus } from '../calendar-layout'
import { DAY_MINUTES, formatMinuteRange, formatShortTime } from '../calendar-time'

const pct = (minutes: number) => `${(minutes / DAY_MINUTES) * 100}%`

type BlockProps = {
  item: CalendarItem
  start: number
  end: number
  col: number
  span: number
  cols: number
  /** Pixels per hour on this grid — picks how much of the block's text fits. */
  hourPx: number
  status: ItemStatus
  active: boolean
  dimmed: boolean
  dragSource: boolean
  canDrag: boolean
  onPointerDown: (e: PointerEvent<HTMLElement>) => void
  onResizePointerDown: (e: PointerEvent<HTMLElement>) => void
  onOpen: (e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void
  onToggleDone: () => void
}

/**
 * One block on the time grid. The block's hue arrives as `--ev` and the
 * stylesheet derives a tinted fill and a same-hue ink from it per theme, so no
 * colour is decided here. Tasks carry a round check you can tick in place.
 */
export function EventBlock({
  item,
  start,
  end,
  col,
  span,
  cols,
  hourPx,
  status,
  active,
  dimmed,
  dragSource,
  canDrag,
  onPointerDown,
  onResizePointerDown,
  onOpen,
  onToggleDone,
}: BlockProps) {
  const moment = isMoment(item)
  const px = moment ? 22 : ((end - start) / 60) * hourPx
  const size = moment ? 'is-moment' : px < 27 ? 'is-xs' : px < 46 ? 'is-sm' : px < 80 ? 'is-md' : 'is-lg'
  const isTask = item.itemType === 'TASK'
  const time = moment ? formatShortTime(start) : formatMinuteRange(start, end)

  const style = {
    '--ev': eventHue(item),
    top: pct(start),
    height: moment ? undefined : `max(${pct(end - start)}, var(--cv-ev-min))`,
    left: `calc(${(col / cols) * 100}% + 2px)`,
    width: `calc(${(span / cols) * 100}% - ${cols > 1 && col + span < cols ? 4 : 6}px)`,
    zIndex: active ? 12 : 2 + col,
  } as CSSProperties

  return (
    <div
      role="button"
      tabIndex={0}
      data-ev-key={item.occurrenceId ?? item.id}
      aria-label={`${item.title}, ${time}${item.completed ? ', done' : ''}`}
      className={cn(
        'cv-ev',
        size,
        `is-${status}`,
        isTask && 'is-task',
        active && 'is-active',
        dimmed && 'is-dimmed',
        canDrag && 'is-draggable',
        dragSource && 'is-drag-source',
      )}
      style={style}
      onPointerDown={onPointerDown}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(e)
        }
      }}
    >
      <span className="cv-ev-line">
        {isTask ? (
          <button
            type="button"
            className="cv-check"
            aria-label={item.completed ? 'Mark not done' : 'Mark done'}
            aria-pressed={Boolean(item.completed)}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onToggleDone()
            }}
          >
            <Check size={9} strokeWidth={3.4} />
          </button>
        ) : (
          createElement(iconForItem(item), { size: 11, strokeWidth: 2.4, className: 'cv-ev-ic', 'aria-hidden': true })
        )}
        <span className="cv-ev-title">{item.title}</span>
        {isRecurring(item) && <Repeat size={10} strokeWidth={2.6} className="cv-ev-repeat" aria-label="Repeats" />}
        {(size === 'is-xs' || size === 'is-sm' || size === 'is-moment') && <span className="cv-ev-time is-inline">{time}</span>}
      </span>
      {(size === 'is-md' || size === 'is-lg') && <span className="cv-ev-time">{time}</span>}
      {size === 'is-lg' && item.notes && <span className="cv-ev-notes">{item.notes.replace(/^\s*[-*]\s+\[[ xX]\]\s+/gm, '').split('\n')[0]}</span>}
      {canDrag && !moment && <span className="cv-ev-resize" aria-hidden="true" onPointerDown={onResizePointerDown} />}
    </div>
  )
}

type ChipProps = {
  item: CalendarItem
  active: boolean
  dimmed: boolean
  status: ItemStatus
  onOpen: (e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void
  onToggleDone: () => void
  className?: string
}

/** An all-day item: a filled bar in the all-day lane, the month grid and the agenda. */
export function AllDayChip({ item, active, dimmed, status, onOpen, onToggleDone, className }: ChipProps) {
  const isTask = item.itemType === 'TASK'
  return (
    <div
      role="button"
      tabIndex={0}
      data-ev-key={item.occurrenceId ?? item.id}
      className={cn('cv-chip', `is-${status}`, isTask && 'is-task', active && 'is-active', dimmed && 'is-dimmed', className)}
      style={{ '--ev': eventHue(item) } as CSSProperties}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(e)
        }
      }}
      title={item.title}
    >
      {isTask ? (
        <button
          type="button"
          className="cv-check"
          aria-label={item.completed ? 'Mark not done' : 'Mark done'}
          aria-pressed={Boolean(item.completed)}
          onClick={(e) => {
            e.stopPropagation()
            onToggleDone()
          }}
        >
          <Check size={9} strokeWidth={3.4} />
        </button>
      ) : (
        createElement(iconForItem(item), { size: 11, strokeWidth: 2.4, className: 'cv-ev-ic', 'aria-hidden': true })
      )}
      <span className="cv-chip-title">{item.title}</span>
    </div>
  )
}
