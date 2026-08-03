import { useState, useEffect } from 'react'
import { X, Loader2, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { financeService } from '../../../../services/finance-service'
import { confirmCloseIfDirty } from '../../../../lib/modal-utils'

interface EditBalanceModalProps {
  isOpen: boolean
  currentBalance: number
  onClose: () => void
  onSuccess: (balance: number) => void
}

export function EditBalanceModal({ isOpen, currentBalance, onClose, onSuccess }: EditBalanceModalProps) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmount(currentBalance ? currentBalance.toString() : '')
      setError('')
    }
  }, [isOpen, currentBalance])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount)) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      const res = await financeService.updateBalance(numAmount)
      if (res.error) throw new Error(res.error.message)
      const saved = res.data?.balance ?? numAmount
      toast.success(`Balance set to ₹${saved.toLocaleString('en-IN')}`)
      onSuccess(saved)
      onClose()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to update balance')
    } finally {
      setLoading(false)
    }
  }

  const isDirty = amount !== currentBalance.toString() && amount !== ''
  const handleGuardedClose = () => {
    confirmCloseIfDirty(isDirty, onClose)
  }

  return (
    <div className="finance-modal-backdrop" role="presentation" onClick={handleGuardedClose}>
      <div
        className="finance-modal-popover add-tx-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(400px, calc(100vw - 42px))' }}
      >
        <button type="button" className="finance-modal-close" onClick={handleGuardedClose}>
          <X size={15} />
        </button>

        <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>Update Total Balance</h2>
        <p style={{ fontSize: '12px', color: '#526057', marginBottom: '22px', lineHeight: 1.45 }}>
          Set your current cash balance. Income and expenses you log will adjust it automatically from here.
        </p>

        <form onSubmit={handleSubmit} className="add-tx-form">
          <div className="form-group">
            <label>Current Balance (₹)</label>
            <div className="balance-input-wrap">
              <Wallet size={15} strokeWidth={2.2} className="balance-input-icon" />
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
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
            {loading ? <Loader2 className="spinner" size={18} /> : 'Save Balance'}
          </button>
        </form>
      </div>
    </div>
  )
}
