// HUD gutters — the two instrument columns that flank the stage on a wide window.
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
//   2. It never takes a click. The gutters are pointer-events: none; only the two
//      genuine controls (location opt-in, the HUD toggle) opt back in. Nothing out
//      here can swallow a click meant for a card.
//   3. It is measured, not assumed. `html { zoom }` scales the viewport by a curve
//      that depends on both window dimensions, so the gutter is given the calc in
//      CSS and then measures itself (use-gutter-space.ts).

import { useEffect, useRef, useState } from 'react'
import { PanelsTopLeft } from 'lucide-react'
import type { AppPath } from '@/app/routes'
import { StationColumn } from './components/station-column'
import { TelemetryColumn } from './components/telemetry-column'
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

function HudGutters({ activePath }: { activePath: AppPath }) {
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
        {show && <StationColumn now={now} density={fit.density} narrow={fit.narrow} />}
      </div>

      <div className="hud-gutter hud-gutter--right">
        {show && <TelemetryColumn activePath={activePath} density={fit.density} narrow={fit.narrow} />}
      </div>

      {isDesktop && fit.render && toggleButton}
    </aside>
  )
}

export { HudGutters }
