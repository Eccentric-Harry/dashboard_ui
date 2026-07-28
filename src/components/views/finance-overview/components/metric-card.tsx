import { Pencil } from 'lucide-react'
import type { FinanceMetric } from '../data'

type MetricCardProps = {
  metric: FinanceMetric
  loading?: boolean
  onEdit?: () => void
}

function MetricCard({ metric, loading = false, onEdit }: MetricCardProps) {
  const Icon = metric.icon

  return (
    <section className="finance-card finance-metric-card">
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
          <strong>{metric.value}</strong>
          {metric.progress != null && (
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
        </>
      )}
    </section>
  )
}

export { MetricCard }
