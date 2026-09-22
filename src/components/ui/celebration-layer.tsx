import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { ConfettiEngine } from '@/lib/celebration/confetti-engine'
import { useCelebrationStore, type CelebrationMoment } from '@/store/celebration-store'

import './celebration-layer.css'

/** How long a moment stays mounted — outlives its slowest particle. */
const LIFETIME_MS = { full: 5000, echo: 2900 } as const
/** Particle counts are tuned for a ~1280×800 screen and scale with its area, so a phone
 *  gets a proportionate burst rather than a wall of paper. */
const REFERENCE_AREA = 1280 * 800

type Glow = { id: number; x: number; y: number; accent: string }

/** Viewport point → the layer's layout px (`html { zoom }` scales one but not the other). */
function toLayer(layer: HTMLDivElement, x: number, y: number): { x: number; y: number } {
  const box = layer.getBoundingClientRect()
  const scale = box.width ? layer.offsetWidth / box.width : 1
  return { x: (x - box.left) * scale, y: (y - box.top) * scale }
}

function haptic() {
  // Chrome blocks — and logs — vibrate before the page's first gesture, which a route
  // opened from a link has not had yet, so only ask when it can actually buzz.
  if (typeof navigator.vibrate !== 'function' || !navigator.userActivation?.hasBeenActive) return
  navigator.vibrate([12, 40, 18])
}

/**
 * The app's one celebration surface, mounted once in App.tsx. Plays whatever
 * `celebrationActions.celebrate()` queues: confetti on a canvas that exists only while
 * something is in the air, plus a polite screen-reader announcement. No popup. Never
 * takes a pointer event, so nothing under it is ever blocked.
 */
function CelebrationLayer() {
  const moments = useCelebrationStore.use.moments()
  const { dismiss } = useCelebrationStore.use.actions()
  const layerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<ConfettiEngine | null>(null)
  const scheduled = useRef(new Set<number>())
  const timers = useRef(new Set<number>())
  const [glows, setGlows] = useState<Glow[]>([])
  const [announcement, setAnnouncement] = useState('')

  const needsCanvas = moments.some((m) => !m.reducedMotion)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!needsCanvas || !canvas) return
    const engine = new ConfettiEngine(canvas)
    engineRef.current = engine
    const onResize = () => engine.fit()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      engine.destroy()
      engineRef.current = null
    }
  }, [needsCanvas])

  useEffect(() => {
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.current.delete(id)
        fn()
      }, ms)
      timers.current.add(id)
    }

    // The full moment is one gesture: a single burst from the achievement's own element
    // (so you see *what* was met) with a soft glow behind it — or, with nothing to point
    // at, a light sprinkle from the top.
    const playFull = (engine: ConfettiEngine, moment: CelebrationMoment) => {
      const density = Math.min(1, Math.max(0.6, engine.area / REFERENCE_AREA))
      const n = (count: number) => Math.round(count * density)
      const { colors, anchor } = moment
      if (anchor) {
        const x = anchor.left + anchor.width / 2
        const y = anchor.top + anchor.height / 2
        engine.burst({ x, y, colors, count: n(44), spread: 100, power: 14 })
        const layer = layerRef.current
        if (layer) setGlows((prev) => [...prev, { id: moment.id, ...toLayer(layer, x, y), accent: moment.accent }])
      } else {
        engine.shower({ colors, count: n(36) })
      }
      haptic()
    }

    const play = (moment: CelebrationMoment) => {
      const engine = engineRef.current
      if (!moment.reducedMotion && engine) {
        if (moment.intensity === 'full') {
          playFull(engine, moment)
        } else if (moment.anchor) {
          const x = moment.anchor.left + moment.anchor.width / 2
          const y = moment.anchor.top + moment.anchor.height / 2
          engine.burst({ x, y, colors: moment.colors, count: 26, spread: 92, power: 11 })
        } else {
          engine.shower({ colors: moment.colors, count: 26 })
        }
      }
      if (moment.announce) setAnnouncement(moment.announce)
    }

    for (const moment of moments) {
      if (scheduled.current.has(moment.id)) continue
      scheduled.current.add(moment.id)
      const wait = Math.max(0, moment.startAt - performance.now())
      later(() => play(moment), wait)
      later(() => {
        scheduled.current.delete(moment.id)
        setGlows((prev) => prev.filter((g) => g.id !== moment.id))
        dismiss(moment.id)
      }, wait + LIFETIME_MS[moment.intensity])
    }
  }, [moments, dismiss])

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((id) => window.clearTimeout(id))
      pending.clear()
    }
  }, [])

  return (
    <>
      <div ref={layerRef} className="celebration-layer" aria-hidden="true">
        {glows.map(({ id, x, y, accent }) => (
          <span
            key={id}
            className="celebration-glow"
            style={{ left: x, top: y, '--celebration-accent': accent } as CSSProperties}
          />
        ))}
        {needsCanvas && <canvas ref={canvasRef} className="celebration-canvas" />}
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </>
  )
}

export { CelebrationLayer }
