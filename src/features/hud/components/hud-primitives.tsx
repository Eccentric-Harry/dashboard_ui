// The HUD's vocabulary.
//
// Design note — the gutters read as a *bento column*, the same grammar the stage
// uses: several small cards stacked, each one module, rather than one tall card
// with hairlines inside it. That is what makes the columns fill their band
// instead of floating a short list in the middle of it, and it matches how every
// route is already laid out.

import type { ReactNode } from 'react'

export type HudTone = 'good' | 'watch' | 'bad' | 'idle'

/**
 * One module. `grow` marks the panel that absorbs whatever height is left over
 * once the others have taken theirs — without exactly one of these per column,
 * a tall window leaves dead air at the bottom of the stack.
 */
export function HudPanel({
  label,
  meta,
  grow = false,
  className,
  children,
}: {
  label: string
  meta?: ReactNode
  grow?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`hud-panel${grow ? ' hud-panel--grow' : ''}${className ? ` ${className}` : ''}`}>
      <header className="hud-panel-head">
        <span className="hud-eyebrow">{label}</span>
        {meta !== undefined && <span className="hud-panel-meta">{meta}</span>}
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

/** A rule that fills left to right. Used for heap, battery, daylight and storage. */
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
 * The y-axis is the data's own range (with a floor, so a flat series sits
 * mid-height instead of collapsing onto the baseline). `preserveAspectRatio="none"`
 * stretches the viewBox to whatever width the column ended up at; the stroke is
 * kept at its own weight by vectorEffect so it does not stretch with it.
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
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * Where a reading sits on a scale that has named bands — AQI, and nothing else so
 * far. A bare number means nothing until you know 64 is two thirds of the way
 * through "moderate", so the marker carries the meaning the digits can't.
 */
export function HudScale({ ratio, tone = 'idle', ticks = 3 }: { ratio: number; tone?: HudTone; ticks?: number }) {
  const clamped = Math.min(1, Math.max(0, ratio))
  return (
    <div className="hud-scale" role="presentation">
      {Array.from({ length: ticks }, (_, index) => (
        <span key={index} className="hud-scale-tick" style={{ left: `${((index + 1) / (ticks + 1)) * 100}%` }} />
      ))}
      <span className={`hud-scale-marker hud-tone-${tone}`} style={{ left: `${clamped * 100}%` }} />
    </div>
  )
}

/**
 * The next half-day: temperature as a line, precipitation chance as bars beneath
 * it, three hour labels underneath. This is the panel that grows, so it is drawn
 * to whatever height is left rather than a fixed one.
 */
export function HudHourly({
  times,
  temperatures,
  precipitation,
  formatHour,
}: {
  times: readonly number[]
  temperatures: readonly number[]
  precipitation: readonly number[]
  formatHour: (epochMs: number) => string
}) {
  if (temperatures.length < 2) return null

  const max = Math.max(...temperatures)
  const min = Math.min(...temperatures)
  const range = Math.max(2, max - min)
  const step = 100 / (temperatures.length - 1)

  const line = temperatures
    .map((value, index) => `${(index * step).toFixed(2)},${(((max - value) / range) * 84 + 8).toFixed(2)}`)
    .join(' ')

  const wettest = Math.max(...precipitation)
  const labelIndexes = [0, Math.floor((times.length - 1) / 2), times.length - 1]

  return (
    <div className="hud-hourly">
      <div className="hud-hourly-plot">
        <svg className="hud-hourly-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {precipitation.map((chance, index) =>
            chance > 5 ? (
              <rect
                key={index}
                className="hud-hourly-rain"
                x={Math.max(0, index * step - step / 3)}
                width={step / 1.5}
                y={100 - chance * 0.55}
                height={chance * 0.55}
                opacity={0.18 + (chance / 100) * 0.5}
              />
            ) : null,
          )}
          <polyline className="hud-hourly-line" points={line} fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="hud-hourly-peak">{Math.round(max)}°</span>
        <span className="hud-hourly-trough">{Math.round(min)}°</span>
      </div>
      <div className="hud-hourly-axis">
        {labelIndexes.map((index, position) => (
          <span key={index} className="hud-hourly-tick" data-align={position === 0 ? 'start' : position === 1 ? 'mid' : 'end'}>
            {formatHour(times[index])}
          </span>
        ))}
      </div>
      {wettest > 5 && <span className="hud-hourly-note">{Math.round(wettest)}% chance of rain in this window</span>}
    </div>
  )
}
