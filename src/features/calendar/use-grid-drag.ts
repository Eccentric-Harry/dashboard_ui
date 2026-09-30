import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'

import type { CalendarItem } from '@/types/calendar'
import {
  DAY_MINUTES,
  DEFAULT_BLOCK_MINUTES,
  SNAP_MINUTES,
  floorMinutes,
  snapMinutes,
  timeToMinutes,
} from './calendar-time'

/**
 * Google Calendar-style direct manipulation on the Daily / 2-Day time grid:
 *
 *   - drag on empty space   → sweep out a new block (15-min snap), release opens the modal
 *   - click on empty space  → a 1-hour block at the clicked half hour
 *   - drag a block          → move it, across days in 2-Day
 *   - drag a block's bottom → resize it
 *
 * Touch needs a long-press (~400ms, still finger) before any of this starts, so
 * a normal swipe still scrolls the timeline. Escape cancels a drag in flight.
 * Minutes are measured against each day column's rendered height, so the maths
 * holds whatever the hour-row height is.
 */

export type GridDrag =
  | { kind: 'create'; date: string; start: number; end: number }
  | { kind: 'move' | 'resize'; item: CalendarItem; date: string; start: number; end: number }

export type HoverSlot = { date: string; minute: number }

type Pending = {
  kind: GridDrag['kind']
  pointerId: number
  isTouch: boolean
  startX: number
  startY: number
  date: string
  /** Minute under the pointer at pointer-down. */
  anchor: number
  item?: CalendarItem
  origStart: number
  origEnd: number
  active: boolean
  movedSinceActive: boolean
  timer?: number
}

type Options = {
  scrollRef: RefObject<HTMLElement | null>
  /** False while a popover is open: the click that closes it must not also create a block. */
  canCreate: () => boolean
  onCreate: (date: string, start: number, end: number) => void
  onCommit: (item: CalendarItem, date: string, start: number, end: number) => void
}

const MOUSE_THRESHOLD = 4
const TOUCH_SLOP = 8
const LONG_PRESS_MS = 400
const EDGE = 48

function itemRange(item: CalendarItem) {
  const start = timeToMinutes(item.startTime ?? '00:00')
  const end = item.endTime ? timeToMinutes(item.endTime) : start + DEFAULT_BLOCK_MINUTES
  // A block that ends at 23:59 is treated as running to midnight so it can be
  // dragged back without losing its last minute.
  return { start, end: end >= DAY_MINUTES - 1 ? DAY_MINUTES : Math.max(end, start + SNAP_MINUTES) }
}

export function useGridDrag({ scrollRef, canCreate, onCreate, onCommit }: Options) {
  const [drag, setDrag] = useState<GridDrag | null>(null)
  const [hover, setHover] = useState<HoverSlot | null>(null)
  const columns = useRef(new Map<string, HTMLElement>())
  const pending = useRef<Pending | null>(null)
  const dragRef = useRef<GridDrag | null>(null)
  const lastPointer = useRef({ x: 0, y: 0 })
  const suppressClick = useRef(false)
  const raf = useRef<number | null>(null)
  const detach = useRef<(() => void) | null>(null)

  // Latest callbacks without re-binding window listeners mid-drag.
  const handlers = useRef({ canCreate, onCreate, onCommit })
  useEffect(() => {
    handlers.current = { canCreate, onCreate, onCommit }
  })

  const registerColumn = useCallback(
    (date: string) => (el: HTMLElement | null) => {
      if (el) columns.current.set(date, el)
      else columns.current.delete(date)
    },
    [],
  )

  const publish = useCallback((next: GridDrag | null) => {
    const prev = dragRef.current
    if (
      prev && next && prev.kind === next.kind && prev.date === next.date &&
      prev.start === next.start && prev.end === next.end
    ) return
    dragRef.current = next
    setDrag(next)
  }, [])

  /** Day column + minute under a viewport point; x outside every column picks the nearest one. */
  const locate = useCallback((x: number, y: number, lockDate?: string) => {
    let best: { date: string; rect: DOMRect; dist: number } | null = null
    for (const [date, el] of columns.current) {
      if (lockDate && date !== lockDate) continue
      const rect = el.getBoundingClientRect()
      const dist = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0
      if (!best || dist < best.dist) best = { date, rect, dist }
    }
    if (!best) return null
    const minute = ((y - best.rect.top) / best.rect.height) * DAY_MINUTES
    return { date: best.date, minute: Math.max(0, Math.min(DAY_MINUTES, minute)) }
  }, [])

  const compute = useCallback((p: Pending, x: number, y: number): GridDrag | null => {
    if (p.kind === 'create') {
      const at = locate(x, y, p.date)
      if (!at) return null
      const anchor = floorMinutes(p.anchor)
      const cur = snapMinutes(at.minute)
      const start = Math.min(anchor, cur)
      const end = Math.min(DAY_MINUTES, Math.max(cur, anchor + SNAP_MINUTES))
      return { kind: 'create', date: p.date, start, end: Math.max(end, start + SNAP_MINUTES) }
    }
    const at = locate(x, y, p.kind === 'resize' ? p.date : undefined)
    if (!at || !p.item) return null
    if (p.kind === 'resize') {
      const end = Math.min(DAY_MINUTES, Math.max(p.origStart + SNAP_MINUTES, snapMinutes(at.minute)))
      return { kind: 'resize', item: p.item, date: p.date, start: p.origStart, end }
    }
    const duration = p.origEnd - p.origStart
    const grab = p.anchor - p.origStart
    const start = Math.max(0, Math.min(DAY_MINUTES - duration, snapMinutes(at.minute - grab)))
    return { kind: 'move', item: p.item, date: at.date, start, end: start + duration }
  }, [locate])

  const stopAutoScroll = () => {
    if (raf.current != null) cancelAnimationFrame(raf.current)
    raf.current = null
  }

  // Edge auto-scroll, one step per frame while a drag is live. Held in a ref
  // so the frame loop always runs the latest closure.
  const autoScroll = useRef<() => void>(() => {})
  useEffect(() => {
    autoScroll.current = () => {
      const p = pending.current
      if (!p?.active) return
      const { x, y } = lastPointer.current
      const container = scrollRef.current
      let delta = 0
      if (container && container.scrollHeight > container.clientHeight + 8) {
        const rect = container.getBoundingClientRect()
        if (y < rect.top + EDGE) delta = -Math.ceil((rect.top + EDGE - y) / 4)
        else if (y > rect.bottom - EDGE) delta = Math.ceil((y - (rect.bottom - EDGE)) / 4)
        if (delta) container.scrollTop += delta
      } else {
        // Phones: the page scrolls, not the grid.
        if (y < EDGE + 60) delta = -Math.ceil((EDGE + 60 - y) / 4)
        else if (y > window.innerHeight - EDGE) delta = Math.ceil((y - (window.innerHeight - EDGE)) / 4)
        if (delta) window.scrollBy(0, delta)
    }
    if (delta) publish(compute(p, x, y))
    raf.current = requestAnimationFrame(() => autoScroll.current())
    }
  })

  const finish = useCallback(() => {
    const p = pending.current
    if (p?.timer) window.clearTimeout(p.timer)
    pending.current = null
    stopAutoScroll()
    detach.current?.()
    detach.current = null
    document.body.classList.remove('calendar-grid-dragging')
    publish(null)
  }, [publish])

  const activate = useCallback((p: Pending) => {
    p.active = true
    document.body.classList.add('calendar-grid-dragging')
    setHover(null)
    if (p.isTouch) navigator.vibrate?.(8)
    const initial: GridDrag | null =
      p.kind === 'create'
        ? { kind: 'create', date: p.date, start: floorMinutes(p.anchor), end: floorMinutes(p.anchor) + SNAP_MINUTES }
        : { kind: p.kind, item: p.item!, date: p.date, start: p.origStart, end: p.origEnd }
    publish(p.isTouch || p.kind !== 'create' ? initial : compute(p, lastPointer.current.x, lastPointer.current.y) ?? initial)
    raf.current = requestAnimationFrame(() => autoScroll.current())
  }, [compute, publish])

  const begin = useCallback((p: Pending) => {
    finish()
    pending.current = p
    lastPointer.current = { x: p.startX, y: p.startY }

    const onMove = (e: PointerEvent) => {
      const cur = pending.current
      if (!cur || e.pointerId !== cur.pointerId) return
      lastPointer.current = { x: e.clientX, y: e.clientY }
      const dist = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY)
      if (!cur.active) {
        if (cur.isTouch) {
          // Finger moved before the long-press landed: this is a scroll.
          if (dist > TOUCH_SLOP) finish()
          return
        }
        if (dist < MOUSE_THRESHOLD) return
        activate(cur)
      }
      if (dist > MOUSE_THRESHOLD) cur.movedSinceActive = true
      const next = compute(cur, e.clientX, e.clientY)
      if (next) publish(next)
    }

    const onUp = (e: PointerEvent) => {
      const cur = pending.current
      if (!cur || e.pointerId !== cur.pointerId) return
      const result = dragRef.current
      const wasActive = cur.active
      const moved = cur.movedSinceActive
      finish()
      if (wasActive) {
        suppressClick.current = true
        window.setTimeout(() => { suppressClick.current = false }, 0)
      }
      if (cur.kind === 'create') {
        if (wasActive && result && moved) {
          handlers.current.onCreate(result.date, result.start, result.end)
        } else if ((wasActive || !cur.isTouch) && handlers.current.canCreate()) {
          // A click (mouse) or a long-press released in place (touch).
          const start = Math.min(DAY_MINUTES - DEFAULT_BLOCK_MINUTES, floorMinutes(cur.anchor, 30))
          handlers.current.onCreate(cur.date, start, start + DEFAULT_BLOCK_MINUTES)
        }
        return
      }
      if (wasActive && result && result.kind !== 'create' && cur.item) {
        const changed = result.date !== cur.date || result.start !== cur.origStart || result.end !== cur.origEnd
        if (changed) handlers.current.onCommit(cur.item, result.date, result.start, result.end)
      }
    }

    const onCancel = (e: PointerEvent) => {
      if (pending.current && e.pointerId === pending.current.pointerId) finish()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pending.current) {
        e.stopPropagation()
        const wasActive = pending.current.active
        finish()
        if (wasActive) {
          suppressClick.current = true
          window.setTimeout(() => { suppressClick.current = false }, 0)
        }
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('keydown', onKey, true)
    detach.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKey, true)
    }

    if (p.isTouch) {
      p.timer = window.setTimeout(() => {
        if (pending.current === p) activate(p)
      }, LONG_PRESS_MS)
    }
  }, [activate, compute, finish, publish])

  // Once a touch drag is live the page must not scroll under the finger. Only
  // a non-passive touchmove listener can stop that on iOS Safari.
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if (pending.current?.active) e.preventDefault()
    }
    document.addEventListener('touchmove', block, { passive: false })
    return () => {
      document.removeEventListener('touchmove', block)
      finish()
    }
  }, [finish])

  const columnPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>, date: string) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return
    const at = locate(e.clientX, e.clientY, date)
    if (!at) return
    begin({
      kind: 'create',
      pointerId: e.pointerId,
      isTouch: e.pointerType === 'touch',
      startX: e.clientX,
      startY: e.clientY,
      date,
      anchor: at.minute,
      origStart: 0,
      origEnd: 0,
      active: false,
      movedSinceActive: false,
    })
  }, [begin, locate])

  const itemPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>, item: CalendarItem, date: string, mode: 'move' | 'resize') => {
      if (e.button !== 0) return
      e.stopPropagation()
      const at = locate(e.clientX, e.clientY, date)
      if (!at) return
      const { start, end } = itemRange(item)
      begin({
        kind: mode,
        pointerId: e.pointerId,
        isTouch: e.pointerType === 'touch',
        startX: e.clientX,
        startY: e.clientY,
        date,
        anchor: at.minute,
        item,
        origStart: start,
        origEnd: end,
        active: false,
        movedSinceActive: false,
      })
    },
    [begin, locate],
  )

  const columnPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>, date: string) => {
    if (e.pointerType !== 'mouse' || pending.current) return
    if (e.target !== e.currentTarget) {
      setHover(null)
      return
    }
    const at = locate(e.clientX, e.clientY, date)
    if (!at) return
    const minute = Math.min(DAY_MINUTES - DEFAULT_BLOCK_MINUTES, floorMinutes(at.minute, 30))
    setHover((prev) => (prev && prev.date === date && prev.minute === minute ? prev : { date, minute }))
  }, [locate])

  const clearHover = useCallback(() => setHover(null), [])

  /** True for the click that trails a finished drag — the block's popover must not open. */
  const consumeClick = useCallback(() => suppressClick.current, [])

  return { drag, hover, registerColumn, columnPointerDown, columnPointerMove, clearHover, itemPointerDown, consumeClick }
}
