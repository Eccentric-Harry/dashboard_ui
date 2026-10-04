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
 * The Lighthouse on the camp's horizon — the way into the 90-day program. Far away and small,
 * on its own headland; its little flag says which day it is, and once the tower holds 50
 * kept promises its lamp is lit from here too.
 */
function CampLighthouse({ day, length, kept, onOpen }: CampLighthouseProps) {
  const label =
    day == null ? '90 days' : day < 1 ? 'Day 1 soon' : day > length ? `${length} days` : `Day ${day}`
  return (
    <button
      type="button"
      className={cn('camp-lighthouse', kept >= 50 && 'is-lit')}
      onClick={(e) => onOpen(e.currentTarget)}
      aria-label={day == null ? 'The lighthouse on the horizon — begin 90 days to 23' : `The lighthouse — ${label} of ${length}, ${kept} kept promises`}
    >
      <svg viewBox="0 0 64 104" aria-hidden="true">
        <circle className="camp-lh-glow" cx="32" cy="22" r="20" />
        <path className="camp-lh-land" d="M2 100 C 10 88, 22 86, 32 86 C 44 86, 56 90, 62 100 Z" />
        <path className="camp-lh-tower" d="M24 88 L27 34 L37 34 L40 88 Z" />
        <path className="camp-lh-stripe" d="M25.4 66 L26.2 52 L37.8 52 L38.6 66 Z" />
        <path className="camp-lh-stripe" d="M24.4 84 L25 76 L39 76 L39.6 84 Z" />
        <rect className="camp-lh-gallery" x="24" y="31" width="16" height="4" rx="1" />
        <rect className="camp-lh-lamp" x="27" y="20" width="10" height="11" rx="1.5" />
        <path className="camp-lh-dome" d="M25.5 21 C 26 13, 38 13, 38.5 21 Z" />
        <path className="camp-lh-pole" d="M45 86 V58" />
        <path className="camp-lh-flag" d="M45.5 59 L58 63 L45.5 67 Z" />
      </svg>
      <span className="camp-lighthouse-flag">{label}</span>
    </button>
  )
}

export { CampLighthouse }
