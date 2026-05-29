import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { addTransaction, updateTransaction } from '../../../../lib/api'

import faaahAudio from '../../../../assets/faaah.mp3'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  isEdit?: boolean
  initialData?: {
    id?: string
    description: string
    amount: number
    category: string
    type: string
    date: string
  }
}

const CATEGORIES = [
  'Food', 'Dining', 'Groceries',
  'Transport', 'Cycling',
  'Shopping', 'Entertainment', 'Outing',
  'Bills', 'Health', 'Home',
  'Lending', 'Loan Recovery',
  'Income', 'Salary',
  'Miscellaneous'
]

export function AddTransactionModal({ isOpen, onClose, onSuccess, isEdit, initialData }: AddTransactionModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [type, setType] = useState('Expense')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (isOpen && isEdit && initialData) {
      setType(initialData.type)
      setCategory(initialData.category)
      setAmount(initialData.amount.toString())
      setDescription(initialData.description)
      setDate(initialData.date)
    } else if (isOpen && !isEdit) {
      // Reset to defaults for new transaction
      setType('Expense')
      setCategory(CATEGORIES[0])
      setAmount('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [isOpen, isEdit, initialData])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!description || !amount || !category || !type || !date) {
      setError('Please fill in all fields')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    setLoading(true)
    try {
      const payload = {
        description,
        amount: numAmount,
        category,
        type,
        date
      }

      if (isEdit && initialData?.id) {
        await updateTransaction(initialData.id, payload)
        toast.success(`Updated "${description}" (₹${numAmount.toLocaleString()})`)
      } else {
        await addTransaction(payload)
        toast.success(`Saved "${description}" (₹${numAmount.toLocaleString()})`)
      }

      if (type === 'Expense') {
        const audio = new Audio(faaahAudio)
        audio.play().catch(err => console.error('Error playing sound:', err))
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction')
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
        style={{ width: 'min(440px, calc(100vw - 42px))' }}
      >

        <button type="button" className="finance-modal-close" onClick={onClose}>
          <X size={15} />
        </button>

        <h2 style={{ fontSize: '22px', marginBottom: '24px' }}>
          {isEdit ? 'Edit Transaction' : 'Add Transaction'}
        </h2>

        <form onSubmit={handleSubmit} className="add-tx-form">
          <div className="form-group type-toggle">
            <div className={`type-toggle-slider ${type === 'Income' ? 'slide-right' : ''}`} />
            <button
              type="button"
              className={type === 'Expense' ? 'active expense' : ''}
              onClick={() => setType('Expense')}
            >
              Expense
            </button>
            <button
              type="button"
              className={type === 'Income' ? 'active income' : ''}
              onClick={() => setType('Income')}
            >
              Income
            </button>
          </div>


          <div className="form-group">
            <label>Merchant / Description</label>
            <input
              type="text"
              placeholder="e.g. Starbucks, Netflix..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="form-row add-tx-category-date-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="add-tx-error">{error}</p>}

          <button type="submit" className="add-tx-submit" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={18} /> : 'Save Transaction'}
          </button>
        </form>
      </div>
    </div>
  )
}
