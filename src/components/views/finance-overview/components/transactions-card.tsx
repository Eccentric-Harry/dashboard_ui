import { useState } from 'react'
import { ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react'
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

const PAGE_SIZE = 4

export const getPastelBG = (colorHex: string) => {
  const hex = colorHex.toLowerCase()
  if (hex === '#4684ff') return '#e6f0ff'
  if (hex === '#ff6c61') return '#ffebee'
  if (hex === '#039855') return '#e6fcf0'
  if (hex === '#10b981') return '#e6faf4'
  if (hex === '#7a5af8') return '#f3e8ff'
  if (hex === '#0ba5ec') return '#ecf8ff'
  if (hex === '#f97316') return '#fff4e6'
  if (hex === '#dd2590') return '#fff0f6'
  if (hex === '#8b5cf6') return '#f7f4ff'
  if (hex === '#12b76a') return '#e6faf0'
  if (hex === '#32d583') return '#f0fdf4'

  try {
    const c = hex.replace('#', '')
    const r = parseInt(c.substring(0, 2), 16)
    const g = parseInt(c.substring(2, 4), 16)
    const b = parseInt(c.substring(4, 6), 16)
    const pr = Math.round(r * 0.08 + 255 * 0.92)
    const pg = Math.round(g * 0.08 + 255 * 0.92)
    const pb = Math.round(b * 0.08 + 255 * 0.92)
    return `rgb(${pr}, ${pg}, ${pb})`
  } catch (e) {
    return '#f3f4f6'
  }
}

function TransactionsCard({ transactions = [], loading = false, onEdit, onDelete }: TransactionsCardProps) {
  const [page, setPage] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE
  const paginated = transactions.slice(start, start + PAGE_SIZE)

  return (
    <section className="finance-card finance-transactions-card">
      <div className="finance-section-head compact">
        <div>
          <h2>Recent Transactions</h2>
          <p>{transactions.length} transactions recorded</p>
        </div>
        <button 
          className={`finance-transaction-action-btn ${isEditMode ? 'active' : ''}`}
          onClick={() => setIsEditMode(!isEditMode)}
          aria-label="Toggle edit mode"
          style={{ background: isEditMode ? 'rgba(20, 24, 22, 0.06)' : 'transparent', padding: '6px', borderRadius: '8px' }}
        >
          <Edit2 size={14} />
        </button>
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
          ) : paginated.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No recent transactions</div>
          ) : (
            paginated.map((tx, index) => {
              const { merchant, detail, category, amount, tone, icon: Icon } = tx;
              return (
                <div className="finance-transaction-row" key={`${merchant}-${detail}-${index}`} role="row">
                  <div className="finance-transaction-merchant" role="cell">
                    <span style={{ 
                      background: getPastelBG(getConsistentColor(category)), 
                      color: getConsistentColor(category),
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
                    }}>
                      <Icon size={14} strokeWidth={2.6} />
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
                      {isEditMode && (
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
                      )}
                    </div>
                </div>
              );
            })
          )}
        </div>
        {!loading && totalPages > 1 && (
          <div className="finance-pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="pagination-btn"
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="pagination-info">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="pagination-btn"
              type="button"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export { TransactionsCard }
