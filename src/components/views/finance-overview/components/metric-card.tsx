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
        <strong>{metric.value}</strong>
      )}
    </section>
  )
}

export { MetricCard }
