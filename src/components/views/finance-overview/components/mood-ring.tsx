// Budget mood ring — the gauge that replaced the Monthly Budget tile's flat
// 4px meter.
//
// A bar reads as "loading"; a ring reads as "a proportion of a whole", which is
// what a budget actually is. Home and nutrition both already use arcs for this
// (the black gauge arc, the macro rings), so this keeps the vocabulary shared.
//
// The sweep is a CSS transition on stroke-dashoffset rather than a keyframe, so
// it also animates *between* values — edit the budget in the modal and the ring
// travels to its new position instead of snapping.

type MoodTone = 'good' | 'watch' | 'over'

type MoodRingProps = {
  /** Fraction of budget consumed. May exceed 1 when overspent. */
  progress: number
  tone: MoodTone
  /** Rendered inside the ring. Defaults to the rounded percentage. */
  label?: string
  size?: number
}

function MoodRing({ progress, tone, label, size = 44 }: MoodRingProps) {
  const stroke = 3.4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  // Clamped so an overspent month fills the ring rather than wrapping past the
  // start and under-reporting — the tone and the tile's "over" figure carry the
  // magnitude beyond 100%.
  const clamped = Math.min(1, Math.max(0, progress))
  const offset = circumference * (1 - clamped)
  const pct = Math.round(progress * 100)

  return (
    <span
      className="fin-ring"
      style={{ '--fin-ring-size': `${size}px` } as React.CSSProperties}
      role="img"
      aria-label={`${pct}% of budget used`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="fin-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
        />
        <circle
          className={`fin-ring-fill is-${tone}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <b className="fin-ring-label">{label ?? `${pct}%`}</b>
    </span>
  )
}

export { MoodRing }
export type { MoodTone }
