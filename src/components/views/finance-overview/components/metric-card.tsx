import type { FinanceMetric } from '../data'

type MetricCardProps = {
  metric: FinanceMetric
}

function MetricCard({ metric }: MetricCardProps) {
  const Icon = metric.icon

  return (
    <section className="finance-card finance-metric-card">
      <div className={`finance-metric-icon ${metric.tone}`}>
        <Icon size={15} strokeWidth={2.2} />
      </div>
      <p>{metric.label}</p>
      <strong>{metric.value}</strong>
    </section>
  )
}

export { MetricCard }
