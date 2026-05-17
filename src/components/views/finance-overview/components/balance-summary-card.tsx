import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { balanceSparkBars, totalBalance } from '../data'

function BalanceSummaryCard() {
  const [isHidden, setIsHidden] = useState(true)

  return (
    <section className="finance-card finance-balance-card">
      <div className="finance-card-title">
        <span>{totalBalance.label}</span>
        <button 
          onClick={() => setIsHidden(!isHidden)} 
          className="finance-balance-hide-btn"
          aria-label={isHidden ? 'Show balance' : 'Hide balance'}
        >
          {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <div className="finance-balance-value">
        <strong>{isHidden ? '₹ •••••••' : totalBalance.value}</strong>
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
