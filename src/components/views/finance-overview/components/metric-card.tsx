import type { FinanceMetric } from '../data'

type MetricCardProps = {
  metric: FinanceMetric
}

function MetricCard({ metric }: MetricCardProps) {
  const Icon = metric.icon

  return (
    <section className="finance-card finance-metric-card">
      <div className={`finance-metric-icon ${metric.tone}`}>
        <Icon size={14} />
      </div>
      <p>{metric.label}</p>
      <strong>
        {metric.value}
        <small>{metric.cents}</small>
      </strong>
      <div className="finance-metric-change">
        <span className={metric.tone}>{metric.change}</span>
        <em>vs last month</em>
      </div>
    </section>
  )
}

export { MetricCard }
