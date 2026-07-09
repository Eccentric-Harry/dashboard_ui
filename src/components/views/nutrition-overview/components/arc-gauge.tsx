import { useEffect, useRef, useState } from 'react'

type ArcGaugeProps = {
  value: number
  target: number
  /** renders the animated center number (already rounded) */
  format: (animatedValue: number) => string
  centerSub: string
  /** shifts the gauge into the gentle over-budget tint */
  over?: boolean
}

const CX = 100
const CY = 100
const RADIUS = 80
const START_ANGLE = 135 // degrees, clockwise from 3 o'clock
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

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Big numbers count up on load and when switching metrics. */
function useCountUp(target: number, duration = 750) {
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? target : 0))
  const fromRef = useRef(prefersReducedMotion() ? target : 0)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    if (prefersReducedMotion()) {
      fromRef.current = target
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(target)
      return
    }
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const value = Math.round(from + (target - from) * eased)
      fromRef.current = value
      setDisplay(value)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return display
}

/** Continuous 270° radial gauge — dark ink arc over a visible track, tip dot marker. */
function ArcGauge({ value, target, format, centerSub, over }: ArcGaugeProps) {
  const ratio = Math.min(Math.max(value / Math.max(target, 1), 0), 1)
  const trackLength = (Math.PI * RADIUS * SWEEP) / 180
  const tip = polar(START_ANGLE + SWEEP * ratio)
  const animatedValue = useCountUp(value)

  // fill sweeps in on mount (CSS transition carries it; reduced-motion kills it)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  const drawnRatio = mounted ? ratio : 0

  return (
    <div className={`ntr-gauge${over ? ' over' : ''}`} role="img" aria-label={`${format(value)} ${centerSub}`}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <path d={arcPath(START_ANGLE, START_ANGLE + SWEEP)} className="track" />
        <path
          d={arcPath(START_ANGLE, START_ANGLE + SWEEP)}
          className="value"
          strokeDasharray={trackLength}
          strokeDashoffset={trackLength * (1 - drawnRatio)}
        />
        {/* tip marker — reads as a premium "progress head" */}
        {ratio > 0.02 && (
          <>
            <circle className="tip-halo" cx={tip.x} cy={tip.y} r="13" />
            <circle className="tip" cx={tip.x} cy={tip.y} r="5" />
          </>
        )}
      </svg>
      <span className="ntr-gauge-center">
        <strong>{format(animatedValue)}</strong>
        <small>{centerSub}</small>
      </span>
    </div>
  )
}

export { ArcGauge }
