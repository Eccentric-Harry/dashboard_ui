import { useState, useEffect, useMemo } from 'react'
import { Check, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import type { LendingRecord } from '../../../../lib/api'
import { financeService } from '../../../../services/finance-service'

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
  const [isEditMode, setIsEditMode] = useState(false)


  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 4
  // eslint-disable-next-line react-hooks/purity
  const nowTime = useMemo(() => Date.now(), [])

  const loadRecords = async () => {
    setLoading(true)
    try {
      const res = await financeService.getLending()
      if (res.error) throw new Error(res.error.message)
      setRecords(res.data || [])
    } catch (err) {
      console.error('Failed to fetch lending records:', err)
      toast.error('Failed to load lending records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      const toggleRes = await financeService.toggleLending(record.id)
      if (toggleRes.error) throw new Error(toggleRes.error.message)

      // If moving to Repaid, offer to record a recovery transaction
      if (nextStatus === 'Repaid') {
        const today = new Date().toISOString().split('T')[0]
        const txRes = await financeService.addTransaction({
          description: `Lending Recovery: ${record.borrower}`,
          amount: Math.round(record.amount),
          category: 'Loan Recovery',
          type: 'Income',
          date: today
        })
        if (txRes.error) throw new Error(txRes.error.message)
        toast.success(`Marked as Repaid & logged recovery of ₹${record.amount.toLocaleString()} in transactions!`)
        if (onRefreshTransactions) onRefreshTransactions()
      } else {
        toast.success(`Status updated for ${record.borrower}`)
      }

      loadRecords()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            <span className="skeleton-rect skeleton-shimmer" style={{ width: 120, height: 10, marginTop: 6 }} />
          </div>
          <span className="skeleton-rect skeleton-shimmer" style={{ width: 80, height: 20 }} />
        </div>
        <div className="finance-lending-list" style={{ marginTop: 12 }}>
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="skeleton-circle skeleton-shimmer" style={{ width: 28, height: 28, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span className="skeleton-rect skeleton-shimmer mb-1.5" style={{ width: '40%', height: 12 }} />
                <span className="skeleton-rect skeleton-shimmer" style={{ width: '25%', height: 8 }} />
              </div>
              <span className="skeleton-rect skeleton-shimmer" style={{ width: 60, height: 14, marginRight: 12 }} />
              <span className="skeleton-rect skeleton-shimmer" style={{ width: 64, height: 24, borderRadius: 12 }} />
            </div>
          ))}
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
          <button 
            className={`finance-transaction-action-btn ${isEditMode ? 'active' : ''}`}
            onClick={() => setIsEditMode(!isEditMode)}
            aria-label="Toggle edit mode"
            type="button"
            style={{ 
              background: isEditMode ? 'rgba(20, 24, 22, 0.06)' : 'transparent', 
              padding: '0', 
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minWidth: '32px',
              minHeight: '32px',
              border: 'none',
              boxShadow: 'none',
              cursor: 'pointer'
            }}
          >
            <Pencil size={14} strokeWidth={2.5} />
          </button>
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
                        <span style={{ color: !isPaid && item.dueDate && new Date(item.dueDate).getTime() < nowTime ? '#d83542' : 'inherit' }}>
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
                  {isEditMode && (
                    <>
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
                    </>
                  )}
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
