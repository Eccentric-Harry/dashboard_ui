import { Wallet } from 'lucide-react'
import { totalBalance } from '../data'

function BalanceSummaryCard({ loading = false }: { loading?: boolean }) {
  return (
    <section className="finance-card finance-balance-card">
      <div className="finance-balance-icon">
        <Wallet size={15} strokeWidth={2.2} />
      </div>
      <p>Total Balance</p>
      {loading ? (
        <div className="skeleton-shimmer skeleton-rect" style={{ width: '90px', height: '18px', marginTop: '6px', borderRadius: '4px' }} />
      ) : (
        <strong>{totalBalance.value}</strong>
      )}
    </section>
  )
}

export { BalanceSummaryCard }
