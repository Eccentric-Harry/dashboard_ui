import { cn } from '@/lib/utils'

type CampLighthouseProps = {
  /** Day of the program (≤ 0 before it starts); null when no program has begun. */
  day: number | null
  length: number
  /** Kept promises so far — the tower's light grows with them. */
  kept: number
  onOpen: (el: HTMLElement) => void
}

/**
 * The Lighthouse on the camp's horizon — the way into the 90-day program. A headland of its
 * own with the sea at its foot and the keeper's cottage beside it, big enough to read as a
 * place you can go. Its tag says which day it is; at night (and always, once the tower holds
 * 50 kept promises) its lamp is lit and a beam sweeps the sky.
 */
function CampLighthouse({ day, length, kept, onOpen }: CampLighthouseProps) {
  const label =
    day == null ? '90 days to 23' : day < 1 ? 'Day 1 soon' : day > length ? `${length} days` : `Day ${day} of ${length}`
  return (
    <button
      type="button"
      className={cn('camp-lighthouse', kept >= 50 && 'is-lit')}
      onClick={(e) => onOpen(e.currentTarget)}
      aria-label={day == null ? 'The lighthouse on the horizon — begin 90 days to 23' : `The lighthouse — ${label} of ${length}, ${kept} kept promises`}
    >
      <svg viewBox="0 0 120 150" aria-hidden="true">
        {/* A beam that sweeps the night sky — and always once the tower is lit. */}
        <defs>
          <linearGradient id="camp-lh-beam-r" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#fff3b0" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#fff3b0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="camp-lh-beam">
          <path d="M60 40 L270 22 L270 58 Z" fill="url(#camp-lh-beam-r)" />
        </g>
        <circle className="camp-lh-glow" cx="60" cy="40" r="30" />
        {/* Its own patch of sea and a rocky headland. */}
        <path className="camp-lh-sea" d="M0 128 C 20 124, 40 126, 60 125 C 82 124, 100 126, 120 128 V150 H0 Z" />
        <path className="camp-lh-wave" d="M8 138 q6 -3 12 0 t12 0 M86 140 q6 -3 12 0 t12 0" />
        <path className="camp-lh-land" d="M10 132 C 16 116, 34 110, 52 110 C 72 109, 96 112, 108 132 Z" />
        <path className="camp-lh-grass" d="M20 120 C 30 112, 44 110, 58 110 C 74 110, 90 112, 100 122 C 86 118, 74 117, 60 117 C 44 117, 30 118, 20 120 Z" />
        {/* The keeper's cottage at its foot. */}
        <rect className="camp-lh-cottage" x="74" y="102" width="20" height="13" rx="1.5" />
        <path className="camp-lh-roof" d="M71.5 103.5 L84 94 L96.5 103.5 Z" />
        <rect className="camp-lh-win" x="84" y="105.5" width="5" height="4.5" rx="1" />
        {/* The tower: candy stripes, two windows, gallery, lamp room, dome. */}
        <path className="camp-lh-tower" d="M50 114 L54 52 L66 52 L70 114 Z" />
        <path className="camp-lh-stripe" d="M52.4 92 L53.3 78 L66.7 78 L67.6 92 Z" />
        <path className="camp-lh-stripe" d="M54 68 L54.5 60 L65.5 60 L66 68 Z" />
        <path className="camp-lh-stripe" d="M50.8 110 L51.2 104 L68.8 104 L69.2 110 Z" />
        <rect className="camp-lh-win" x="58" y="70" width="4" height="6" rx="2" />
        <rect className="camp-lh-win" x="58" y="94" width="4" height="6" rx="2" />
        <path className="camp-lh-door" d="M57 114 V108 a3 3 0 0 1 6 0 V114 Z" />
        <rect className="camp-lh-gallery" x="50" y="49" width="20" height="4" rx="1" />
        <rect className="camp-lh-lamp" x="53.5" y="36" width="13" height="13" rx="2" />
        <path className="camp-lh-dome" d="M52 37 C 52.5 27, 67.5 27, 68 37 Z" />
        <path className="camp-lh-pole" d="M60 28 V22" />
        <circle className="camp-lh-ball" cx="60" cy="21" r="1.8" />
        <path className="camp-lh-pole" d="M30 116 V86" />
        <path className="camp-lh-flag" d="M30.5 87 L43 91 L30.5 95 Z" />
      </svg>
      <span className="camp-lighthouse-flag">
        <strong>Lighthouse</strong>
        <small>{label}</small>
      </span>
    </button>
  )
}

export { CampLighthouse }
