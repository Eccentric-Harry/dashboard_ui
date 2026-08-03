import type { CSSProperties } from 'react'
import { Pencil, TrendingDown, TrendingUp, Sparkles } from 'lucide-react'
import type { FinanceMetric } from '../data'
import { MoodRing } from './mood-ring'
import { useCountUp } from '../../../../hooks/use-count-up'

type MetricCardProps = {
  metric: FinanceMetric
  loading?: boolean
  onEdit?: () => void
  /** Entrance-stagger index; drives the `--i` animation delay. */
  stagger?: number
}

const MOOD_ICON = {
  good: Sparkles,
  watch: TrendingUp,
  over: TrendingDown,
} as const

// The metric values arrive pre-formatted as strings ("₹1,20,450") because each
// tile formats to its own locale rules upstream. To count up we need the number
// back — so the digits are extracted, animated, and re-inserted into the
// original string. That keeps the ₹, the separators, and any leading "−"
// exactly as the caller wrote them; only the digits move.
const NUMERIC = /[\d,]+(?:\.\d+)?/

function useAnimatedValue(value: string, enabled: boolean): string {
  const match = enabled ? value.match(NUMERIC) : null
  const target = match ? Number(match[0].replace(/,/g, '')) : 0
  const animated = useCountUp(target)

  if (!match) return value
  // Locale-formatted to match the source: these are INR figures rendered with
  // en-IN grouping (1,20,450 — not 120,450), so a default toLocaleString would
  // regroup them mid-animation and land on a differently-punctuated final value.
  return value.replace(NUMERIC, Math.round(animated).toLocaleString('en-IN'))
}

function MetricCard({ metric, loading = false, onEdit, stagger = 0 }: MetricCardProps) {
  const Icon = metric.icon
  const showRing = metric.useRing && metric.progress != null
  const displayValue = useAnimatedValue(metric.value, !loading)

  const ringTone =
    metric.progressTone === 'negative'
      ? 'over'
      : metric.progressTone === 'warning'
        ? 'watch'
        : 'good'

  const MoodIcon = metric.mood ? MOOD_ICON[metric.mood.tone] : null

  return (
    <section
      className={`finance-card finance-metric-card${showRing ? ' has-ring' : ''}`}
      style={{ '--i': stagger } as CSSProperties}
    >
      <div className={`finance-metric-icon ${metric.tone}`}>
        <Icon size={15} strokeWidth={2.2} />
      </div>
      {onEdit && (
        <button
          type="button"
          className="finance-balance-edit"
          onClick={onEdit}
          aria-label="Edit monthly budget"
          title="Set monthly budget"
        >
          <Pencil size={12} strokeWidth={2.2} />
        </button>
      )}
      <p>{metric.label}</p>
      {loading ? (
        <div className="skeleton-shimmer skeleton-rect" style={{ width: '85px', height: '18px', marginTop: '6px', borderRadius: '4px' }} />
      ) : (
        <>
          {showRing ? (
            <div className="fin-metric-row">
              <strong>{displayValue}</strong>
              <MoodRing progress={metric.progress ?? 0} tone={ringTone} />
            </div>
          ) : (
            <strong>{displayValue}</strong>
          )}

          {/* The flat meter survives for any tile that tracks progress but
              hasn't opted into the ring — nothing currently does, but removing
              it would silently drop the fallback. */}
          {metric.progress != null && !showRing && (
            <span
              className="finance-metric-meter"
              role="img"
              aria-label={`${Math.round(metric.progress * 100)}% of budget used`}
            >
              {/* Clamped so an overspent month fills the track rather than
                  overflowing it — the "over" figure below carries the magnitude. */}
              <i
                className={`finance-metric-meter-fill is-${metric.progressTone ?? metric.subtitleTone ?? 'positive'}`}
                style={{ width: `${Math.min(100, Math.max(0, metric.progress * 100))}%` }}
              />
            </span>
          )}
          {metric.subtitle && (
            <span className={`finance-metric-subtitle finance-metric-subtitle--${metric.subtitleTone ?? 'positive'}`}>
              {metric.subtitle}
            </span>
          )}
          {metric.mood && MoodIcon && (
            <span className={`fin-mood-chip is-${metric.mood.tone}`}>
              <MoodIcon size={11} strokeWidth={2.6} />
              {metric.mood.label}
            </span>
          )}
        </>
      )}
    </section>
  )
}

export { MetricCard }
