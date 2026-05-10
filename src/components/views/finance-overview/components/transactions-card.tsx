import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const displayTransactions = transactions.slice(0, 10)

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isModalOpen])

  return (
    <>
      <section className="finance-card finance-transactions-card">
        <div className="finance-section-head compact">
          <div>
            <h2>Recent Transactions</h2>
            <p>Latest spending and income activity</p>
          </div>
          <button type="button" onClick={() => setIsModalOpen(true)}>View All</button>
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
          ) : displayTransactions.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No recent transactions</div>
          ) : (
            displayTransactions.map(({ merchant, detail, category, amount, tone, icon: Icon }, index) => (
              <div className="finance-transaction-row" key={`${merchant}-${detail}-${index}`} role="row">
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

      {isModalOpen && (
        <div className="finance-modal-backdrop" role="presentation" onClick={() => setIsModalOpen(false)}>
          <div className="finance-modal-popover" role="dialog" aria-label="All transactions" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="finance-modal-close" aria-label="Close modal" onClick={() => setIsModalOpen(false)}>
              <X size={15} />
            </button>
            <h2>All Transactions</h2>
            <div className="finance-transaction-table" role="table" aria-label="All historical transactions">
              <div className="finance-transaction-row header" role="row">
                <span role="columnheader">Merchant</span>
                <span role="columnheader">Category</span>
                <span role="columnheader">Amount (INR)</span>
              </div>
              <div className="finance-transaction-list" role="rowgroup">
                {transactions.map(({ merchant, detail, category, amount, tone, icon: Icon }, index) => (
                  <div className="finance-transaction-row" key={`modal-${merchant}-${detail}-${index}`} role="row">
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
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export { TransactionsCard }
