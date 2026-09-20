// HUD gutters — the two instrument columns that flank the stage on a wide window.
//
// Why this exists: `.dashboard-stage` caps at 1200px and centres, so a full-screen
// window leaves a band of bare canvas either side. Widening the stage was not the
// fix — the cap is what keeps card density and line length readable. Instead the
// bands become *chrome*: ambient, peripheral readouts that frame the stage without
// competing with it.
//
// Three rules hold the whole thing together:
//   1. It is progressive. Below ~232px of spare gutter the columns do not render
//      at all — no fetch, no rAF loop, no cost. Mobile never sees them, and the
//      ~1065px working window the rest of the UI is tuned for is unaffected.
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
import { densityFor, useElementSize } from './use-gutter-space'
import './hud.css'

/** Below this the column would be narrower than its own two-column rows. */
const MIN_GUTTER_PX = 232
const ENABLED_KEY = 'hud.enabled'

function readEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== 'false'
  } catch {
    return true
  }
}

function HudGutters({ activePath }: { activePath: AppPath }) {
  const [enabled, setEnabled] = useState(readEnabled)
  const gutterRef = useRef<HTMLDivElement>(null)
  // Both gutters carry the same calc, so one measurement describes both.
  const gutter = useElementSize(gutterRef)
  const hasRoom = gutter.width >= MIN_GUTTER_PX
  const density = densityFor(gutter.height)

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

  const showColumns = hasRoom && enabled

  return (
    <aside className="hud-root" data-active={showColumns ? 'true' : 'false'} aria-label="Ambient status">
      <div className="hud-gutter hud-gutter--left" ref={gutterRef}>
        {showColumns && <StationColumn now={now} density={density} />}
      </div>

      <div className="hud-gutter hud-gutter--right">
        {showColumns && <TelemetryColumn activePath={activePath} density={density} />}
      </div>

      {hasRoom && (
        <button
          type="button"
          className="hud-toggle"
          onClick={toggle}
          aria-pressed={enabled}
          title={`${enabled ? 'Hide' : 'Show'} gutter HUD  (⌘⇧H)`}
        >
          <PanelsTopLeft size={12} strokeWidth={2} aria-hidden="true" />
          <span>HUD</span>
        </button>
      )}
    </aside>
  )
}

export { HudGutters }
