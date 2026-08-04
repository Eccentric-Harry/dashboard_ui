import { useEffect, useState } from 'react'
import { useCountUp } from '../../../../hooks/use-count-up'

/**
 * The day loop, drawn as five arcs instead of one.
 *
 * The single continuous gauge this replaces could only say "30%" — it couldn't say
 * *which* 30%, so the number never pointed at anything you could go and do. One
 * segment per loop signal, each filling on its own, makes the shortfall legible from
 * across the room: a gap at 2 o'clock is the mood check-in, every time, because the
 * segments keep a fixed order regardless of what's logged.
 */

const CX = 100
const CY = 100
const RADIUS = 80
const START_ANGLE = 135 // degrees, clockwise from 3 o'clock — matches ArcGauge
const SWEEP = 270
/**
 * Angular gap between segments. Has to be generous: the round linecaps overshoot
 * each segment's ends by half the stroke width (~5° at this radius, from both
 * sides), so anything under ~11° closes up and the ring reads as one arc again.
 */
const GAP = 14

export type LoopArcSegment = {
  id: string
  label: string
  /** 0–1 */
  ratio: number
  done: boolean
}

const polar = (angleDeg: number) => {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + RADIUS * Math.cos(rad), y: CY + RADIUS * Math.sin(rad) }
}

const arcPath = (fromDeg: number, toDeg: number) => {
  const start = polar(fromDeg)
  const end = polar(toDeg)
  const largeArc = toDeg - fromDeg > 180 ? 1 : 0
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

const arcLength = (spanDeg: number) => (Math.PI * RADIUS * spanDeg) / 180

type LoopArcProps = {
  segments: LoopArcSegment[]
  /** Whole-percent loop score shown in the centre. */
  score: number
  centerSub: string
  /** Which segment to highlight — the row the user is hovering, or the suggested next step. */
  activeId?: string | null
}

function LoopArc({ segments, score, centerSub, activeId }: LoopArcProps) {
  const animatedScore = useCountUp(score)

  // Fills sweep in on mount; the CSS transition on stroke-dashoffset carries it.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const count = Math.max(segments.length, 1)
  const span = (SWEEP - GAP * (count - 1)) / count
  const length = arcLength(span)

  return (
    <div
      className="home-loop-arc"
      role="img"
      aria-label={`${score}% ${centerSub}. ${segments
        .map((s) => `${s.label} ${Math.round(s.ratio * 100)}%`)
        .join(', ')}.`}
    >
      <svg viewBox="0 0 200 200" aria-hidden="true">
        {segments.map((segment, index) => {
          const from = START_ANGLE + index * (span + GAP)
          const path = arcPath(from, from + span)
          const drawn = mounted ? Math.min(Math.max(segment.ratio, 0), 1) : 0
          return (
            <g
              key={segment.id}
              className={`home-loop-seg home-loop-seg--${segment.id}${segment.done ? ' is-done' : ''}${
                activeId === segment.id ? ' is-active' : ''
              }`}
            >
              <path d={path} className="home-loop-seg-track" />
              <path
                d={path}
                className="home-loop-seg-fill"
                strokeDasharray={length}
                strokeDashoffset={length * (1 - drawn)}
              />
            </g>
          )
        })}
      </svg>
      <span className="home-loop-arc-center">
        <strong>{Math.round(animatedScore)}%</strong>
        <small>{centerSub}</small>
      </span>
    </div>
  )
}

export { LoopArc }
