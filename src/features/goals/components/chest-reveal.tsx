import { useEffect, useRef, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import type { CampChestItem, CampChestOpenResult } from '@/types/goals'
import { cn } from '@/lib/utils'
import { campSound } from '../camp-sound'
import { flySparks } from '../spark-fly'
import { StickerArt } from './sticker-art'
import { GoalIcon } from './goal-icon'

type ChestRevealProps = {
  open: boolean
  /** What's inside right now — shown as "N kept weeks inside" before it opens. */
  contents: CampChestItem[]
  /** Opens it on the server; resolves with what came out (null on an error). */
  onOpen: () => Promise<CampChestOpenResult | null>
  /** Puts the result into the store — called once the sparks have landed in the counter. */
  onSettled: (result: CampChestOpenResult) => void
  onClose: () => void
}

type Stage = 'ready' | 'shaking' | 'open' | 'empty'


const SHAKE_MS = 900
const STEP_MS = 720

function ChestArt({ open }: { open: boolean }) {
  return (
    <svg className={cn('cr-chest', open && 'is-open')} viewBox="0 0 200 170" aria-hidden="true">
      <ellipse cx="100" cy="162" rx="78" ry="7" fill="rgba(0,0,0,0.25)" />
      <g className="cr-glow">
        <ellipse cx="100" cy="78" rx="70" ry="22" fill="#ffe08a" />
      </g>
      {/* Base */}
      <rect x="26" y="78" width="148" height="80" rx="12" fill="#c98e57" />
      <rect x="26" y="78" width="148" height="80" rx="12" fill="url(#cr-wood)" opacity="0.4" />
      <rect x="26" y="140" width="148" height="18" rx="9" fill="#9c6536" />
      <rect x="44" y="78" width="14" height="80" fill="#ffcb3d" />
      <rect x="142" y="78" width="14" height="80" fill="#ffcb3d" />
      <rect x="84" y="92" width="32" height="30" rx="7" fill="#ffcb3d" stroke="#dfa412" strokeWidth="3" />
      <circle cx="100" cy="104" r="4.5" fill="#6e4a33" />
      <rect x="98" y="104" width="4" height="10" rx="2" fill="#6e4a33" />
      {/* Lid */}
      <g className="cr-lid">
        <path d="M26 82 L26 62 C 26 30, 174 30, 174 62 L174 82 Z" fill="#d99c63" />
        <path d="M26 82 L26 72 L174 72 L174 82 Z" fill="#9c6536" />
        <path d="M44 82 L44 40 C 48 37, 54 36, 58 35 L58 82 Z" fill="#ffcb3d" />
        <path d="M142 82 L142 35 C 146 36, 152 37, 156 40 L156 82 Z" fill="#ffcb3d" />
        <path d="M70 44 C 90 38, 110 38, 130 44" fill="none" stroke="#f2c08a" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      </g>
      <defs>
        <linearGradient id="cr-wood" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/**
 * The camp chest, opened. Tapping it shakes it (anticipation), the lid flies up and the
 * light comes out, then everything inside is shown one at a time — a sticker card for
 * each new sticker, then each goal's kept weeks — and finally the sparks, which fly up
 * into the counter when you collect them. No chance anywhere: it holds exactly what the
 * weeks earned, and the opening is pure theatre.
 */
function ChestReveal({ open, contents, onOpen, onSettled, onClose }: ChestRevealProps) {
  const [stage, setStage] = useState<Stage>('ready')
  const [result, setResult] = useState<CampChestOpenResult | null>(null)
  const [shown, setShown] = useState(0)
  const [collecting, setCollecting] = useState(false)
  const collectRef = useRef<HTMLButtonElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStage('ready')
    setResult(null)
    setShown(0)
    setCollecting(false)
    rootRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
  }, [open])

  // One card per goal: its new sticker (the rarest, if several) and its kept weeks.
  const reveals: CampChestItem[] = result?.opened ?? []
  const count = reveals.length
  const nextHasSticker = (reveals[shown]?.stickers.length ?? 0) > 0

  // Step through what came out.
  useEffect(() => {
    if (stage !== 'open' || shown >= count) return
    const t = window.setTimeout(() => {
      setShown((n) => n + 1)
      campSound.play(nextHasSticker ? 'sticker' : 'sparkle')
    }, shown === 0 ? 650 : STEP_MS)
    return () => window.clearTimeout(t)
  }, [stage, shown, count, nextHasSticker])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !collecting) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, collecting, onClose])

  if (!open) return null

  const weeksInside = contents.reduce((n, c) => n + c.weeks, 0)
  const stickersInside = contents.reduce((n, c) => n + c.stickers.length, 0)

  const start = async () => {
    if (stage !== 'ready') return
    setStage('shaking')
    campSound.play('chest-shake')
    const [res] = await Promise.all([onOpen(), new Promise((r) => window.setTimeout(r, SHAKE_MS))])
    if (!res || res.opened.length === 0) {
      setStage('empty')
      if (res) onSettled(res)
      return
    }
    setResult(res)
    setStage('open')
    campSound.play('chest-open')
  }

  const collect = async () => {
    if (!result || collecting) return
    setCollecting(true)
    await flySparks(collectRef.current, result.sparks)
    onSettled(result)
    onClose()
  }

  const allShown = stage === 'open' && shown >= count
  const current = stage === 'open' ? reveals.slice(0, shown) : []

  return (
    <div ref={rootRef} className={cn('cr', `cr--${stage}`)} role="dialog" aria-modal="true" aria-labelledby="cr-title">
      <div className="cr-scrim" onClick={stage === 'ready' || stage === 'empty' ? onClose : undefined} />
      <div className="cr-rays" aria-hidden="true" />
      <button type="button" className="cr-close" onClick={onClose} disabled={collecting} aria-label="Close">
        <X size={18} strokeWidth={2.8} />
      </button>

      <div className="cr-stage">
        <h2 id="cr-title" className="cr-title">
          {stage === 'ready' && 'The camp chest'}
          {stage === 'shaking' && 'Something’s rattling…'}
          {stage === 'open' && (allShown ? 'All yours!' : 'Look what’s inside!')}
          {stage === 'empty' && 'Already opened'}
        </h2>
        <p className="cr-sub">
          {stage === 'ready' &&
            `${weeksInside} kept ${weeksInside === 1 ? 'week' : 'weeks'} inside${stickersInside ? ` · ${stickersInside} new ${stickersInside === 1 ? 'sticker' : 'stickers'}` : ''}`}
          {stage === 'empty' && 'Another tab got to it first — the sparks are already in your counter.'}
        </p>

        <button
          type="button"
          className="cr-chest-btn"
          onClick={() => void start()}
          disabled={stage !== 'ready'}
          aria-label="Open the chest"
          data-autofocus
        >
          <ChestArt open={stage === 'open'} />
        </button>
        {stage === 'ready' && <p className="cr-hint">Tap to open</p>}

        {stage === 'open' && (
          <ul className="cr-loot" aria-live="polite">
            {current.map((item, i) => {
              const best = item.stickers.at(-1)
              return (
                <li key={item.goalId} className={cn('cr-card', best && 'cr-card--sticker')} data-color={item.color ?? 'tangerine'} style={{ ['--i' as string]: i }}>
                  {best ? (
                    <StickerArt weeks={best.weeks} icon={item.icon} size={84} />
                  ) : (
                    <span className="cr-card-badge">
                      <GoalIcon icon={item.icon} size={22} strokeWidth={2.4} />
                    </span>
                  )}
                  <strong>{item.title}</strong>
                  <small>
                    {item.weeks} kept {item.weeks === 1 ? 'week' : 'weeks'}
                    {item.stickers.length > 0 && ` · ${item.stickers.map((st) => st.name).join(', ')}`}
                  </small>
                  <b className="cr-card-sparks">+{item.sparks} ✦</b>
                </li>
              )
            })}
          </ul>
        )}

        {allShown && result && (
          <button ref={collectRef} type="button" className="cr-collect" onClick={() => void collect()} disabled={collecting}>
            <Sparkles size={18} strokeWidth={2.6} /> Collect {result.sparks} sparks
          </button>
        )}
        {stage === 'empty' && (
          <button type="button" className="cr-collect" onClick={onClose}>
            Okay
          </button>
        )}
      </div>
    </div>
  )
}

export { ChestReveal }
