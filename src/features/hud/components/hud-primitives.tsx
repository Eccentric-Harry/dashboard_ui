// The HUD's vocabulary: small cards in the canvas beside the stage, each answering
// one question at a glance (Apple's widget rule of thumb: under ten seconds). A card
// that points somewhere is a button — a click opens the route it summarises.

import type { CSSProperties, ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'

export type HudTone = 'good' | 'watch' | 'bad' | 'idle'

interface HudCardProps {
  label: string
  meta?: ReactNode
  /** Takes the column's spare height (one per column), so a tall window has no dead air below. */
  grow?: boolean
  /** Opens the route this card summarises. */
  onOpen?: () => void
  /** Accessible name for the open action, e.g. "Open calendar". */
  openLabel?: string
  className?: string
  children: ReactNode
}

export function HudCard({ label, meta, grow = false, onOpen, openLabel, className, children }: HudCardProps) {
  const classes = `hud-panel${grow ? ' hud-panel--grow' : ''}${onOpen ? ' is-link' : ''}${className ? ` ${className}` : ''}`
  const head = (
    <header className="hud-panel-head">
      <span className="hud-eyebrow">{label}</span>
      {meta !== undefined && <span className="hud-panel-meta">{meta}</span>}
      {onOpen && <ArrowUpRight className="hud-open" size={12} strokeWidth={2.4} aria-hidden="true" />}
    </header>
  )
  if (!onOpen) {
    return (
      <section className={classes}>
        {head}
        {children}
      </section>
    )
  }
  // A div with role=button rather than a <button>: cards may hold their own
  // controls (pause/resume), and buttons can't nest.
  return (
    <section
      className={classes}
      role="button"
      tabIndex={0}
      aria-label={openLabel}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      {head}
      {children}
    </section>
  )
}

/** A capsule that fills left to right. */
export function HudMeter({ ratio, tone = 'idle', hue }: { ratio: number; tone?: HudTone; hue?: string }) {
  const clamped = Math.min(1, Math.max(0, ratio))
  return (
    <span className="hud-meter" role="presentation">
      <span
        className={`hud-meter-fill hud-tone-${tone}`}
        style={{ width: `${clamped * 100}%`, ...(hue ? ({ '--hud-hue': hue } as CSSProperties) : null) }}
      />
    </span>
  )
}

export interface HudRingSpec {
  key: string
  ratio: number
  hue: string
}

/**
 * Concentric progress rings, outermost first — the Activity-rings reading of a day
 * (calories, protein, water). A ring past its goal stays full rather than lapping.
 */
export function HudRings({ rings, size = 120 }: { rings: HudRingSpec[]; size?: number }) {
  const stroke = Math.max(7, Math.round(size / 11))
  const gap = 3
  return (
    // Sized by CSS (it scales to the card's spare height); `size` only sets the geometry.
    <svg className="hud-rings" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {rings.map((ring, i) => {
        const r = size / 2 - stroke / 2 - i * (stroke + gap)
        if (r <= stroke / 2) return null
        const c = 2 * Math.PI * r
        const p = Math.min(1, Math.max(0, ring.ratio))
        return (
          <g key={ring.key} style={{ '--hud-hue': ring.hue } as CSSProperties} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle className="hud-ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
            {p > 0 && (
              <circle
                className="hud-ring-fill"
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - p)}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}
