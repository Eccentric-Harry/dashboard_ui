import { useState, useEffect, useMemo } from 'react'
import { Check, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  fetchLendingRecords,
  toggleLendingRecordStatus,
  addTransaction,
  type LendingRecord
} from '../../../../lib/api'

interface LendingCardProps {
  refreshKey: number
  onEditClick: (record: LendingRecord) => void
  onDeleteClick: (record: LendingRecord) => void
  onRefreshTransactions?: () => void
}

export function LendingCard({ refreshKey, onEditClick, onDeleteClick, onRefreshTransactions }: LendingCardProps) {
  const [records, setRecords] = useState<LendingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)


  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 4

  const loadRecords = async () => {
    setLoading(true)
    try {
      const res = await fetchLendingRecords()
      setRecords(res.data || [])
    } catch (err) {
      console.error('Failed to fetch lending records:', err)
      toast.error('Failed to load lending records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [refreshKey])

  // Calculate totals
  const totalPendingVal = useMemo(() => {
    return records
      .filter(r => r.status === 'Pending')
      .reduce((sum, r) => sum + r.amount, 0)
  }, [records])

  const totalPendingFormatted = useMemo(() => {
    return `₹${totalPendingVal.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }, [totalPendingVal])

  const pendingCount = useMemo(() => {
    return records.filter(r => r.status === 'Pending').length
  }, [records])

  // Sorting: Pending records first (earliest lent date first), Repaid records at the bottom
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const aRepaid = a.status === 'Repaid'
      const bRepaid = b.status === 'Repaid'
      if (aRepaid !== bRepaid) return aRepaid ? 1 : -1
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [records])

  // Pagination calculations
  const totalPages = Math.ceil(sortedRecords.length / ITEMS_PER_PAGE)
  const page = Math.max(1, Math.min(currentPage, totalPages || 1))
  const paginatedRecords = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE
    return sortedRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [sortedRecords, page])

  const handleToggleStatus = async (record: LendingRecord) => {
    setProcessingId(record.id)
    const nextStatus = record.status === 'Pending' ? 'Repaid' : 'Pending'
    try {
      await toggleLendingRecordStatus(record.id)

      // If moving to Repaid, offer to record a recovery transaction
      if (nextStatus === 'Repaid') {
        const today = new Date().toISOString().split('T')[0]
        await addTransaction({
          description: `Lending Recovery: ${record.borrower}`,
          amount: Math.round(record.amount),
          category: 'Loan Recovery',
          type: 'Income',
          date: today
        })
        toast.success(`Marked as Repaid & logged recovery of ₹${record.amount.toLocaleString()} in transactions!`)
        if (onRefreshTransactions) onRefreshTransactions()
      } else {
        toast.success(`Status updated for ${record.borrower}`)
      }

      loadRecords()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to update status')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading && records.length === 0) {
    return (
      <section className="finance-card lending-tracker-card">
        <div className="finance-section-head compact">
          <div>
            <h2>Lending Tracker</h2>
            <p>Loading records...</p>
          </div>
        </div>
        <div style={{ display: 'grid', placeItems: 'center', flex: 1, minHeight: '150px' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: '#8b5cf6' }} />
        </div>
      </section>
    )
  }

  return (
    <section className="finance-card lending-tracker-card">
      <div className="finance-section-head compact">
        <div>
          <h2>Lending Tracker</h2>
          <p>{pendingCount} pending repayments</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <strong style={{ color: totalPendingVal > 0 ? '#8b5cf6' : 'inherit' }}>
            {totalPendingFormatted}
          </strong>
        </div>
      </div>

      <div className="finance-lending-list" style={{ minHeight: '264px' }}>
        {paginatedRecords.length === 0 ? (
          <div style={{ display: 'grid', placeItems: 'center', flex: 1, height: '100%', color: 'rgba(23, 28, 25, 0.45)', fontSize: '12px' }}>
            No lending records found
          </div>
        ) : (
          paginatedRecords.map((item) => {
            const isProcessing = processingId === item.id
            const isPaid = item.status === 'Repaid'
            const formattedDate = new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            const formattedDueDate = item.dueDate
              ? new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : ''

            return (
              <div key={item.id} className={isPaid ? 'paid' : ''}>
                <span className="repayment-icon" style={{ background: isPaid ? 'rgba(50, 169, 71, 0.1)' : 'rgba(139, 92, 246, 0.1)', color: isPaid ? '#32a947' : '#8b5cf6' }}>
                  <DollarSign size={16} />
                </span>

                <div className="lending-info">
                  <b>{item.borrower}</b>
                  <small style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <span>Lent: {formattedDate}</span>
                    {formattedDueDate && (
                      <>
                        <span style={{ opacity: 0.5 }}>•</span>
                        <span style={{ color: !isPaid && item.dueDate && new Date(item.dueDate).getTime() < Date.now() ? '#d83542' : 'inherit' }}>
                          Due: {formattedDueDate}
                        </span>
                      </>
                    )}
                  </small>
                </div>

                <strong className="repayment-amount" style={{ textDecoration: isPaid ? 'line-through' : 'none' }}>
                  ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </strong>

                <div className="lending-actions">
                  <button
                    type="button"
                    onClick={() => onEditClick(item)}
                    title="Edit entry"
                    className="lending-row-action-btn edit"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteClick(item)}
                    title="Delete entry"
                    className="lending-row-action-btn delete"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
                    className={`pay-button ${isPaid ? 'success' : ''}`}
                    onClick={() => !isProcessing && handleToggleStatus(item)}
                    disabled={isProcessing}
                    title={isPaid ? 'Mark as Pending' : 'Mark as Repaid'}
                  >
                    {isProcessing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : isPaid ? (
                      <Check size={12} />
                    ) : (
                      'Received'
                    )}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="finance-pagination">
          <button
            disabled={page === 1}
            onClick={() => setCurrentPage(p => p - 1)}
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
            onClick={() => setCurrentPage(p => p + 1)}
            className="pagination-btn"
            type="button"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  )
}
