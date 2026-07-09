import { Wallet, Pencil } from 'lucide-react'

interface BalanceSummaryCardProps {
  balance: number | null
  loading?: boolean
  onEdit?: () => void
}

function BalanceSummaryCard({ balance, loading = false, onEdit }: BalanceSummaryCardProps) {
  return (
    <section className="finance-card finance-balance-card">
      <div className="finance-balance-icon">
        <Wallet size={15} strokeWidth={2.2} />
      </div>
      {onEdit && (
        <button
          type="button"
          className="finance-balance-edit"
          onClick={onEdit}
          aria-label="Update total balance"
          title="Update balance"
        >
          <Pencil size={12} strokeWidth={2.2} />
        </button>
      )}
      <p>Total Balance</p>
      {loading ? (
        <div className="skeleton-shimmer skeleton-rect" style={{ width: '90px', height: '18px', marginTop: '6px', borderRadius: '4px' }} />
      ) : (
        <strong>₹{(balance ?? 0).toLocaleString('en-IN')}</strong>
      )}
    </section>
  )
}

export { BalanceSummaryCard }
