import { useState, useMemo, useEffect } from 'react'
import { Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { addTransaction, fetchSliceRepayments, type RepaymentInstallment } from '../../../../lib/api'

interface RepaymentScheduleCardProps {
  transactions: any[]
  onRefresh?: () => void
}

export function RepaymentScheduleCard({ transactions, onRefresh }: RepaymentScheduleCardProps) {
  const [repayments, setRepayments] = useState<RepaymentInstallment[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [optimisticPaidIds, setOptimisticPaidIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSliceRepayments()
      .then(res => {
        setRepayments(res.data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch Slice repayments:', err)
        setLoading(false)
      })
  }, [])

  // Compute which items have already been paid by searching existing transaction logs
  const paidIds = useMemo(() => {
    const ids = new Set<string>()

    transactions.forEach(tx => {
      repayments.forEach(item => {
        const descLower = tx.merchant.toLowerCase()
        // Match by keyword slice repayment and due date
        if (
          descLower.includes('slice repayment') &&
          descLower.includes(item.dueDate.toLowerCase())
        ) {
          ids.add(item.id)
        }
      })
    })

    // Incorporate optimistic states
    optimisticPaidIds.forEach(id => ids.add(id))

    return ids
  }, [transactions, repayments, optimisticPaidIds])

  const pendingInstallments = useMemo(() => {
    return repayments.filter(item => !paidIds.has(item.id))
  }, [repayments, paidIds])

  // Compute total remaining pending sum dynamically
  const totalRemaining = useMemo(() => {
    const total = pendingInstallments.reduce((sum, item) => {
      const numeric = parseFloat(item.amount.replace(/[^0-9.]/g, ''))
      return sum + (Number.isNaN(numeric) ? 0 : numeric)
    }, 0)
    return `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }, [pendingInstallments])

  const handlePay = async (installment: RepaymentInstallment) => {
    const id = installment.id
    setProcessingId(id)

    try {
      const numericAmount = parseFloat(installment.amount.replace(/[^0-9.]/g, ''))
      const today = new Date().toISOString().split('T')[0]

      await addTransaction({
        description: `Slice Repayment (Due ${installment.dueDate})`,
        amount: Math.round(numericAmount),
        category: 'Bills & Utilities',
        type: 'Expense',
        date: today
      })

      setOptimisticPaidIds(prev => new Set(prev).add(id))
      toast.success(`Paid Slice installment of ${installment.amount}`)
      if (onRefresh) onRefresh()
    } catch (error: any) {
      toast.error(error.message || `Failed to record payment for Slice installment`)
      console.error('Failed to record installment payment:', error)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <section className="finance-card finance-repayment-card">
        <div className="finance-section-head compact">
          <div>
            <h2>Repayment Schedule</h2>
            <p>Loading installments...</p>
          </div>
        </div>
        <div style={{ display: 'grid', placeItems: 'center', flex: 1, minHeight: '150px' }}>
          <Loader2 className="animate-spin" size={24} style={{ color: '#db2777' }} />
        </div>
      </section>
    )
  }

  return (
    <section className="finance-card finance-repayment-card">
      <div className="finance-section-head compact">
        <div>
          <h2>Repayment Schedule</h2>
          <p>{pendingInstallments.length} installments pending</p>
        </div>
        <strong>{totalRemaining}</strong>
      </div>
      <div className="finance-repayment-list">
        {repayments.map((item) => {
          const isProcessing = processingId === item.id
          const isPaid = paidIds.has(item.id)

          return (
            <div key={item.id} className={isPaid ? 'paid' : ''}>
              <span className="repayment-icon" style={{ background: 'none', boxShadow: 'none', padding: 0 }}>
                <img
                  src="/slice-logo.png"
                  alt="Slice"
                  style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'block' }}
                />
              </span>
              <p>
                <b>{item.dueDate}</b>
                <small>{isPaid ? 'Paid' : 'Pending'}</small>
              </p>
              <strong className="repayment-amount">{item.amount}</strong>
              <button
                className={`pay-button ${isPaid ? 'success' : ''}`}
                onClick={() => !isPaid && !isProcessing && handlePay(item)}
                disabled={isProcessing || isPaid}
              >
                {isProcessing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : isPaid ? (
                  <Check size={12} />
                ) : (
                  'Pay'
                )}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
