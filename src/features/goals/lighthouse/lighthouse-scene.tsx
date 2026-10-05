import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent, RefObject } from 'react'
import { ChevronRight } from 'lucide-react'
import type { ProgramTrackKey } from '@/types/program'
import { cn } from '@/lib/utils'
import { Pip } from '../components/pip'
import type { PipMood } from '../buddy-brain'
import type { PipStage } from '../pip-growth'
import type { LighthouseStage } from './program-engine'
import type { KeeperOffer } from './lighthouse-voice'
import { trackMeta } from './program-content'

export type SceneObject = 'tower' | 'logbook' | 'bottle' | 'bench' | 'flag'

type LighthouseSceneProps = {
  kept: number
  stage: LighthouseStage
  /** The stone that was just laid (pops in). */
  fresh: number | null
  /** Whether the next stone is marked — once a program is under way. */
  showNext: boolean
  pip: { mood: PipMood; line: string; offer?: KeeperOffer }
  /** Where Pip is in what he has to say (null while he's reacting to something). */
  talk: { index: number; count: number } | null
  buddyName: string
  wear: { hat?: string | null; neck?: string | null; face?: string | null }
  growth: PipStage
  /** Checkpoints waiting — the flag goes up. */
  flagUp: boolean
  /** A letter can be written or read — the bottle glints. */
  bottleGlint: boolean
  /** It's review time — the bench glows. */
  reviewDue: boolean
  /** Today's lanterns on the water (null before a program exists). */
  lights: SceneLight[] | null
  lightsLabel: string
  onObject: (o: SceneObject, el: HTMLElement) => void
  onLight: (track: ProgramTrackKey, el: HTMLElement) => void
  onPip: () => void
  onOffer: (offer: KeeperOffer, el: HTMLElement) => void
  onDismissOffer: () => void
}

// The art's frame (viewBox) and where Pip's head is in it — the bubble is anchored there.
const VB = { x: 170, y: 24, w: 500, h: 456 }
const PIP = { x: 508, y: 290, size: 66 }
const PIP_HEAD = { x: PIP.x + PIP.size / 2, y: PIP.y + 4 }
/** Every label on the island sits on one line, just under the things they name. */
const LABEL_Y = 373
/** Today's lanterns float in a shallow arc in front of the island. */
const LIGHTS_CX = 424
const LIGHTS_Y = 432

// The tower: 25 courses of 4 stones = 100 kept promises, laid bottom-up, left to right.
const COURSES = 25
const PER_COURSE = 4
const TOWER_TOP = 150
const TOWER_BASE = 345
const TOP_W = 46
const BASE_W = 68
const CX = 330
const ROW_H = (TOWER_BASE - TOWER_TOP) / COURSES

const widthAt = (y: number) => TOP_W + ((BASE_W - TOP_W) * (y - TOWER_TOP)) / (TOWER_BASE - TOWER_TOP)

const STONES = Array.from({ length: COURSES * PER_COURSE }, (_, i) => {
  const course = Math.floor(i / PER_COURSE)
  const col = i % PER_COURSE
  const yBottom = TOWER_BASE - course * ROW_H
  const yTop = yBottom - ROW_H
  const wb = widthAt(yBottom)
  const wt = widthAt(yTop)
  const x = (w: number, k: number) => CX - w / 2 + (w * k) / PER_COURSE
  const g = 0.7
  const points = [
    [x(wb, col) + g, yBottom - g / 2],
    [x(wb, col + 1) - g, yBottom - g / 2],
    [x(wt, col + 1) - g, yTop + g / 2],
    [x(wt, col) + g, yTop + g / 2],
  ]
    .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
    .join(' ')
  // Candy stripes in bands of five courses, like a real lighthouse.
  const band = Math.floor(course / 5) % 2 === 0 ? 'b' : 'a'
  return { i, points, band }
})

const towerOutline = `M${CX - BASE_W / 2} ${TOWER_BASE} L${CX - TOP_W / 2} ${TOWER_TOP} L${CX + TOP_W / 2} ${TOWER_TOP} L${CX + BASE_W / 2} ${TOWER_BASE} Z`

// Hand-placed grass tufts and flowers on the island's top.
const TUFTS = [[232, 345], [276, 352], [372, 352], [446, 350], [560, 344], [590, 340], [404, 356]] as const
const FLOWERS = [[262, 348, '#ff8fb0'], [300, 353, '#ffd25a'], [452, 354, '#ffffff'], [578, 348, '#ff8fb0'], [418, 357, '#ffd25a']] as const

function onActivate(fn: (el: HTMLElement) => void) {
  return {
    onClick: (e: MouseEvent<SVGGElement>) => fn(e.currentTarget as unknown as HTMLElement),
    onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        fn(e.currentTarget as unknown as HTMLElement)
      }
    },
  }
}

/**
 * The label under a thing to tap — one paper tag, the same everywhere, always shown. A dot on
 * it means that place has something waiting; the tag itself never comes and goes.
 */
function Tag({ x, y, text, due, scale = 1 }: { x: number; y: number; text: string; due?: boolean; scale?: number }) {
  const w = Math.round(text.length * 5.5 + 16)
  return (
    <g className={cn('lh-tag', due && 'is-due')} transform={`translate(${x} ${y}) scale(${scale})`} aria-hidden="true">
      <rect className="lh-tag-lip" x={-w / 2} y={-7.5} width={w} height={17} rx={8.5} />
      <rect className="lh-tag-face" x={-w / 2} y={-9} width={w} height={17} rx={8.5} />
      <text x={0} y={3.2} textAnchor="middle">
        {text}
      </text>
      {due && <circle className="lh-tag-dot" cx={w / 2 - 2} cy={-8} r={4} />}
    </g>
  )
}

export type SceneLight = { key: ProgramTrackKey; lit: boolean }

/** Today's lights: one paper lantern floating in front of the island per track that's on. */
function Lights({ lights, label, scale, onLight }: { lights: SceneLight[]; label: string; scale: number; onLight: (track: ProgramTrackKey, el: HTMLElement) => void }) {
  if (!lights.length) return null
  const gap = Math.min(46, 330 / Math.max(1, lights.length - 1))
  const x0 = LIGHTS_CX - (gap * (lights.length - 1)) / 2
  return (
    <g className="lh-lights">
      {lights.map((l, i) => {
        const meta = trackMeta(l.key)
        const Icon = meta.icon
        const x = x0 + gap * i
        const y = LIGHTS_Y - Math.pow(Math.abs(x - LIGHTS_CX) / 170, 2) * 7
        return (
          <g
            key={l.key}
            className={cn('lh-obj lh-light', l.lit ? 'is-lit' : 'is-dim')}
            data-color={meta.color}
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${Math.min(scale, 1.15)})`}
            role="button"
            tabIndex={0}
            aria-label={`${meta.name} — ${l.lit ? 'lit today' : 'not lit yet today'}`}
            {...onActivate((el) => onLight(l.key, el))}
          >
            <rect className="lh-obj-hit" x="-18" y="-22" width="36" height="44" rx="10" />
            {l.lit && <ellipse className="lh-light-pool" cx="0" cy="13" rx="19" ry="4.5" />}
            {l.lit && <circle className="lh-light-glow" cx="0" cy="-2" r="19" />}
            <path className="lh-light-reflect" d="M-7 17.5 h14 M-4 21 h8" />
            <g className="lh-light-body">
              <rect className="lh-light-raft" x="-12" y="8.5" width="24" height="4.6" rx="2.3" />
              <rect className="lh-light-paper" x="-9" y="-12" width="18" height="21" rx="5.5" />
              <rect className="lh-light-cap" x="-6.5" y="-15" width="13" height="3.6" rx="1.6" />
              <Icon className="lh-light-icon" x={-5.5} y={-7} width={11} height={11} strokeWidth={2.6} />
            </g>
            <g className="lh-light-tip" aria-hidden="true">
              <rect x={-(meta.name.length * 2.6 + 7)} y="-33" width={meta.name.length * 5.2 + 14} height="13" rx="6.5" />
              <text x="0" y="-23.6" textAnchor="middle">
                {meta.name}
              </text>
            </g>
          </g>
        )
      })}
      <Tag x={LIGHTS_CX} y={LIGHTS_Y + 25 + (scale - 1) * 6} text={label} scale={scale} />
    </g>
  )
}

/** Where Pip's head lands on screen, so the speech bubble can sit right above it. */
function useAnchor(ref: RefObject<HTMLElement | null>) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const W = el.clientWidth
      const H = el.clientHeight
      const s = Math.min(W / VB.w, H / VB.h)
      const offX = (W - VB.w * s) / 2
      const offY = H - VB.h * s
      setBox({ x: offX + (PIP_HEAD.x - VB.x) * s, y: offY + (PIP_HEAD.y - VB.y) * s, w: W, h: H })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return box
}

/**
 * The Lighthouse's place: a small island in the sea under the camp's real-time sky, with its
 * own sun or moon. The tower is built from kept promises — one stone each, the next one
 * marked, a ladder up to where the work is — and its lamp room goes up at 25, lights at 50
 * and sweeps a beam at 100. Every place to tap wears the same paper tag on one line under
 * it: the flag (check-ins), the tower, the cottage (the logbook), the bench (the weekly
 * review) and the bottle on the sand (letters). In front, one lantern floats on the water for
 * each track that's on today, lit once it's done. Pip stands by the bench — tap him and he
 * says the next thing on his mind. A seal named Maris naps on the rocks.
 */
function LighthouseScene({
  kept,
  stage,
  fresh,
  showNext,
  pip,
  talk,
  buddyName,
  wear,
  growth,
  flagUp,
  bottleGlint,
  reviewDue,
  lights,
  lightsLabel,
  onObject,
  onLight,
  onPip,
  onOffer,
  onDismissOffer,
}: LighthouseSceneProps) {
  const laid = Math.min(kept, STONES.length)
  // The top of the courses laid so far — where the ladder reaches.
  const front = TOWER_BASE - Math.ceil(laid / PER_COURSE) * ROW_H
  const roomBuilt = stage !== 'building'
  const lit = stage === 'lit' || stage === 'beam'
  const sceneRef = useRef<HTMLElement | null>(null)
  const anchor = useAnchor(sceneRef)
  const [poked, setPoked] = useState(0)
  // Tags are drawn at 9.5 art units; when the art is drawn small (a phone draws it at about
  // three quarters) they grow back to about 10px on screen — never past 1.4, where they still
  // fit their one line without touching.
  const artScale = anchor ? Math.min(anchor.w / VB.w, anchor.h / VB.h) : 1
  const tagScale = Math.round(Math.min(1.4, Math.max(1, 10 / (9.5 * artScale))) * 20) / 20

  // The bubble sits over Pip, kept inside the scene; its tail points at his head.
  const bubbleW = anchor ? Math.min(anchor.w - 24, anchor.w < 520 ? 288 : 340) : 340
  const left = anchor ? Math.max(12, Math.min(anchor.w - bubbleW - 12, anchor.x - bubbleW * 0.62)) : 0
  const bubbleStyle: CSSProperties = anchor
    ? ({
        left,
        bottom: Math.max(8, anchor.h - anchor.y + 14),
        width: bubbleW,
        ['--tail' as string]: `${Math.max(24, Math.min(bubbleW - 24, anchor.x - left))}px`,
      } as CSSProperties)
    : { visibility: 'hidden' }

  const talkTo = () => {
    setPoked((n) => n + 1)
    onPip()
  }

  return (
    <section className="lh-scene" aria-label="The lighthouse" ref={sceneRef}>
      <div className="lh-bubble" aria-live="polite" data-mood={pip.mood} style={bubbleStyle} key={pip.line}>
        <span className="lh-bubble-name">
          {buddyName}
          {talk && talk.count > 1 && (
            <span className="lh-bubble-dots" aria-label={`${talk.index + 1} of ${talk.count}`}>
              {Array.from({ length: talk.count }, (_, i) => (
                <i key={i} className={cn(i === talk.index && 'is-on')} />
              ))}
            </span>
          )}
        </span>
        <p>{pip.line}</p>
        {pip.offer ? (
          <div className="lh-bubble-actions">
            <button type="button" className="lh-btn lh-btn--sm lh-btn--primary" onClick={(e) => onOffer(pip.offer!, e.currentTarget)}>
              {pip.offer.kind === 'small' ? `Log the small ${trackMeta(pip.offer.track).name.toLowerCase()}` : 'Make it smaller'}
            </button>
            <button type="button" className="lh-btn lh-btn--sm lh-btn--ghost" onClick={onDismissOffer}>
              Not now
            </button>
          </div>
        ) : (
          talk &&
          talk.count > 1 && (
            <button type="button" className="lh-bubble-next" onClick={talkTo} aria-label={`What else, ${buddyName}?`}>
              <ChevronRight size={16} strokeWidth={3} aria-hidden="true" />
            </button>
          )
        )}
      </div>

      <svg
        className="lh-art"
        viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
        preserveAspectRatio="xMidYMax meet"
        role="img"
        aria-label={`The lighthouse: ${kept} stone${kept === 1 ? '' : 's'} laid, one for each promise kept`}
      >
        <defs>
          <linearGradient id="lh-sea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--sea-top)" />
            <stop offset="100%" stopColor="var(--sea-deep)" />
          </linearGradient>
          <linearGradient id="lh-haze" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="lh-rock" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--rock)" />
            <stop offset="100%" stopColor="var(--rock-deep)" />
          </linearGradient>
          <linearGradient id="lh-grass" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--grass)" />
            <stop offset="100%" stopColor="var(--grass-deep)" />
          </linearGradient>
          {/* Round-tower shading: shadow on the left, light from the right. */}
          <linearGradient id="lh-cylinder" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#1b1530" stopOpacity="0.32" />
            <stop offset="38%" stopColor="#1b1530" stopOpacity="0.06" />
            <stop offset="68%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="86%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#1b1530" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="lh-roof" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--roof-deep)" />
            <stop offset="55%" stopColor="var(--roof)" />
            <stop offset="100%" stopColor="var(--roof-lit)" />
          </linearGradient>
          <radialGradient id="lh-lamp-glow">
            <stop offset="0%" stopColor="#fff3b0" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#ffd25a" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffd25a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lh-warm">
            <stop offset="0%" stopColor="#ffe08a" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ffe08a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lh-orb-halo">
            <stop offset="0%" stopColor="var(--orb-glow, #fff3c4)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--orb-glow, #fff3c4)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lh-beam" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#fff6c8" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#fff6c8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lh-beam-l" x1="1" x2="0" y1="0" y2="0">
            <stop offset="0%" stopColor="#fff6c8" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#fff6c8" stopOpacity="0" />
          </linearGradient>
          <mask id="lh-crescent">
            <circle r="15" fill="#ffffff" />
            <circle cx="7" cy="-5" r="12.5" fill="#000000" />
          </mask>
          <clipPath id="lh-tower-clip">
            <path d={towerOutline} />
          </clipPath>
        </defs>

        {/* The sky's lamp: the sun by day (low at dawn and dusk), the moon at night. */}
        <g className="lh-orb lh-orb--sun" aria-hidden="true">
          <circle r="46" fill="url(#lh-orb-halo)" />
          <circle className="lh-orb-core" r="17" />
        </g>
        <g className="lh-orb lh-orb--moon" aria-hidden="true">
          <circle r="52" fill="url(#lh-orb-halo)" />
          <circle className="lh-orb-core" r="15" mask="url(#lh-crescent)" />
          <circle className="lh-moon-dimple" cx="-7" cy="5" r="2" />
          <circle className="lh-moon-dimple" cx="-3" cy="10" r="1.2" />
        </g>
        <g className="lh-twinkles" aria-hidden="true">
          {[[214, 70], [452, 58], [560, 168], [262, 150], [640, 210]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y - 4} L${x + 1} ${y - 1} L${x + 4} ${y} L${x + 1} ${y + 1} L${x} ${y + 4} L${x - 1} ${y + 1} L${x - 4} ${y} L${x - 1} ${y - 1} Z`} style={{ animationDelay: `${-i * 0.9}s` }} />
          ))}
        </g>

        {/* The horizon: two ranges of far islands, a ship passing, then the sea and its haze. */}
        <path className="lh-far lh-far--back" d="M-200 334 C -120 300, -40 296, 40 312 C 90 322, 150 300, 210 306 C 240 310, 262 322, 280 334 Z" />
        <path className="lh-far lh-far--back" d="M560 334 C 600 316, 660 296, 730 300 C 800 304, 860 318, 980 334 Z" />
        <path className="lh-far" d="M-120 334 C -60 316, 10 314, 70 322 C 110 328, 140 330, 170 334 Z" />
        <path className="lh-far" d="M640 334 C 690 322, 740 316, 790 320 C 840 324, 880 330, 920 334 Z" />
        <g className="lh-ship" aria-hidden="true">
          <path className="lh-ship-hull" d="M188 331 L214 331 L210 335 L192 335 Z" />
          <rect className="lh-ship-cabin" x="196" y="326" width="9" height="5" rx="1" />
          <path className="lh-ship-mast" d="M201 326 V318" />
          <circle className="lh-ship-light" cx="201" cy="317.5" r="1.5" />
        </g>
        <rect className="lh-sea" x="-1200" y="330" width="3200" height="400" fill="url(#lh-sea)" />
        {/* Deep water on below the frame — on a phone the log scrolls over it, never a hard edge. */}
        <rect className="lh-sea-deep" x="-1200" y="729" width="3200" height="3000" />
        <rect className="lh-haze" x="-1200" y="318" width="3200" height="16" fill="url(#lh-haze)" />
        <g className="lh-glints">
          {[[176, 350], [214, 372], [640, 358], [662, 380], [182, 470], [650, 470], [196, 444], [632, 440]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y} h${12 + (i % 3) * 6}`} style={{ animationDelay: `${-i * 1.3}s` }} />
          ))}
        </g>

        {/* A sailboat off the dock. */}
        <g transform="translate(654 340) scale(0.82)">
          <g className="lh-boat">
            <path className="lh-boat-hull" d="M-20 0 L20 0 L14 9 L-14 9 Z" />
            <path className="lh-boat-sail" d="M0 -2 L0 -32 L16 -4 Z" />
            <path className="lh-boat-sail lh-boat-sail--b" d="M-2 -4 L-2 -24 L-14 -5 Z" />
          </g>
        </g>

        <g className="lh-gulls">
          <path d="M430 96 q7 -7 14 0 q7 -7 14 0" />
          <path d="M560 128 q6 -6 12 0 q6 -6 12 0" />
          <path d="M584 144 q5 -5 10 0 q5 -5 10 0" />
        </g>

        {/* The beam sweeps once the tower holds 100 stones. */}
        {stage === 'beam' && (
          <g className="lh-beam-rig" style={{ transformOrigin: `${CX}px 129px` }}>
            <path d={`M${CX} 129 L${CX + 420} 90 L${CX + 420} 168 Z`} fill="url(#lh-beam)" />
            <path d={`M${CX} 129 L${CX - 420} 90 L${CX - 420} 168 Z`} fill="url(#lh-beam-l)" opacity="0.6" />
          </g>
        )}

        {/* The island: its shadow in the water, rock faces, a sandy rim, the grass on top. */}
        <ellipse className="lh-island-shadow" cx="420" cy="414" rx="236" ry="18" />
        <path className="lh-rock" fill="url(#lh-rock)" d="M206 352 C 214 336, 246 328, 290 330 C 360 322, 460 320, 540 326 C 590 330, 624 338, 634 354 L 650 394 C 600 414, 500 424, 420 422 C 330 424, 260 416, 194 396 Z" />
        <path className="lh-rock-face" d="M194 396 C 206 380, 214 366, 226 356 L 252 362 C 238 378, 230 392, 236 406 Z" />
        <path className="lh-rock-face" d="M302 362 L 330 366 C 324 384, 330 402, 346 418 C 316 418, 292 414, 274 410 C 288 398, 296 382, 302 362 Z" />
        <path className="lh-rock-lit" d="M560 360 L 600 352 C 618 362, 632 378, 640 396 C 616 406, 590 412, 566 414 C 576 396, 574 376, 560 360 Z" />
        <path className="lh-rock-lit" d="M470 366 L 506 364 C 512 384, 508 402, 498 418 C 482 420, 466 420, 452 420 C 466 404, 472 386, 470 366 Z" />
        <path className="lh-sand" d="M212 352 C 222 340, 252 334, 292 336 C 362 328, 460 326, 538 332 C 584 336, 614 343, 626 356 C 576 364, 480 368, 412 368 C 330 369, 262 364, 212 352 Z" />
        <path className="lh-grass" fill="url(#lh-grass)" d="M218 348 C 230 336, 258 330, 296 332 C 364 324, 458 322, 534 328 C 578 332, 606 338, 618 350 C 568 358, 476 362, 410 362 C 334 363, 268 360, 218 348 Z" />
        <path className="lh-grass-rim" d="M226 342 C 244 333, 268 330, 296 331 C 364 323, 458 321, 534 327 C 572 330, 598 336, 612 344" />
        {/* Boulders at the waterline, and the rock Maris the seal naps on. */}
        <g className="lh-boulders">
          <path d="M186 404 C 188 394, 204 392, 210 400 C 214 406, 206 410, 196 410 C 188 410, 185 408, 186 404 Z" />
          <path d="M640 398 C 644 388, 660 388, 664 396 C 666 402, 656 406, 648 405 C 642 404, 639 402, 640 398 Z" />
          <path d="M628 410 C 630 404, 640 403, 643 408 C 645 412, 637 414, 632 414 C 628 414, 627 412, 628 410 Z" />
        </g>
        <g className="lh-seal" transform="translate(198 424)" aria-hidden="true">
          <path className="lh-seal-rock" d="M-26 8 C -24 -4, -8 -8, 6 -6 C 20 -4, 28 2, 28 8 Z" />
          <path className="lh-seal-body" d="M-18 1 C -18 -9, -2 -12, 8 -10 C 15 -9, 17 -14, 22 -14 C 27 -14, 28 -8, 25 -5 C 21 -1, 14 2, 4 3 C -6 4, -18 5, -18 1 Z" />
          <path className="lh-seal-flipper" d="M-18 0 L -25 -5 L -23 2 Z" />
          <path className="lh-seal-eye" d="M21 -11 q1.6 1.2 3.2 0" />
          <circle className="lh-seal-nose" cx="27" cy="-9" r="1" />
          <g className="lh-zz">
            <text x="26" y="-20">z</text>
            <text x="32" y="-28">z</text>
          </g>
        </g>
        <g className="lh-foam">
          <path d="M178 402 q12 -6 24 0 t24 0" />
          <path d="M622 404 q12 -6 24 0 t24 0" />
        </g>

        {/* A stone path from the cottage door to the tower. */}
        <g className="lh-path-stones">
          <ellipse cx="372" cy="356" rx="7" ry="2.6" />
          <ellipse cx="386" cy="358" rx="6" ry="2.4" />
          <ellipse cx="358" cy="353" rx="5.5" ry="2.2" />
        </g>

        {TUFTS.map(([x, y], i) => (
          <path key={`t${i}`} className="lh-tuft" d={`M${x} ${y} q2 -9 4 0 q2 -7 4 0 q2 -10 4 0`} />
        ))}
        {FLOWERS.map(([x, y, c], i) => (
          <g key={`f${i}`} transform={`translate(${x} ${y})`}>
            <line className="lh-flower-stem" x1="0" y1="0" x2="0" y2="-6" />
            <circle cx="0" cy="-7.5" r="2.6" fill={c} />
            <circle cx="0" cy="-7.5" r="1" fill="#ffcb3d" />
          </g>
        ))}

        {/* The dock, out into the water on the right, with a lamp at its foot. */}
        <g className="lh-dock">
          <path className="lh-dock-post" d="M628 352 V384 M656 352 V388 M684 352 V384" />
          <rect className="lh-dock-deck" x="612" y="346" width="90" height="8" rx="2" />
          <path className="lh-dock-gaps" d="M630 346 V354 M648 346 V354 M666 346 V354 M684 346 V354" />
        </g>
        <g className="lh-post-lamp" aria-hidden="true">
          <circle className="lh-night-glow" cx="620" cy="318" r="22" fill="url(#lh-warm)" />
          <path className="lh-post" d="M620 346 V322" />
          <path className="lh-post-arm" d="M620 324 h-1" />
          <rect className="lh-post-cage" x="615.5" y="311" width="9" height="11" rx="2.5" />
          <path className="lh-post-roof" d="M614 312 L620 306.5 L626 312 Z" />
        </g>

        {/* Supplies by the flag: a crate and a barrel. */}
        <g className="lh-supplies" aria-hidden="true">
          <rect className="lh-crate" x="260" y="332" width="30" height="20" rx="3" />
          <path className="lh-crate-slat" d="M260 342 H290 M270 332 V352 M280 332 V352" />
          <rect className="lh-barrel" x="290" y="337" width="13" height="16" rx="4" />
          <path className="lh-barrel-hoop" d="M290 342 H303 M290 348 H303" />
        </g>

        {/* The keeper's cottage — where the logbook is kept. */}
        <g className="lh-obj lh-obj--cottage" role="button" tabIndex={0} aria-label="The keeper’s cottage — your logbook" {...onActivate((el) => onObject('logbook', el))}>
          <rect className="lh-obj-hit" x="362" y="276" width="90" height="82" rx="10" />
          <g className="lh-cottage" transform="translate(372 298)">
            <circle className="lh-night-glow" cx="41" cy="32" r="26" fill="url(#lh-warm)" />
            <rect className="lh-cottage-wall" x="0" y="14" width="70" height="40" rx="3" />
            <rect className="lh-cottage-side" x="52" y="14" width="18" height="40" rx="3" />
            <path className="lh-cottage-roof" fill="url(#lh-roof)" d="M-7 17 L35 -12 L77 17 Z" />
            <path className="lh-cottage-ridge" d="M-7 17 L35 -12 L77 17" />
            <rect className="lh-cottage-chimney" x="50" y="-14" width="10" height="18" rx="1.5" />
            <g className="lh-smoke">
              <circle cx="55" cy="-22" r="4" />
              <circle cx="60" cy="-32" r="5" />
              <circle cx="54" cy="-44" r="6" />
            </g>
            <rect className="lh-cottage-door" x="10" y="30" width="14" height="24" rx="7" />
            <circle className="lh-cottage-knob" cx="21" cy="43" r="1.2" />
            <rect className="lh-cottage-window" x="33" y="25" width="17" height="14" rx="3" />
            <path className="lh-cottage-bars" d="M41.5 25 V39 M33 32 H50" />
            <rect className="lh-cottage-box" x="31" y="39.5" width="21" height="4" rx="1.5" />
            <circle cx="35" cy="38.6" r="1.8" fill="#ff8fb0" />
            <circle cx="41.5" cy="38.2" r="1.8" fill="#ffd25a" />
            <circle cx="48" cy="38.6" r="1.8" fill="#ff8fb0" />
            {/* A gull on the ridge by day. */}
            <g className="lh-perch" transform="translate(30 -12)">
              <ellipse cx="0" cy="-3" rx="5" ry="3.4" fill="#ffffff" />
              <circle cx="4" cy="-6" r="2.4" fill="#ffffff" />
              <path d="M6 -6 l2.6 0.8 l-2.6 0.6 Z" fill="#ffb347" />
              <path d="M-4.5 -3.5 l-3 -1.6 l0.6 3 Z" fill="#a9b4c8" />
            </g>
          </g>
          <Tag x={407} y={LABEL_Y} text="Logbook" scale={tagScale} />
        </g>

        {/* The tower — every stone a kept promise. */}
        <g className="lh-tower">
          <ellipse className="lh-tower-shadow" cx={CX - 22} cy={TOWER_BASE + 4} rx="46" ry="7" />
          <g clipPath="url(#lh-tower-clip)">
            <rect className="lh-tower-base" x={CX - BASE_W / 2} y={TOWER_TOP} width={BASE_W} height={TOWER_BASE - TOWER_TOP} />
            {STONES.map((st) => (
              <polygon
                key={st.i}
                points={st.points}
                className={cn('lh-stone', `lh-stone--${st.band}`, st.i < laid ? 'is-laid' : 'is-open', st.i === fresh && 'is-fresh', showNext && st.i === laid && 'is-next')}
              />
            ))}
            <rect x={CX - BASE_W / 2} y={TOWER_TOP} width={BASE_W} height={TOWER_BASE - TOWER_TOP} fill="url(#lh-cylinder)" pointerEvents="none" />
          </g>
          <path className="lh-tower-rim" d={towerOutline} />
          <path className="lh-tower-door" d={`M${CX - 9} ${TOWER_BASE} L${CX - 9} ${TOWER_BASE - 15} a9 9 0 0 1 18 0 L${CX + 9} ${TOWER_BASE} Z`} />
          <rect className="lh-tower-step" x={CX - 13} y={TOWER_BASE - 1} width="26" height="4" rx="1.5" />
          <circle className="lh-night-glow" cx={CX + 15} cy={TOWER_BASE - 18} r="12" fill="url(#lh-warm)" />
          <rect className="lh-door-lamp" x={CX + 12.5} y={TOWER_BASE - 21} width="5" height="6" rx="1.5" />
          <rect className="lh-tower-window" x={CX - 4} y="262" width="8" height="13" rx="4" />
          <rect className="lh-tower-window" x={CX - 3.5} y="196" width="7" height="11" rx="3.5" />

          {/* The work goes on where the stones stop: a ladder up to that course, and a few
              stones waiting by the door. Gone once the tower is whole. */}
          {laid < STONES.length && (
            <g className="lh-works" aria-hidden="true">
              {front < TOWER_BASE - ROW_H && (
                <g className="lh-ladder">
                  <path d={`M${CX + 30} ${TOWER_BASE + 1} L${CX + 21} ${front - 4} M${CX + 39} ${TOWER_BASE + 1} L${CX + 30} ${front - 4}`} />
                  {Array.from({ length: Math.floor((TOWER_BASE - front) / 7) }, (_, i) => {
                    const y = TOWER_BASE - 4 - i * 7
                    const t = (TOWER_BASE + 1 - y) / (TOWER_BASE + 1 - (front - 4))
                    const x = CX + 30 - 9 * t
                    return <path key={i} className="lh-ladder-rung" d={`M${x.toFixed(1)} ${y} h9`} />
                  })}
                </g>
              )}
              <g className="lh-pile">
                <rect x={CX + 12} y={TOWER_BASE + 4} width="10" height="6" rx="2" className="lh-pile-a" />
                <rect x={CX + 23} y={TOWER_BASE + 4} width="9" height="6" rx="2" className="lh-pile-b" />
                <rect x={CX + 17} y={TOWER_BASE - 1.5} width="10" height="6" rx="2" className="lh-pile-a" />
              </g>
            </g>
          )}

          {/* Gallery, lamp room, dome — drawn pale until 25 stones put them up. */}
          <g className={cn('lh-top', roomBuilt ? 'is-built' : 'is-scaffold', lit && 'is-lit')}>
            {lit && <circle className="lh-lamp-glow" cx={CX} cy="129" r="60" fill="url(#lh-lamp-glow)" />}
            <rect className="lh-gallery" x={CX - 32} y="146" width="64" height="7" rx="2" />
            <path className="lh-gallery-rail" d={`M${CX - 30} 146 V138 M${CX - 15} 146 V138 M${CX} 146 V138 M${CX + 15} 146 V138 M${CX + 30} 146 V138 M${CX - 32} 138 H${CX + 32}`} />
            <rect className="lh-lamp-room" x={CX - 19} y="113" width="38" height="33" rx="3" />
            {roomBuilt && !lit && <path className="lh-glass-shine" d={`M${CX - 14} 141 L${CX - 4} 117 L${CX + 2} 117 L${CX - 8} 141 Z`} />}
            <path className="lh-lamp-bars" d={`M${CX - 6} 113 V146 M${CX + 6} 113 V146`} />
            {lit && <circle className="lh-lamp" cx={CX} cy="129" r="8" />}
            <path className="lh-dome" d={`M${CX - 23} 114 C ${CX - 22} 94, ${CX + 22} 94, ${CX + 23} 114 Z`} />
            {roomBuilt && <path className="lh-dome-shine" d={`M${CX + 6} 101 C ${CX + 12} 102, ${CX + 17} 106, ${CX + 19} 111`} />}
            <path className="lh-finial" d={`M${CX} 97 V85`} />
            <circle className="lh-finial-ball" cx={CX} cy="84" r="3" />
          </g>
        </g>
        <g className="lh-obj lh-obj--tower" role="button" tabIndex={0} aria-label={`The tower — ${kept} kept promise${kept === 1 ? '' : 's'}`} {...onActivate((el) => onObject('tower', el))}>
          <path className="lh-obj-hit" d={`M${CX - 38} ${TOWER_BASE + 6} L${CX - 36} 82 L${CX + 36} 82 L${CX + 38} ${TOWER_BASE + 6} Z`} />
          <Tag x={CX} y={LABEL_Y} text={kept > 0 && tagScale <= 1.1 ? `Tower · ${kept}` : 'Tower'} scale={tagScale} />
        </g>

        {/* Fireflies over the grass at night. */}
        <g className="lh-fireflies" aria-hidden="true">
          {[[252, 316], [298, 296], [446, 300], [470, 318], [596, 312], [366, 292], [580, 286]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.6" style={{ animationDelay: `${-i * 1.1}s` }} />
          ))}
        </g>

        {/* Things to tap. */}
        <g className={cn('lh-obj', flagUp && 'is-due')} role="button" tabIndex={0} aria-label={flagUp ? 'The flag — a check-in is due' : 'The flag — check-ins'} {...onActivate((el) => onObject('flag', el))}>
          <rect className="lh-obj-hit" x="216" y="240" width="40" height="122" rx="10" />
          <path className="lh-flagpole" d="M236 350 V250" />
          <circle className="lh-flag-cap" cx="236" cy="249" r="2.6" />
          <path className={cn('lh-flag', flagUp ? 'is-up' : 'is-down')} d={flagUp ? 'M237 253 L264 261 L237 271 Z' : 'M237 322 L256 328 L237 336 Z'} />
          <Tag x={236} y={LABEL_Y} text="Check-in" due={flagUp} scale={tagScale} />
        </g>

        <g className={cn('lh-obj', reviewDue && 'is-due')} role="button" tabIndex={0} aria-label={reviewDue ? 'The bench — this week’s review is ready' : 'The bench — the weekly review'} {...onActivate((el) => onObject('bench', el))}>
          <rect className="lh-obj-hit" x="458" y="318" width="50" height="46" rx="10" />
          {reviewDue && <circle className="lh-due-glow" cx="483" cy="340" r="28" fill="url(#lh-warm)" />}
          <rect className="lh-bench-seat" x="466" y="337" width="34" height="5" rx="2" />
          <path className="lh-bench-legs" d="M470 342 V352 M496 342 V352 M468 337 V326 H498 V337" />
          <Tag x={483} y={LABEL_Y} text="Review" due={reviewDue} scale={tagScale} />
        </g>

        <g className={cn('lh-obj lh-bottle', bottleGlint && 'is-due')} role="button" tabIndex={0} aria-label="A bottle washed up on the sand — your letters" {...onActivate((el) => onObject('bottle', el))}>
          <rect className="lh-obj-hit" x="570" y="336" width="46" height="30" rx="10" />
          {/* Washed up and resting on the sand — it doesn't move. */}
          <ellipse className="lh-bottle-shadow" cx="593" cy="358" rx="16" ry="2" />
          <g transform="translate(592 353) rotate(-9)">
            <rect className="lh-bottle-glass" x="-15" y="-5" width="22" height="10" rx="5" />
            <rect className="lh-bottle-glass" x="5" y="-2.6" width="8" height="5.2" rx="1.6" />
            <rect className="lh-bottle-scroll" x="-11" y="-2.5" width="12" height="5" rx="1.6" />
            <path className="lh-bottle-shine" d="M-11 -3.2 H1" />
            <rect className="lh-bottle-cork" x="12.4" y="-2.9" width="3.6" height="5.8" rx="1.1" />
          </g>
          <Tag x={592} y={LABEL_Y} text="Letters" due={bottleGlint} scale={tagScale} />
        </g>

        {/* Today's lights on the water. */}
        {lights && <Lights lights={lights} label={lightsLabel} scale={tagScale} onLight={onLight} />}

        {/* Pip, by the bench, under open sky. Tap him for the next thing on his mind. */}
        <g
          className="lh-pip-talk"
          role="button"
          tabIndex={0}
          aria-label={`${buddyName} — tap to hear what else is on ${buddyName}’s mind`}
          data-sound="nudge"
          {...onActivate(() => talkTo())}
        >
          <rect className="lh-obj-hit" x={PIP.x + 4} y={PIP.y - 6} width={PIP.size - 8} height={PIP.size + 12} rx="20" />
          <g className="lh-pip-hop" key={poked}>
            <Pip mood={pip.mood} size={PIP.size} x={PIP.x} y={PIP.y} className="lh-pip" wear={wear} stage={growth} name={buddyName} />
          </g>
        </g>
      </svg>
    </section>
  )
}

export { LighthouseScene }
