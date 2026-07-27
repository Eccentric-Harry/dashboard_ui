import { useState, useEffect } from 'react'
import { X, Loader2, Target } from 'lucide-react'
import toast from 'react-hot-toast'
import { financeService } from '../../../../services/finance-service'

interface EditBudgetModalProps {
  isOpen: boolean
  currentBudget: number
  onClose: () => void
  onSuccess: (budget: number) => void
}

export function EditBudgetModal({ isOpen, currentBudget, onClose, onSuccess }: EditBudgetModalProps) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmount(currentBudget ? currentBudget.toString() : '')
      setError('')
    }
  }, [isOpen, currentBudget])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a positive amount')
      return
    }
    setLoading(true)
    try {
      const res = await financeService.updateBudget(numAmount)
      if (res.error) throw new Error(res.error.message)
      const saved = res.data?.monthlyBudget ?? numAmount
      toast.success(`Monthly budget set to ₹${saved.toLocaleString('en-IN')}`)
      onSuccess(saved)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update budget')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="finance-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="finance-modal-popover add-tx-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(400px, calc(100vw - 42px))' }}
      >
        <button type="button" className="finance-modal-close" onClick={onClose}>
          <X size={15} />
        </button>

        <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>Set Monthly Budget</h2>
        <p style={{ fontSize: '12px', color: '#526057', marginBottom: '22px', lineHeight: 1.45 }}>
          Your monthly spending limit. The home dashboard will show what percentage of this you've used so far.
        </p>

        <form onSubmit={handleSubmit} className="add-tx-form">
          <div className="form-group">
            <label>Monthly Budget (₹)</label>
            <div className="balance-input-wrap">
              <Target size={15} strokeWidth={2.2} className="balance-input-icon" />
              <input
                type="number"
                step="1"
                min="1"
                placeholder="20000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {error && <p className="add-tx-error">{error}</p>}

          <button
            type="submit"
            className="add-tx-submit"
            style={{ borderRadius: '10px', backgroundColor: '#121c17' }}
            disabled={loading}
          >
            {loading ? <Loader2 className="spinner" size={18} /> : 'Save Budget'}
          </button>
        </form>
      </div>
    </div>
  )
}
