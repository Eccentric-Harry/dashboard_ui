import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

/** How long a check goal must be held. Long enough to be deliberate, short enough to enjoy. */
export const HOLD_MS = 640

/**
 * Hold-to-complete, the (Not Boring) Habits way: a wind-up while you hold (anticipation),
 * a release when it's full. Letting go early drains it; a quick tap earns a wiggle and a
 * hint instead of silence. Enter / Space complete straight away, so the action never
 * depends on being able to hold a pointer.
 */
export function useHold({
  enabled,
  onComplete,
  onTap,
}: {
  enabled: boolean
  onComplete: () => void
  /** A press that isn't a hold — e.g. open the log. */
  onTap: () => void
}) {
  const timer = useRef<number | null>(null)
  const startedAt = useRef(0)
  // The click that follows a completed hold must not also count as a tap.
  const swallowClick = useRef(false)
  const [charging, setCharging] = useState(false)
  const [nudged, setNudged] = useState(false)

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current)
    },
    [],
  )

  const cancel = () => {
    const wasCharging = timer.current != null
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = null
    setCharging(false)
    if (wasCharging && performance.now() - startedAt.current < 260) {
      setNudged(true)
      window.setTimeout(() => setNudged(false), 520)
    }
  }

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (!enabled || e.button !== 0) return
      try {
        // Keeps the hold alive if the finger drifts a little.
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // Not every pointer can be captured; the hold still works without it.
      }
      startedAt.current = performance.now()
      setCharging(true)
      timer.current = window.setTimeout(() => {
        timer.current = null
        swallowClick.current = true
        setCharging(false)
        if (navigator.vibrate) navigator.vibrate([12, 40, 24])
        onComplete()
      }, HOLD_MS)
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: () => {
      if (timer.current != null) cancel()
    },
    onClick: () => {
      if (swallowClick.current) {
        swallowClick.current = false
        return
      }
      if (!enabled) onTap()
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      if (enabled) onComplete()
      else onTap()
    },
    onContextMenu: (e: { preventDefault: () => void }) => {
      if (enabled) e.preventDefault()
    },
  }

  return { charging, nudged, handlers }
}
