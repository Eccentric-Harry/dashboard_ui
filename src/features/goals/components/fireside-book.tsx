// Fireside Tales: tap the campfire and Pip reads the week so far as a little storybook
// (fireside-tales.ts writes it). One page at a time — arrows, the page buttons, or a
// swipe — with the lanterns lit that day drawn as small glowing icons on the page, and
// your own check-in notes quoted back in your words.

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import type { GoalProgressView } from '@/types/goals'
import { cn } from '@/lib/utils'
import { campSound } from '../camp-sound'
import { weekTale, type TalePage } from '../fireside-tales'
import { goalColor } from '../goal-palette'
import { CampSheet } from './camp-sheet'
import { GoalIcon } from './goal-icon'

type FiresideBookProps = {
  open: boolean
  origin: HTMLElement | null
  goals: GoalProgressView[]
  today: string
  weekStart: string
  buddyName: string
  onClose: () => void
}

function FiresideBook({ open, origin, goals, today, weekStart, buddyName, onClose }: FiresideBookProps) {
  const tale = useMemo(() => weekTale(goals, today, weekStart, buddyName), [goals, today, weekStart, buddyName])
  const [page, setPage] = useState(0)
  const [turn, setTurn] = useState<'next' | 'prev'>('next')
  const swipe = useRef<number | null>(null)
  const last = tale.pages.length - 1
  const at = Math.min(page, last)
  const current = tale.pages[at]
  const byId = useMemo(() => new Map(goals.map((g) => [g.goal.id, g])), [goals])

  // Every opening starts at the cover.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setPage(0)
  }

  const go = (to: number) => {
    const next = Math.max(0, Math.min(last, to))
    if (next === at) return
    setTurn(next > at ? 'next' : 'prev')
    setPage(next)
    campSound.play('page')
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(at + 1)
      if (e.key === 'ArrowLeft') go(at - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="fs-title" width={460} className="fs-sheet">
      <div
        className="fs"
        onPointerDown={(e) => (swipe.current = e.clientX)}
        onPointerUp={(e) => {
          if (swipe.current == null) return
          const dx = e.clientX - swipe.current
          swipe.current = null
          if (Math.abs(dx) > 50) go(at + (dx < 0 ? 1 : -1))
        }}
      >
        <p className="fs-kicker">
          <Flame size={12} strokeWidth={2.8} aria-hidden="true" /> Fireside tales · told by {buddyName}
        </p>
        <h2 id="fs-title" className="sr-only">
          {tale.title}
        </h2>

        <article key={at} className={cn('fs-page', `fs-page--${current.kind}`, `is-turn-${turn}`)} aria-live="polite">
          <h3>{current.heading}</h3>
          {current.lit.length > 0 && (
            <div className="fs-lit" aria-hidden="true">
              {current.lit.map((id) => {
                const view = byId.get(id)
                return view ? (
                  <span key={id} data-color={goalColor(view.goal)}>
                    <GoalIcon icon={view.goal.icon} size={16} strokeWidth={2.4} />
                  </span>
                ) : null
              })}
            </div>
          )}
          {current.kind === 'cover' && <CoverArt />}
          {current.lines.map((line, i) => (
            <p key={i} className="fs-line" style={{ animationDelay: `${0.12 + i * 0.22}s` }}>
              {line}
            </p>
          ))}
          {current.quote && (
            <blockquote className="fs-quote">
              <span>You wrote</span>“{current.quote}”
            </blockquote>
          )}
          {current.kind !== 'cover' && <SpotArt kind={current.kind} blank={current.lit.length === 0} />}
        </article>

        <nav className="fs-nav" aria-label="Pages">
          <button type="button" className="fs-turn" data-sound="none" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous page">
            <ChevronLeft size={18} strokeWidth={2.8} />
          </button>
          <ol className="fs-dots">
            {tale.pages.map((p, i) => (
              <li key={i}>
                <button
                  type="button"
                  data-sound="none"
                  className={cn(i === at && 'is-here', p.lit.length > 0 && 'is-lit')}
                  onClick={() => go(i)}
                  aria-label={`Page ${i + 1}: ${p.heading}`}
                  aria-current={i === at ? 'page' : undefined}
                />
              </li>
            ))}
          </ol>
          <button type="button" className="fs-turn" data-sound="none" onClick={() => go(at + 1)} disabled={at === last} aria-label="Next page">
            <ChevronRight size={18} strokeWidth={2.8} />
          </button>
        </nav>
      </div>
    </CampSheet>
  )
}

/** A storybook spot illustration in the page's corner: a lantern for a lit day, a sleepy
 *  moon for a rest, a quill for today's blank page, a little row of stars for the end. */
function SpotArt({ kind, blank }: { kind: TalePage['kind']; blank: boolean }) {
  if (kind === 'rest') {
    return (
      <svg className="fs-spot" viewBox="0 0 90 60" aria-hidden="true">
        <path d="M54 8 a22 22 0 1 0 22 30 a17 17 0 1 1 -22 -30 Z" fill="#ffe7a3" />
        <path d="M38 34 q3 2 6 0" stroke="#c9a24a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <text x="70" y="18" className="fs-spot-z">z</text>
        <text x="80" y="9" className="fs-spot-z fs-spot-z--small">z</text>
        <circle cx="16" cy="14" r="1.6" fill="#e7d6bd" />
        <circle cx="26" cy="44" r="1.2" fill="#e7d6bd" />
      </svg>
    )
  }
  if (kind === 'today' && blank) {
    return (
      <svg className="fs-spot" viewBox="0 0 90 60" aria-hidden="true">
        <rect x="18" y="38" width="22" height="16" rx="4" fill="#5d4a5f" />
        <rect x="21" y="34" width="16" height="6" rx="2" fill="#7a6f8c" />
        <path className="fs-spot-quill" d="M30 36 C 40 22, 58 8, 80 4 C 70 14, 54 28, 32 38 Z" fill="#fffaf0" stroke="#d9c6a8" strokeWidth="1.4" />
        <path d="M34 34 L 70 10" stroke="#d9c6a8" strokeWidth="1" />
      </svg>
    )
  }
  if (kind === 'end') {
    return (
      <svg className="fs-spot fs-spot--end" viewBox="0 0 90 60" aria-hidden="true">
        {[18, 45, 72].map((x, i) => (
          <path
            key={x}
            className="fs-spot-star"
            style={{ animationDelay: `${i * 0.3}s` }}
            transform={`translate(${x} ${i === 1 ? 24 : 32})`}
            d="M0 -10 L3 -3.2 10 -3 4.6 1.8 6.2 9 0 5 -6.2 9 -4.6 1.8 -10 -3 -3 -3.2 Z"
            fill="#ffcb3d"
          />
        ))}
      </svg>
    )
  }
  return (
    <svg className="fs-spot" viewBox="0 0 90 60" aria-hidden="true">
      <circle cx="58" cy="30" r="22" fill="rgba(255,190,80,0.25)" />
      <line x1="58" y1="0" x2="58" y2="8" stroke="#b9a68a" strokeWidth="1.4" />
      <rect x="46" y="8" width="24" height="4" rx="2" fill="#5d4a5f" />
      <path d="M44 12 C 40 22, 40 38, 46 46 L 70 46 C 76 38, 76 22, 72 12 Z" fill="#ffd27a" stroke="#e0a43a" strokeWidth="1.4" />
      <path d="M52 12 C 50 24, 50 36, 52 46 M64 12 C 66 24, 66 36, 64 46" stroke="#e0a43a" strokeWidth="1" fill="none" />
      <rect x="48" y="46" width="20" height="4" rx="2" fill="#5d4a5f" />
      <line x1="58" y1="50" x2="58" y2="57" stroke="#ff6f95" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** The cover's little scene: the fire, two logs, sparks going up. */
function CoverArt() {
  return (
    <svg className="fs-cover-art" viewBox="0 0 160 70" aria-hidden="true">
      <ellipse cx="80" cy="62" rx="54" ry="6" fill="rgba(42,33,64,0.08)" />
      <circle className="fs-cover-glow" cx="80" cy="44" r="28" />
      <g className="fs-cover-flame">
        <path d="M80 12 C 94 26, 96 40, 90 50 C 86 56, 74 56, 70 50 C 64 40, 66 26, 80 12 Z" fill="#ff9f5a" />
        <path d="M80 30 C 87 37, 88 44, 84 50 C 82 53, 78 53, 76 50 C 72 44, 73 37, 80 30 Z" fill="#ffd84d" />
      </g>
      <rect x="58" y="52" width="44" height="9" rx="4.5" fill="#8f5a33" transform="rotate(10 80 56)" />
      <rect x="58" y="52" width="44" height="9" rx="4.5" fill="#b97a48" transform="rotate(-10 80 56)" />
      {[
        [70, 18, 0],
        [92, 10, 0.6],
        [84, 4, 1.2],
      ].map(([x, y, d]) => (
        <circle key={`${x}-${y}`} className="fs-cover-spark" cx={x} cy={y} r="1.8" style={{ animationDelay: `${d}s` }} />
      ))}
    </svg>
  )
}

export { FiresideBook }
