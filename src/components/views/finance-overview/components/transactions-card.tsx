import type { LucideIcon } from 'lucide-react'

export interface TransactionProp {
  merchant: string
  detail: string
  category: string
  amount: string
  tone: 'income' | 'expense' | string
  icon: LucideIcon
}

interface TransactionsCardProps {
  transactions?: TransactionProp[]
  loading?: boolean
}

function TransactionsCard({ transactions = [], loading = false }: TransactionsCardProps) {
  return (
    <section className="finance-card finance-transactions-card">
      <div className="finance-section-head compact">
        <div>
          <h2>Recent Transactions</h2>
          <p>Latest spending and income activity</p>
        </div>
        <button type="button">View All</button>
      </div>
      <div className="finance-transaction-table" role="table" aria-label="Recent transactions">
        <div className="finance-transaction-row header" role="row">
          <span role="columnheader">Merchant</span>
          <span role="columnheader">Category</span>
          <span role="columnheader">Amount (INR)</span>
        </div>
        <div className="finance-transaction-list" role="rowgroup">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No recent transactions</div>
          ) : (
            transactions.map(({ merchant, detail, category, amount, tone, icon: Icon }) => (
              <div className="finance-transaction-row" key={`${merchant}-${detail}`} role="row">
                <div className="finance-transaction-merchant" role="cell">
                  <span>
                    <Icon size={16} />
                  </span>
                  <p>
                    <b>{merchant}</b>
                    <small>{detail}</small>
                  </p>
                </div>
                <em role="cell">{category}</em>
                <strong className={tone} role="cell">
                  {amount}
                </strong>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export { TransactionsCard }
