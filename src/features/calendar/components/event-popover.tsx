import { createElement, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AlignLeft, Ban, Check, Clock, Copy, Pencil, Repeat, RotateCcw, Tag, Trash2, X } from 'lucide-react'

import type { CalendarItem } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { eventHue } from '../calendar-colors'
import { longDate, parseISODate } from '../calendar-dates'
import { TYPE_ICONS } from '../calendar-icons'
import { isMoment, isRecurring, isTimed, itemSpan, splitNotes } from '../calendar-layout'
import { formatDuration, formatMinuteRange, formatShortTime } from '../calendar-time'

/** A viewport rect in *zoomed* pixels, straight from getBoundingClientRect. */
export type AnchorRect = { top: number; left: number; width: number; height: number }

const TYPE_LABEL = { TASK: 'Task', EVENT: 'Event', REMINDER: 'Reminder', MILESTONE: 'Milestone' } as const

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function repeatText(item: CalendarItem) {
  const d = parseISODate(item.originalDate ?? item.date)
  const base =
    item.recurrenceFrequency === 'DAILY'
      ? 'Every day'
      : item.recurrenceFrequency === 'WEEKLY'
        ? `Every ${d.toLocaleDateString('en-US', { weekday: 'long' })}`
        : `Monthly on the ${ordinal(d.getDate())}`
  return item.recurrenceUntil
    ? `${base}, until ${parseISODate(item.recurrenceUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : base
}

/**
 * Place a floating card beside an anchor: right of it, else left, else over
 * it; vertically aligned to the anchor's top and kept inside the window. The
 * app scales <html> with CSS zoom, so rects arrive zoomed and are converted.
 */
function useAnchoredPosition(anchor: AnchorRect | null, width: number, mode: 'beside' | 'over' = 'beside') {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  useLayoutEffect(() => {
    if (!anchor) return
    const place = () => {
      const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1
      const a = { top: anchor.top / z, left: anchor.left / z, right: (anchor.left + anchor.width) / z }
      const vw = window.innerWidth / z
      const vh = window.innerHeight / z
      const h = ref.current?.offsetHeight ?? 320
      const pad = 12
      const gap = 10
      let left = mode === 'over' ? a.left - 8 : a.right + gap
      if (mode === 'beside' && left + width + pad > vw) {
        left = a.left - width - gap
        if (left < pad) left = a.right - width
      }
      left = Math.max(pad, Math.min(vw - width - pad, left))
      const top = Math.max(pad, Math.min(vh - h - pad, a.top - 8))
      setPos({ top, left })
    }
    place()
    const raf = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', place)
    }
  }, [anchor, width, mode])
  return { ref, pos }
}

/** Escape and outside pointer-downs close a floating card. */
function useDismiss(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (!t || ref.current?.contains(t)) return
      // Another block was pressed: let its click swap the card instead of closing first.
      if (t.closest('[data-ev-key]')) return
      if (t.closest('.cal-menu, .cv-dialog, .cal-modal-backdrop')) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [ref, onClose])
}

type PopoverProps = {
  item: CalendarItem
  anchor: AnchorRect | null
  onClose: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onToggleDone: () => void
  onToggleCancel: () => void
}

/**
 * Event detail card (Google's peek): what, when, how often, where it files,
 * the notes — and the two things you actually do from here, mark it done or
 * skip it. Edit / duplicate / delete sit as icons in the corner.
 */
export function EventPopover({ item, anchor, onClose, onEdit, onDuplicate, onDelete, onToggleDone, onToggleCancel }: PopoverProps) {
  const width = 344
  const { ref, pos } = useAnchoredPosition(anchor, width)
  useDismiss(ref, onClose)

  const timed = isTimed(item)
  const span = timed ? itemSpan(item) : null
  const recurring = isRecurring(item)
  const { prose, checklist } = splitNotes(item.notes)
  const type = item.itemType ?? 'TASK'

  return createPortal(
    <>
      <div className="cv-portal cv-pop-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className={cn('cv-portal cv-pop', item.completed && 'is-done', item.cancelled && 'is-cancelled')}
        role="dialog"
        aria-label={item.title}
        style={{ '--ev': eventHue(item), width, top: pos?.top ?? -9999, left: pos?.left ?? -9999 } as CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cv-pop-bar">
          <span className="cv-pop-type">
            {createElement(TYPE_ICONS[type], { size: 12, strokeWidth: 2.4 })}
            {TYPE_LABEL[type]}
            {item.completed && <em>· done</em>}
            {item.cancelled && <em>· {recurring ? 'skipped' : 'cancelled'}</em>}
          </span>
          <span className="cv-pop-tools">
            <IconBtn label="Edit (E)" onClick={onEdit}>
              <Pencil size={14} />
            </IconBtn>
            <IconBtn label="Duplicate" onClick={onDuplicate}>
              <Copy size={14} />
            </IconBtn>
            <IconBtn label="Delete" onClick={onDelete} danger>
              <Trash2 size={14} />
            </IconBtn>
            <IconBtn label="Close" onClick={onClose}>
              <X size={15} />
            </IconBtn>
          </span>
        </div>

        <h3 className="cv-pop-title">
          <span className="cv-pop-swatch" aria-hidden="true" />
          {item.title}
        </h3>

        <dl className="cv-pop-facts">
          <Fact icon={<Clock size={14} />}>
            <span>{longDate(item.date)}</span>
            <small>
              {!span ? 'All day' : isMoment(item) ? formatShortTime(span.start) : `${formatMinuteRange(span.start, span.end)} · ${formatDuration(span.end - span.start)}`}
            </small>
          </Fact>
          {recurring && (
            <Fact icon={<Repeat size={14} />}>
              <span>{repeatText(item)}</span>
            </Fact>
          )}
          <Fact icon={<Tag size={14} />}>
            <span className="cv-pop-cat">
              <i aria-hidden="true" />
              {item.category || 'Personal'}
            </span>
          </Fact>
          {(prose || checklist.length > 0) && (
            <Fact icon={<AlignLeft size={14} />}>
              {prose && <p className="cv-pop-notes">{prose}</p>}
              {checklist.length > 0 && (
                <ul className="cv-pop-checklist">
                  {checklist.map((c, i) => (
                    <li key={i} className={cn(c.done && 'is-done')}>
                      <span aria-hidden="true">{c.done && <Check size={9} strokeWidth={3.4} />}</span>
                      {c.text}
                    </li>
                  ))}
                </ul>
              )}
            </Fact>
          )}
        </dl>

        <div className="cv-pop-foot">
          <button type="button" className={cn('cv-btn', item.completed ? 'is-ghost' : 'is-primary')} onClick={onToggleDone}>
            {item.completed ? <RotateCcw size={13} strokeWidth={2.4} /> : <Check size={14} strokeWidth={2.8} />}
            {item.completed ? 'Not done' : 'Mark done'}
          </button>
          <button type="button" className="cv-btn is-ghost" onClick={onToggleCancel}>
            {item.cancelled ? <RotateCcw size={13} strokeWidth={2.4} /> : <Ban size={13} strokeWidth={2.4} />}
            {item.cancelled ? 'Restore' : recurring ? 'Skip this one' : 'Cancel'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={cn('cv-icon-btn is-sm', danger && 'is-danger')} onClick={onClick} title={label} aria-label={label.replace(/ \(.\)$/, '')}>
      {children}
    </button>
  )
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="cv-pop-fact">
      <dt aria-hidden="true">{icon}</dt>
      <dd>{children}</dd>
    </div>
  )
}

type OverflowProps = {
  iso: string
  items: CalendarItem[]
  anchor: AnchorRect
  onOpen: (item: CalendarItem, rect: AnchorRect) => void
  onClose: () => void
}

/** Every item on one month day — what "+N more" opens. */
export function DayOverflow({ iso, items, anchor, onOpen, onClose }: OverflowProps) {
  const width = 280
  const { ref, pos } = useAnchoredPosition(anchor, width, 'over')
  useDismiss(ref, onClose)
  const d = parseISODate(iso)
  return createPortal(
    <>
      <div className="cv-portal cv-pop-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className="cv-portal cv-pop cv-overflow"
        role="dialog"
        aria-label={longDate(iso)}
        style={{ width, top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cv-overflow-head">
          <span>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
          <strong>{d.getDate()}</strong>
          <button type="button" className="cv-icon-btn is-sm" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <ul className="cv-overflow-list">
          {items.map((item) => (
            <li key={item.occurrenceId ?? `${item.id}-${item.title}`}>
              <button
                type="button"
                data-ev-key={item.occurrenceId ?? item.id}
                className={cn('cv-overflow-row', item.completed && 'is-done', item.cancelled && 'is-cancelled')}
                style={{ '--ev': eventHue(item) } as CSSProperties}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  onOpen(item, { top: r.top, left: r.left, width: r.width, height: r.height })
                }}
              >
                <i aria-hidden="true" />
                <span>{item.title}</span>
                <small>{isTimed(item) ? formatShortTime(itemSpan(item).start) : 'All day'}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>,
    document.body,
  )
}
