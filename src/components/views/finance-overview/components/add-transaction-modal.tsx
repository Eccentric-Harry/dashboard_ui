import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  addTransaction,
  updateTransaction,
  addLendingRecord,
  updateLendingRecord,
  type LendingRecord
} from '../../../../lib/api'

import faaahAudio from '../../../../assets/faaah.mp3'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  isEdit?: boolean
  initialTab?: 'Transaction' | 'Lending'
  initialTransactionData?: {
    id?: string
    description: string
    amount: number
    category: string
    type: string
    date: string
  } | null
  initialLendingData?: LendingRecord | null
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

export function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  isEdit,
  initialTab = 'Transaction',
  initialTransactionData,
  initialLendingData
}: AddTransactionModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'Transaction' | 'Lending'>('Transaction')

  // Transaction Form State
  const [type, setType] = useState('Expense')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])

  // Lending Form State
  const [borrower, setBorrower] = useState('')
  const [lendingAmount, setLendingAmount] = useState('')
  const [lendingDate, setLendingDate] = useState(() => new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<'Pending' | 'Repaid'>('Pending')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen) {
      const tab = initialTab || (initialLendingData ? 'Lending' : 'Transaction')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tab)

      if (isEdit) {
        if (tab === 'Transaction' && initialTransactionData) {
          setType(initialTransactionData.type)
          setCategory(initialTransactionData.category)
          setAmount(initialTransactionData.amount.toString())
          setDescription(initialTransactionData.description)
          setDate(initialTransactionData.date)
        } else if (tab === 'Lending' && initialLendingData) {
          setBorrower(initialLendingData.borrower)
          setLendingAmount(initialLendingData.amount.toString())
          setLendingDate(
            initialLendingData.date
              ? new Date(initialLendingData.date).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0]
          )
          setDueDate(
            initialLendingData.dueDate
              ? new Date(initialLendingData.dueDate).toISOString().split('T')[0]
              : ''
          )
          setStatus(initialLendingData.status)
          setNotes(initialLendingData.notes || '')
        }
      } else {
        // Reset Transaction
        setType('Expense')
        setCategory(CATEGORIES[0])
        setAmount('')
        setDescription('')
        setDate(new Date().toISOString().split('T')[0])

        // Reset Lending
        setBorrower('')
        setLendingAmount('')
        setLendingDate(new Date().toISOString().split('T')[0])
        setDueDate('')
        setStatus('Pending')
        setNotes('')
      }
      setError('')
    }
  }, [isOpen, isEdit, initialTab, initialTransactionData, initialLendingData])

  if (!isOpen) return null

  const handleTransactionSubmit = async (e: React.FormEvent) => {
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

      if (isEdit && initialTransactionData?.id) {
        await updateTransaction(initialTransactionData.id, payload)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  const handleLendingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!borrower || !lendingAmount || !lendingDate) {
      setError('Please fill in borrower, amount, and date')
      return
    }

    const numAmount = parseFloat(lendingAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    setLoading(true)
    try {
      const payload = {
        borrower,
        amount: numAmount,
        date: lendingDate,
        dueDate: dueDate || undefined,
        status,
        notes: notes || undefined
      }

      if (isEdit && initialLendingData?.id) {
        await updateLendingRecord(initialLendingData.id, payload)
        toast.success(`Updated lending to ${borrower}`)
      } else {
        await addLendingRecord(payload)
        toast.success(`Recorded lending of ₹${numAmount.toLocaleString()} to ${borrower}`)
      }

      onSuccess()
      onClose()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to save lending record')
    } finally {
      setLoading(false)
    }
  }

  const renderTitle = () => {
    if (isEdit) {
      return activeTab === 'Lending' ? 'Edit Lending Record' : 'Edit Transaction'
    }
    return activeTab === 'Lending' ? 'Record Lending' : 'Add Transaction'
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

        <h2 style={{ fontSize: '22px', marginBottom: isEdit ? '24px' : '16px' }}>
          {renderTitle()}
        </h2>

        {!isEdit && (
          <div className="type-toggle" style={{ marginBottom: '24px' }}>
            <div className={`type-toggle-slider ${activeTab === 'Lending' ? 'slide-right' : ''}`} />
            <button
              type="button"
              className={activeTab === 'Transaction' ? 'active' : ''}
              onClick={() => setActiveTab('Transaction')}
            >
              Transaction
            </button>
            <button
              type="button"
              className={activeTab === 'Lending' ? 'active' : ''}
              onClick={() => setActiveTab('Lending')}
            >
              Lending
            </button>
          </div>
        )}

        {activeTab === 'Transaction' ? (
          <form onSubmit={handleTransactionSubmit} className="add-tx-form">
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

            <button
              type="submit"
              className="add-tx-submit"
              style={{ borderRadius: '10px', backgroundColor: '#121c17' }}
              disabled={loading}
            >
              {loading ? <Loader2 className="spinner" size={18} /> : 'Save Transaction'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLendingSubmit} className="add-tx-form">
            <div className="form-row">
              <div className="form-group">
                <label>Borrower Name</label>
                <input
                  type="text"
                  placeholder="Who borrowed this money?"
                  value={borrower}
                  onChange={(e) => setBorrower(e.target.value)}
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
                  value={lendingAmount}
                  onChange={(e) => setLendingAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row add-tx-category-date-row">
              <div className="form-group">
                <label>Date Lent</label>
                <input
                  type="date"
                  value={lendingDate}
                  onChange={(e) => setLendingDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Due Date (Optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            

            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                placeholder="Add details (e.g., reason, split details)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.5)',
                  border: '1px solid rgba(22, 28, 24, 0.12)',
                  color: '#101312',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            {error && <p className="add-tx-error">{error}</p>}

            <button
              type="submit"
              className="add-tx-submit"
              style={{ borderRadius: '10px', backgroundColor: '#121c17' }}
              disabled={loading}
            >
              {loading ? <Loader2 className="spinner" size={18} /> : 'Save Record'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
