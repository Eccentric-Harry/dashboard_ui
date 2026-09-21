import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Check, Droplet, Flame, Sparkles, Trophy, type LucideIcon } from 'lucide-react'

import { ConfettiEngine } from '@/lib/celebration/confetti-engine'
import { cn } from '@/lib/utils'
import {
  useCelebrationStore,
  type CaptionPlacement,
  type CelebrationIcon,
  type CelebrationMoment,
} from '@/store/celebration-store'

import './celebration-layer.css'

const ICONS: Record<CelebrationIcon, LucideIcon> = {
  check: Check,
  droplet: Droplet,
  sparkles: Sparkles,
  trophy: Trophy,
  flame: Flame,
}

/** How long a moment stays mounted — outlives its slowest particle and its caption. */
const LIFETIME_MS = { full: 3600, echo: 2900 } as const
/** Layout px between the anchor's edge and the caption. */
const CAPTION_GAP = 10
/** Below this much room on the requested side, the caption flips to the other one. */
const CAPTION_MIN_ROOM = 64
/** Half the caption's max width plus the viewport margin, for edge clamping. */
const CAPTION_HALF_WIDTH = 120
const EDGE = 12

type PlacedCaption = {
  id: number
  label: string
  detail?: string
  Icon: LucideIcon
  placement: CaptionPlacement
  x: number
  y: number
  accent: string
}

function haptic() {
  // Chrome blocks — and logs — vibrate before the page's first gesture, which a route
  // opened from a link has not had yet, so only ask when it can actually buzz.
  if (typeof navigator.vibrate !== 'function' || !navigator.userActivation?.hasBeenActive) return
  navigator.vibrate([12, 40, 18])
}

/**
 * Converts the moment's anchor (getBoundingClientRect px, which `html { zoom }` scales)
 * into the layer's own layout px, then picks a side with room and clamps to the edges.
 */
function placeCaption(moment: CelebrationMoment, layer: HTMLDivElement | null): PlacedCaption | null {
  if (!moment.caption || !layer) return null
  const box = layer.getBoundingClientRect()
  const scale = box.width ? layer.offsetWidth / box.width : 1
  const width = layer.offsetWidth
  const height = layer.offsetHeight

  let placement = moment.caption.placement
  let x = width / 2
  let y = 72
  if (moment.anchor) {
    const top = (moment.anchor.top - box.top) * scale
    const bottom = top + moment.anchor.height * scale
    x = (moment.anchor.left - box.left + moment.anchor.width / 2) * scale
    if (placement === 'above' && top < CAPTION_MIN_ROOM) placement = 'below'
    else if (placement === 'below' && height - bottom < CAPTION_MIN_ROOM) placement = 'above'
    y = placement === 'above' ? top - CAPTION_GAP : bottom + CAPTION_GAP
  } else {
    placement = 'below'
  }
  const half = Math.max(0, Math.min(CAPTION_HALF_WIDTH, width / 2 - EDGE))
  x = Math.min(Math.max(x, EDGE + half), width - EDGE - half)

  return {
    id: moment.id,
    label: moment.caption.label,
    detail: moment.caption.detail,
    Icon: ICONS[moment.caption.icon],
    placement,
    x,
    y,
    accent: moment.accent,
  }
}

/**
 * The app's one celebration surface, mounted once in App.tsx. Plays whatever
 * `celebrationActions.celebrate()` queues: confetti on a canvas that exists only while
 * something is in the air, a caption pill beside the achievement, and a polite
 * screen-reader announcement. Never takes a pointer event.
 */
function CelebrationLayer() {
  const moments = useCelebrationStore.use.moments()
  const { dismiss } = useCelebrationStore.use.actions()
  const layerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<ConfettiEngine | null>(null)
  const scheduled = useRef(new Set<number>())
  const timers = useRef(new Set<number>())
  const [captions, setCaptions] = useState<PlacedCaption[]>([])
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

    const play = (moment: CelebrationMoment) => {
      const engine = engineRef.current
      if (!moment.reducedMotion && engine) {
        const full = moment.intensity === 'full'
        if (moment.anchor) {
          const x = moment.anchor.left + moment.anchor.width / 2
          const y = moment.anchor.top + moment.anchor.height / 2
          if (full) {
            engine.burst({ x, y, colors: moment.colors, count: 58, spread: 112, power: 15 })
            // A narrower, higher second wave a beat later gives the bloom depth.
            later(() => engineRef.current?.burst({ x, y, colors: moment.colors, count: 22, spread: 56, power: 18.5 }), 140)
          } else {
            engine.burst({ x, y, colors: moment.colors, count: 22, spread: 92, power: 11 })
          }
        } else {
          engine.shower({ colors: moment.colors, count: full ? 56 : 22 })
        }
        if (full) haptic()
      }
      if (moment.caption) {
        const placed = placeCaption(moment, layerRef.current)
        if (placed) setCaptions((prev) => [...prev, placed])
        const { label, detail } = moment.caption
        setAnnouncement(detail ? `${label}, ${detail}` : label)
      }
    }

    for (const moment of moments) {
      if (scheduled.current.has(moment.id)) continue
      scheduled.current.add(moment.id)
      const wait = Math.max(0, moment.startAt - performance.now())
      later(() => play(moment), wait)
      later(() => {
        scheduled.current.delete(moment.id)
        setCaptions((prev) => prev.filter((c) => c.id !== moment.id))
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
        {needsCanvas && <canvas ref={canvasRef} className="celebration-canvas" />}
        {captions.map(({ id, Icon, label, detail, placement, x, y, accent }) => (
          <div
            key={id}
            className={cn('celebration-caption', `is-${placement}`)}
            style={{ left: x, top: y, '--celebration-accent': accent } as CSSProperties}
          >
            <span className="celebration-caption-icon">
              <Icon size={13} strokeWidth={3} />
            </span>
            <span className="celebration-caption-label">{label}</span>
            {detail && <span className="celebration-caption-detail">{detail}</span>}
          </div>
        ))}
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </>
  )
}

export { CelebrationLayer }
