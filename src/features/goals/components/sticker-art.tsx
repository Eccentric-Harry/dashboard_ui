import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { GoalIcon } from './goal-icon'

/** Sticker tiers by lifetime kept weeks, each with its own die-cut shape (like Apple's awards). */
export type StickerShape = 'circle' | 'flower' | 'hex' | 'shield' | 'star'

const SHAPE_BY_WEEKS: Record<number, StickerShape> = { 1: 'circle', 4: 'flower', 12: 'hex', 26: 'shield', 52: 'star' }

const FLOWER = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2
  return [50 + Math.cos(a) * 27, 50 + Math.sin(a) * 27] as const
})

/** The shape's outline in a 100 × 100 box; drawn twice — a fat white cut line, then the colour. */
function Outline({ shape, inset }: { shape: StickerShape; inset: boolean }) {
  const pad = inset ? 0 : 6
  switch (shape) {
    case 'circle':
      return <circle cx="50" cy="50" r={40 + pad} />
    case 'flower':
      return (
        <>
          {FLOWER.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={17 + pad} />
          ))}
          <circle cx="50" cy="50" r={30 + pad} />
        </>
      )
    case 'hex':
      return (
        <path
          d="M50 8 L86 29 L86 71 L50 92 L14 71 L14 29 Z"
          strokeWidth={inset ? 8 : 20}
          strokeLinejoin="round"
        />
      )
    case 'shield':
      return (
        <path
          d="M50 8 C 62 14, 76 16, 86 16 C 88 52, 76 78, 50 92 C 24 78, 12 52, 14 16 C 24 16, 38 14, 50 8 Z"
          strokeWidth={inset ? 6 : 18}
          strokeLinejoin="round"
        />
      )
    case 'star':
      return (
        <path
          d="M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z"
          strokeWidth={inset ? 8 : 20}
          strokeLinejoin="round"
        />
      )
  }
}

type StickerArtProps = {
  /** The tier — 1, 4, 12, 26 or 52 kept weeks. */
  weeks: number
  icon?: string | null
  size?: number
  locked?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * A die-cut sticker: a white cut line around a candy shape with the goal's icon. It takes
 * its colour from the nearest `data-color`. The rarer tiers (a season and up) get a
 * holographic shine that sweeps across.
 */
function StickerArt({ weeks, icon, size = 72, locked, className, style }: StickerArtProps) {
  const shape = SHAPE_BY_WEEKS[weeks] ?? 'circle'
  const shiny = !locked && weeks >= 12
  const clipId = `sticker-clip-${shape}`
  return (
    <svg
      className={cn('sticker-art', `sticker-art--${shape}`, locked && 'is-locked', shiny && 'is-shiny', className)}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <Outline shape={shape} inset />
        </clipPath>
      </defs>
      <g className="sticker-art-cut">
        <Outline shape={shape} inset={false} />
      </g>
      <g className="sticker-art-face">
        <Outline shape={shape} inset />
      </g>
      <g clipPath={`url(#${clipId})`}>
        <ellipse className="sticker-art-gloss" cx="34" cy="26" rx="26" ry="12" transform="rotate(-24 34 26)" />
        {shiny && <rect className="sticker-art-holo" x="-60" y="-10" width="40" height="120" transform="rotate(20)" />}
      </g>
      {locked ? (
        <path className="sticker-art-lock" d="M41 50 v-6 a9 9 0 0 1 18 0 v6 M37 50 h26 v16 h-26 Z" />
      ) : (
        <GoalIcon icon={icon} x={30} y={30} size={40} strokeWidth={2.4} className="sticker-art-icon" />
      )}
    </svg>
  )
}

export { StickerArt }
