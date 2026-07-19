import { cn } from '../../lib/utils'

export type StreakFlameVariant = 'live' | 'at-risk' | 'frozen' | 'dormant'

type StreakFlameProps = {
  count: number
  variant?: StreakFlameVariant
  /** Extra context for screen readers, e.g. "streak at risk". */
  title?: string
}

const VARIANT_LABEL: Record<StreakFlameVariant, string> = {
  live: 'day streak',
  'at-risk': 'day streak, at risk today',
  frozen: 'day streak, held by a freeze',
  dormant: 'day streak',
}

/** SVG flame + count pill. The one flame glyph the copy rules allow. */
function StreakFlame({ count, variant = 'live', title }: StreakFlameProps) {
  return (
    <span
      className={cn('game-streak-flame', variant !== 'live' && `game-streak-flame--${variant}`)}
      role="img"
      aria-label={title ?? `${count} ${VARIANT_LABEL[variant]}`}
      title={title}
    >
      <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
        <path
          d="M6 0.5 C6.4 3 8.8 4.2 9.9 6.4 C11 8.6 10.4 11.3 8.2 12.7 C6.9 13.5 5.1 13.5 3.8 12.7 C1.6 11.3 1 8.6 2.1 6.4 C2.7 5.2 3.6 4.4 4.2 3.2 C4.6 2.4 4.9 1.5 6 0.5 Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M6 5.5 C6.2 6.8 7.4 7.4 7.9 8.5 C8.4 9.6 8.1 10.9 7 11.6 C6.4 12 5.6 12 5 11.6 C3.9 10.9 3.6 9.6 4.1 8.5 C4.4 7.9 4.9 7.4 5.2 6.8 C5.5 6.4 5.8 6 6 5.5 Z"
          fill="#fff"
          opacity="0.55"
        />
      </svg>
      {count}
    </span>
  )
}

export { StreakFlame }
