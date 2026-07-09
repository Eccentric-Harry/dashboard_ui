import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { addSubscription } from '../../../../lib/api'

interface AddSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddSubscriptionModal({ isOpen, onClose, onSuccess }: AddSubscriptionModalProps) {
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [billingDate, setBillingDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName('')
      setCost('')
      setBillingDate('')
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter a service name')
      return
    }
    const numCost = parseFloat(cost)
    if (isNaN(numCost) || numCost <= 0) {
      setError('Cost must be greater than 0')
      return
    }

    setLoading(true)
    try {
      await addSubscription({
        name: name.trim(),
        cost: numCost,
        billingDate: billingDate || undefined,
      })
      toast.success(`Added ${name.trim()} subscription`)
      onSuccess()
      onClose()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to add subscription')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="finance-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="finance-modal-popover add-tx-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(420px, calc(100vw - 42px))' }}
      >
        <button type="button" className="finance-modal-close" onClick={onClose}>
          <X size={15} />
        </button>

        <h2 style={{ fontSize: '22px', marginBottom: '22px' }}>Add Subscription</h2>

        <form onSubmit={handleSubmit} className="add-tx-form">
          <div className="form-group">
            <label>Service Name</label>
            <input
              type="text"
              placeholder="e.g. Netflix, Spotify, Jio..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row add-tx-category-date-row">
            <div className="form-group">
              <label>Monthly Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Renews On (Optional)</label>
              <input
                type="date"
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
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
            {loading ? <Loader2 className="spinner" size={18} /> : 'Save Subscription'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}
