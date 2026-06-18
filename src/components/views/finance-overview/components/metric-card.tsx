import type { FinanceMetric } from '../data'

type MetricCardProps = {
  metric: FinanceMetric
  loading?: boolean
}

function MetricCard({ metric, loading = false }: MetricCardProps) {
  const Icon = metric.icon

  return (
    <section className="finance-card finance-metric-card">
      <div className={`finance-metric-icon ${metric.tone}`}>
        <Icon size={15} strokeWidth={2.2} />
      </div>
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
