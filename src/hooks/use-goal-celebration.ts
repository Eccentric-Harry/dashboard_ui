import { useEffect, useRef, useState, type RefObject } from 'react'

import { celebrationActions, type CelebrateOptions, type CelebrationRepeat } from '@/store/celebration-store'

export interface GoalCelebrationOptions
  extends Pick<CelebrateOptions, 'palette' | 'label' | 'detail'> {
  /** Stable name for the goal, shared by every surface that celebrates it ('hydration'
   *  on Home and on Nutrition), so a goal celebrated on one route is only echoed on the next. */
  goal: string
  /** The period the goal belongs to — normally the ISO day. A new scope starts fresh. */
  scope: string
  met: boolean
  /** False while the numbers are loading or stale: a skeleton's zero must never read as
   *  "not met", or the real value arriving would look like the goal being crossed. */
  ready: boolean
  /** Master switch — e.g. false while browsing a past day. Celebrations are for now. */
  enabled?: boolean
  /** The achievement's element: the opening burst launches from it. */
  anchorRef: RefObject<HTMLElement | null>
  /** What later visits get once this goal has had its full moment in this scope. */
  repeat?: CelebrationRepeat
  /** Settle time before the moment, so it lands after the route's entrance motion. */
  delayMs?: number
}

/** How long the host's own flourish (the returned flag) stays on. */
const FLOURISH_MS = 1400
/** While the anchor is hidden, re-check this often. */
const VISIBILITY_POLL_MS = 300
const DEFAULT_DELAY_MS = 450

/**
 * The page is in front and nothing hides the anchor (an overlay's `visibility: hidden`,
 * a fading ancestor). Scrolled out of view is fine — the moment is full-screen, and the
 * store drops the anchored burst and moves the caption to the top.
 */
function isShowable(el: HTMLElement | null): boolean {
  if (!el || document.visibilityState !== 'visible') return false
  if (typeof el.checkVisibility === 'function') {
    return el.checkVisibility({ visibilityProperty: true, opacityProperty: true })
  }
  return el.getClientRects().length > 0
}

/**
 * Celebrates a goal when it is met — on arrival (the route opens with the goal already
 * met) and when it is crossed while watched. Waits for the data to settle, for the
 * route to finish arriving, and for the anchor to be showable (not behind an overlay,
 * not in a background tab).
 *
 * The first moment per goal per scope is the full one; later ones follow `repeat`
 * (default: a quiet echo from the same element). Returns true for a beat while a
 * moment plays, so the host can add its own flourish (`is-celebrating`).
 */
export function useGoalCelebration(options: GoalCelebrationOptions): boolean {
  const { scope, met, ready, enabled = true } = options
  const latest = useRef(options)
  const [celebrating, setCelebrating] = useState(false)
  const seenScope = useRef<string | null>(null)
  const prevMet = useRef(false)
  const pending = useRef<number | null>(null)
  const flourish = useRef<number | null>(null)

  useEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    if (!enabled || !ready) return

    const arm = () => {
      if (pending.current != null) return
      const attempt = () => {
        pending.current = null
        const o = latest.current
        // Re-read everything at fire time: the goal may have been un-met, or the day
        // changed, while we waited.
        if (!(o.enabled ?? true) || !o.met || o.scope !== seenScope.current) return
        const el = o.anchorRef.current
        if (!o.ready || !isShowable(el)) {
          pending.current = window.setTimeout(attempt, VISIBILITY_POLL_MS)
          return
        }
        const outcome = celebrationActions.celebrate({
          anchor: el,
          palette: o.palette,
          label: o.label,
          detail: o.detail,
          once: { key: o.goal, scope: o.scope, repeat: o.repeat ?? 'echo' },
        })
        if (outcome === 'skipped') return
        setCelebrating(true)
        if (flourish.current != null) window.clearTimeout(flourish.current)
        flourish.current = window.setTimeout(() => setCelebrating(false), FLOURISH_MS)
      }
      pending.current = window.setTimeout(attempt, latest.current.delayMs ?? DEFAULT_DELAY_MS)
    }

    if (seenScope.current !== scope) {
      // First settled reading for this scope — the route just opened, or the day turned
      // over underneath it. A goal that is already met gets its moment on arrival.
      seenScope.current = scope
      prevMet.current = met
      if (met) arm()
      return
    }
    if (met && !prevMet.current) arm()
    prevMet.current = met
  }, [enabled, ready, met, scope])

  // Timers are cleared on unmount only: a refetch flipping `ready` mid-wait must not
  // cancel a moment that is due. Forgetting the scope lets a remount (StrictMode's
  // double-invoke included) treat its first reading as an arrival again.
  useEffect(
    () => () => {
      if (pending.current != null) window.clearTimeout(pending.current)
      if (flourish.current != null) window.clearTimeout(flourish.current)
      pending.current = null
      seenScope.current = null
    },
    [],
  )

  return celebrating
}
