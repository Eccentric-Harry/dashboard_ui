import { Wallet } from 'lucide-react'
import { totalBalance } from '../data'

function BalanceSummaryCard() {
  return (
    <section className="finance-card finance-balance-card">
      <div className="finance-balance-icon">
        <Wallet size={15} strokeWidth={2.2} />
      </div>
      <p>Total Balance</p>
      <strong>{totalBalance.value}</strong>
    </section>
  )
}

export { BalanceSummaryCard }
