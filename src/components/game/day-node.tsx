import { cn } from '../../lib/utils'

export type DayNodeState = 'perfect' | 'partial' | 'missed' | 'frozen' | 'today' | 'future'

type DayNodeProps = {
  state: DayNodeState
  /** ISO date this node represents; used for the accessible label. */
  date: string
  /** Rings closed 0..3 — drives the partial arc. */
  ringsClosed?: number
  size?: number
  onClick?: () => void
  ariaLabel?: string
}

const STATE_LABEL: Record<DayNodeState, string> = {
  perfect: 'all three closed',
  partial: 'partly closed',
  missed: 'missed',
  frozen: 'held by a freeze',
  today: 'today, in progress',
  future: 'upcoming',
}

/**
 * One node of the progress map / week strips. Perfect days fill with a
 * perfect-halo ring; partial days show how many of three closed as an arc;
 * frozen days tint ice-blue with a snowflake; future days are muted and inert
 * — no fake locks, ever.
 */
function DayNode({ state, date, ringsClosed = 0, size = 28, onClick, ariaLabel }: DayNodeProps) {
  const strokeWidth = Math.max(2.5, size * 0.1)
  const radius = (size - strokeWidth) / 2 - 1
  const circumference = 2 * Math.PI * radius
  const center = size / 2
  const arcRatio = state === 'perfect' ? 1 : Math.min(Math.max(ringsClosed / 3, 0), 1)
  const interactive = Boolean(onClick) && state !== 'future'

  const fill =
    state === 'perfect' ? 'var(--game-deep-fill)'
      : state === 'frozen' ? 'var(--game-freeze-soft)'
      : 'rgba(255, 255, 255, 0.5)'
  const stroke =
    state === 'frozen' ? 'var(--game-freeze)'
      : state === 'missed' || state === 'future' ? 'var(--game-locked)'
      : 'var(--game-deep)'

  return (
    <button
      type="button"
      className={cn('game-day-node', `game-day-node--${state}`)}
      style={{ width: size, height: size }}
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      data-static={!interactive || undefined}
      aria-label={ariaLabel ?? `${date}: ${STATE_LABEL[state]}`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill={fill} stroke="none" />
        {(state === 'partial' || state === 'today') && arcRatio > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - arcRatio)}
          />
        )}
        {(state === 'missed' || state === 'future') && (
          <circle cx={center} cy={center} r={radius} fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray={state === 'future' ? '2 3' : undefined} />
        )}
        {state === 'perfect' && (
          <circle cx={center} cy={center} r={radius + strokeWidth / 2} fill="none" stroke="var(--game-perfect)" strokeWidth={2} />
        )}
        {state === 'frozen' && (
          <circle cx={center} cy={center} r={radius} fill="none" stroke={stroke} strokeWidth={1.5} />
        )}
        {state === 'today' && (
          <circle className="game-day-ring" cx={center} cy={center} r={radius} fill="none" stroke="var(--game-deep)" strokeWidth={strokeWidth} strokeDasharray="3 4" strokeLinecap="round" />
        )}
      </svg>
      <span className="game-day-glyph" aria-hidden="true">
        {state === 'perfect' && (
          <svg width={size * 0.42} height={size * 0.34} viewBox="0 0 18 14">
            <path d="M2 7.5 L6.6 12 L16 2" fill="none" stroke="#101312" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {state === 'frozen' && (
          <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 14 14">
            <g stroke="var(--game-freeze)" strokeWidth="1.3" strokeLinecap="round" fill="none">
              <path d="M7 1.5 V12.5 M2.2 4.25 L11.8 9.75 M11.8 4.25 L2.2 9.75" />
              <path d="M7 1.5 L5.7 3 M7 1.5 L8.3 3 M7 12.5 L5.7 11 M7 12.5 L8.3 11" />
            </g>
          </svg>
        )}
      </span>
    </button>
  )
}

export { DayNode }
