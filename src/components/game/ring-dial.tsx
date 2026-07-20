import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useCountUp } from '../../hooks/use-count-up'

export type RingAccent = 'rest' | 'deep' | 'move' | 'perfect'

type RingDialProps = {
  /** True measured value (minutes, grams, …). */
  value: number
  target: number
  /** Small uppercase label under the number (e.g. "REST"). */
  label: string
  accent: RingAccent
  /** Outer diameter in px. */
  size?: number
  /** Formatted true value for the centre (e.g. "7h 40m"). Numbers never lie. */
  display?: string
  /** Override the derived visual state — e.g. a frozen day. */
  state?: 'closed' | 'open'
  /**
   * Drain mode (finance): the ring starts full and depletes — the arc is the
   * TRUE remaining ratio with no Zeigarnik easing (tension to finish spending
   * would be perverse), no almost-there breathing, and no closed snap.
   */
  drain?: boolean
  onClick?: () => void
  ariaLabel?: string
}

/**
 * The Zeigarnik display curve — visual only, the numeric label always shows
 * the true value. Slightly inflates the 70–90% band so an almost-done ring
 * reads as almost done, without ever looking empty (≥0.08) or full (≤0.97).
 */
function displayRatio(raw: number): number {
  if (raw <= 0) return 0
  if (raw >= 1) return 1
  const eased = Math.pow(raw, 0.82)
  return Math.max(0.08, Math.min(eased, 0.97))
}

/**
 * The shared radial primitive for the Three Non-Negotiables. Closed rings snap
 * to a distinct treatment (filled centre, check glyph, perfect halo); rings in
 * the 0.70–0.99 band breathe slowly at the arc tip — that is the entire hook.
 * All motion is gated behind prefers-reduced-motion via game-tokens.css.
 */
function RingDial({ value, target, label, accent, size = 104, display, state, drain, onClick, ariaLabel }: RingDialProps) {
  const rawRatio = target > 0 ? value / target : 0
  const closed = !drain && (state === 'closed' || (state !== 'open' && rawRatio >= 1))
  const almost = !drain && !closed && rawRatio >= 0.7 && rawRatio < 1

  const strokeWidth = Math.max(6, size * 0.085)
  const radius = (size - strokeWidth) / 2 - 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  // Sweep in on mount, matching the Nutrition ArcGauge's feel; reduced motion
  // renders the final arc immediately (useCountUp handles that itself).
  const animatedValue = useCountUp(Math.min(value, target))
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  const animatedRaw = target > 0 ? animatedValue / target : 0
  const visualRatio = closed ? 1 : drain ? Math.min(Math.max(animatedRaw, 0), 1) : displayRatio(animatedRaw)
  const dashOffset = circumference * (1 - (mounted || closed ? visualRatio : 0))

  const resolvedAria = ariaLabel ?? `${label}: ${display ?? value}${closed ? ', complete' : ` of ${target}`}`
  const interactive = Boolean(onClick)

  return (
    <button
      type="button"
      className={cn('game-ring-dial', `game-ring-dial--${accent}`, closed && 'is-closed', almost && 'is-almost')}
      style={{ width: size, height: size }}
      onClick={onClick}
      disabled={!interactive}
      data-static={!interactive || undefined}
      aria-label={resolvedAria}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        {closed && (
          <circle className={`game-ring-fill-${accent}`} cx={center} cy={center} r={radius - strokeWidth / 2} />
        )}
        <circle className="game-ring-track" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} />
        {/* No arc at zero — also prevents a first-frame flash before the
            dash attributes commit (the ArcGauge tip-marker guard, same idea). */}
        {visualRatio > 0.001 && (
          <circle
            className="game-ring-value"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        )}
        <circle className="game-ring-halo" cx={center} cy={center} r={radius + strokeWidth / 2} />
      </svg>
      <span className="game-ring-center">
        {closed && (
          <svg width={size * 0.18} height={size * 0.14} viewBox="0 0 18 14" aria-hidden="true">
            <path className="game-ring-check" d="M2 7.5 L6.6 12 L16 2" />
          </svg>
        )}
        <strong>{display ?? String(value)}</strong>
        <small>{label}</small>
      </span>
    </button>
  )
}

export { RingDial }
