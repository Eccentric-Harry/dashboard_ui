import { useState, useEffect } from 'react'
import { X, Edit2, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getConsistentColor, getIconForCategory } from '../utils'

export interface TransactionProp {
  id: string
  merchant: string
  detail: string
  category: string
  amount: string
  tone: 'income' | 'expense' | string
  icon: LucideIcon
  rawAmount: number
  rawDate: string
  rawType: string
}

interface TransactionsCardProps {
  transactions?: TransactionProp[]
  loading?: boolean
  onEdit?: (transaction: TransactionProp) => void
  onDelete?: (transaction: TransactionProp) => void
}

function TransactionsCard({ transactions = [], loading = false, onEdit, onDelete }: TransactionsCardProps) {
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
            displayTransactions.map((tx, index) => {
              const { merchant, detail, category, amount, tone, icon: Icon } = tx;
              return (
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
                  <div className="finance-transaction-category" role="cell">
                    <em style={{ 
                      backgroundColor: `${getConsistentColor(category)}15`, 
                      color: getConsistentColor(category),
                      border: `1px solid ${getConsistentColor(category)}30`
                    }}>
                      {(() => {
                        const CatIcon = getIconForCategory(category);
                        return <CatIcon size={10} style={{ marginRight: '4px' }} />;
                      })()}
                      {category}
                    </em>
                  </div>
                  <div className="finance-transaction-amount-group" role="cell">
                    <strong className={tone}>
                      {amount}
                    </strong>
                    <div className="finance-transaction-actions">
                      {onEdit && (
                        <button 
                          type="button" 
                          className="finance-transaction-action-btn" 
                          onClick={() => onEdit(tx)}
                          aria-label="Edit transaction"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                      {onDelete && (
                        <button 
                          type="button" 
                          className="finance-transaction-action-btn delete" 
                          onClick={() => onDelete(tx)}
                          aria-label="Delete transaction"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
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
                {transactions.map((tx, index) => {
                  const { merchant, detail, category, amount, tone, icon: Icon } = tx;
                  return (
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
                      <div className="finance-transaction-category" role="cell">
                        <em style={{ 
                          backgroundColor: `${getConsistentColor(category)}15`, 
                          color: getConsistentColor(category),
                          border: `1px solid ${getConsistentColor(category)}30`
                        }}>
                          {(() => {
                            const CatIcon = getIconForCategory(category);
                            return <CatIcon size={10} style={{ marginRight: '4px' }} />;
                          })()}
                          {category}
                        </em>
                      </div>
                      <div className="finance-transaction-amount-group" role="cell">
                        <strong className={tone}>
                          {amount}
                        </strong>
                        <div className="finance-transaction-actions">
                          {onEdit && (
                            <button 
                              type="button" 
                              className="finance-transaction-action-btn" 
                              onClick={() => onEdit(tx)}
                              aria-label="Edit transaction"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                          {onDelete && (
                            <button 
                              type="button" 
                              className="finance-transaction-action-btn delete" 
                              onClick={() => onDelete(tx)}
                              aria-label="Delete transaction"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export { TransactionsCard }
