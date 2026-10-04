// HUD gutters — the command center that flanks the stage on a wide window: TODAY on
// the left (time, up next, focus) and PULSE on the right (the day's rings, the
// month's money, outside). It replaced developer telemetry (FPS, heap, request
// logs) that nobody acted on.
//
// Why this exists: `.dashboard-stage` caps at 1200px and centres, so a full-screen
// window leaves a band of bare canvas either side. Widening the stage was not the
// fix — the cap is what keeps card density and line length readable. Instead the
// bands become *chrome*: ambient, peripheral readouts that frame the stage without
// competing with it.
//
// Three rules hold the whole thing together:
//   1. It is progressive. A wide window gets the roomy column, a windowed one gets
//      a narrower, denser version of the same card, and below about 150px of
//      spare band nothing renders at all — no fetch, no rAF loop, no cost. There
//      is no bottom-bar fallback: the stage is a fixed 1200px the routes are
//      tuned around, so on a narrow window the only room left would have to come
//      out of the cards.
//   2. Only the cards take clicks. The gutters are pointer-events: none and each
//      card opts back in (a card opens the route it summarises), so the canvas
//      between them can never swallow a click meant for the stage.
//   3. It is measured, not assumed. `html { zoom }` scales the viewport by a curve
//      that depends on both window dimensions, so the gutter is given the calc in
//      CSS and then measures itself (use-gutter-space.ts).

import { useEffect, useRef, useState } from 'react'
import { PanelsTopLeft } from 'lucide-react'
import type { AppPath } from '@/app/routes'
import { hudActions } from '@/store/hud-store'
import { PulseColumn } from './components/pulse-column'
import { TodayColumn } from './components/today-column'
import { useClock } from './use-clock'
import { fitFor, useElementSize } from './use-gutter-space'
import './hud.css'

const ENABLED_KEY = 'hud.enabled'
/** Matches the breakpoint the rest of the shell switches layout at. */
const DESKTOP_QUERY = '(min-width: 769px)'

function readEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== 'false'
  } catch {
    return true
  }
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY)
    const sync = () => setIsDesktop(query.matches)
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return isDesktop
}

function HudGutters({ activePath, onNavigate }: { activePath: AppPath; onNavigate: (path: AppPath, search?: string) => void }) {
  const [enabled, setEnabled] = useState(readEnabled)
  const gutterRef = useRef<HTMLDivElement>(null)
  // Both gutters carry the same calc, so one measurement describes both.
  const gutter = useElementSize(gutterRef)
  const isDesktop = useIsDesktop()
  const fit = fitFor(gutter)
  const show = enabled && isDesktop && fit.render

  // The clock is lifted here so both columns tick on the same frame — two
  // independent second-boundary timers drift apart and the readouts disagree.
  const now = useClock()

  // The command center's numbers: fresh on show and on every route change (the
  // store throttles to once a minute), every five minutes while visible, and at
  // once when the calendar changes anywhere.
  useEffect(() => {
    if (show) void hudActions.refresh()
  }, [show, activePath])

  useEffect(() => {
    if (!show) return
    const timer = window.setInterval(() => {
      if (!document.hidden) void hudActions.refresh()
    }, 5 * 60_000)
    const onCalendar = () => void hudActions.refresh(true)
    window.addEventListener('calendar-updated', onCalendar)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('calendar-updated', onCalendar)
    }
  }, [show])

  const toggle = () => {
    setEnabled((previous) => {
      const next = !previous
      try {
        localStorage.setItem(ENABLED_KEY, String(next))
      } catch {
        // Storage blocked — the toggle still applies for this session.
      }
      return next
    })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.key.toLowerCase() !== 'h') return
      const target = event.target as HTMLElement | null
      // Never steal the chord from a field the user is typing in.
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      toggle()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const toggleButton = (
    <button
      type="button"
      className="hud-toggle"
      onClick={toggle}
      aria-pressed={enabled}
      title={`${enabled ? 'Hide' : 'Show'} the HUD  (⌘⇧H)`}
    >
      <PanelsTopLeft size={12} strokeWidth={2} aria-hidden="true" />
      <span>HUD</span>
    </button>
  )

  return (
    <aside className="hud-root" data-active={show} data-narrow={fit.narrow} aria-label="Ambient status">
      {/* Always mounted, even when empty: it is the probe the whole layout
          decision is measured from. */}
      <div className="hud-gutter hud-gutter--left" ref={gutterRef}>
        {show && <TodayColumn now={now} density={fit.density} onNavigate={onNavigate} />}
      </div>

      <div className="hud-gutter hud-gutter--right">
        {show && <PulseColumn now={now} density={fit.density} onNavigate={onNavigate} />}
      </div>

      {isDesktop && fit.render && toggleButton}
    </aside>
  )
}

export { HudGutters }
