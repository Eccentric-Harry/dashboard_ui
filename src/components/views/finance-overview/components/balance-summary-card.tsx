import { Eye } from 'lucide-react'

import { balanceSparkBars, totalBalance } from '../data'

function BalanceSummaryCard() {
  return (
    <section className="finance-card finance-balance-card">
      <div className="finance-card-title">
        <span>{totalBalance.label}</span>
        <Eye size={15} />
      </div>
      <div className="finance-balance-value">
        <strong>{totalBalance.value}</strong>
        <small>{totalBalance.cents}</small>
      </div>
      <div className="finance-balance-bottom">
        <span>{totalBalance.change}</span>
        <small>vs last month</small>
      </div>
      <div className="finance-balance-spark" aria-hidden="true">
        {balanceSparkBars.map((height, index) => (
          <i key={index} style={{ height }} />
        ))}
      </div>
    </section>
  )
}

export { BalanceSummaryCard }
