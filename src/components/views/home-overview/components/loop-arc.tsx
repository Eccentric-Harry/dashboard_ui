import { useEffect, useState } from 'react'
import { useCountUp } from '../../../../hooks/use-count-up'

/**
 * The day loop, drawn as one continuous arc.
 *
 * The gauge answers a single question — how much of today is closed — and the four
 * tiles beside it answer "which part". Splitting the ring into one segment per
 * signal duplicated that breakdown in a shape that had to be decoded first; one arc
 * reads at a glance and lets the tiles carry the detail.
 *
 * The stroke is ink black: the tiles already carry the domain colors, and a single
 * neutral ring keeps the panel's one loud element loud.
 */

const CX = 100
const CY = 100
const RADIUS = 80
const START_ANGLE = 135 // degrees, clockwise from 3 o'clock — matches ArcGauge
const SWEEP = 270

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

const TRACK = arcPath(START_ANGLE, START_ANGLE + SWEEP)
const LENGTH = (Math.PI * RADIUS * SWEEP) / 180

type LoopArcProps = {
  /** Whole-percent loop score — drives both the fill and the centre number. */
  score: number
  centerSub: string
  /** Read out after the score, so the ring's aria label names what's still open. */
  description?: string
}

function LoopArc({ score, centerSub, description }: LoopArcProps) {
  const animatedScore = useCountUp(score)

  // The fill sweeps in on mount; the CSS transition on stroke-dashoffset carries it.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const drawn = mounted ? Math.min(Math.max(score / 100, 0), 1) : 0

  return (
    <div
      className={`home-loop-arc${score >= 100 ? ' is-complete' : ''}`}
      role="img"
      aria-label={`${score}% ${centerSub}.${description ? ` ${description}` : ''}`}
    >
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <path d={TRACK} className="home-loop-track" />
        <path
          d={TRACK}
          className="home-loop-fill"
          strokeDasharray={LENGTH}
          strokeDashoffset={LENGTH * (1 - drawn)}
        />
      </svg>
      <span className="home-loop-arc-center">
        <strong>{Math.round(animatedScore)}%</strong>
        <small>{centerSub}</small>
      </span>
    </div>
  )
}

export { LoopArc }
