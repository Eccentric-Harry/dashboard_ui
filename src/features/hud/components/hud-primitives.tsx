// The HUD's whole vocabulary: four primitives, no card chrome.
//
// Design note — the gutters must read as *chrome*, not as a third column of
// content. A glass card out here would make three competing surfaces across the
// window and pull the eye off the stage, which is the one thing this feature must
// not do. So everything sits directly on the canvas, separated by hairlines, in
// the same grammar the route cards use inside their wells (see the "Home in
// Nutrition's grammar" note: one well per card, hairlines not boxes).

import type { ReactNode } from 'react'

export type HudTone = 'good' | 'watch' | 'bad' | 'idle'

/** One labelled module. `meta` is the right-hand side of the eyebrow row. */
export function HudBlock({ label, meta, children }: { label: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="hud-block">
      <header className="hud-block-head">
        <span className="hud-eyebrow">{label}</span>
        {meta !== undefined && <span className="hud-block-meta">{meta}</span>}
      </header>
      {children}
    </section>
  )
}

/** `label ···· value`. The leader is what makes a stack of these read as a dump. */
export function HudRow({ label, value, tone = 'idle' }: { label: string; value: ReactNode; tone?: HudTone }) {
  return (
    <div className="hud-row">
      <span className="hud-row-label">{label}</span>
      <span className="hud-row-leader" aria-hidden="true" />
      <span className={`hud-row-value hud-tone-${tone}`}>{value}</span>
    </div>
  )
}

/** A 2px rule that fills left to right. Used for heap, battery and daylight. */
export function HudBar({ ratio, tone = 'idle' }: { ratio: number; tone?: HudTone }) {
  const clamped = Math.min(1, Math.max(0, ratio))
  return (
    <div className="hud-bar" role="presentation">
      <span className={`hud-bar-fill hud-tone-${tone}`} style={{ width: `${clamped * 100}%` }} />
    </div>
  )
}

export function HudDot({ tone = 'idle', pulsing = false }: { tone?: HudTone; pulsing?: boolean }) {
  return <span className={`hud-dot hud-tone-${tone}${pulsing ? ' is-pulsing' : ''}`} aria-hidden="true" />
}

/**
 * A 1px sparkline over `values`. No fill, no gradient, no dots: in the corner of
 * the eye a filled area chart reads as a coloured block and keeps drawing
 * attention, while a hairline reads as texture until you look straight at it.
 *
 * The y-axis is the data's own range (with a floor, so a flat series sits mid-height
 * instead of collapsing onto the baseline). `preserveAspectRatio="none"` stretches
 * the viewBox to whatever width the column ended up at; the stroke is kept at 1px
 * by vectorEffect so it does not stretch with it.
 */
export function HudSpark({
  values,
  height = 16,
  tone = 'idle',
  minRange = 1,
}: {
  values: readonly number[]
  height?: number
  tone?: HudTone
  minRange?: number
}) {
  if (values.length < 2) {
    return <div className="hud-spark is-empty" style={{ height }} aria-hidden="true" />
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(minRange, max - min)
  const mid = (max + min) / 2
  const top = mid + range / 2
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100
      const y = ((top - value) / range) * 100
      return `${x.toFixed(2)},${Math.min(100, Math.max(0, y)).toFixed(2)}`
    })
    .join(' ')

  return (
    <svg
      className={`hud-spark hud-tone-${tone}`}
      style={{ height }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={points} fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
