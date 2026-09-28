import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { BillingUnit, SubscriptionDTO } from '@/types/finance'
import { financeService } from '@/services/finance-service'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import { getErrorMessage } from '@/lib/errors'
import { localToday } from '@/lib/finance-ledger'
import { cycleLabel, monthlyCostOf } from '@/lib/finance-recurring'
import { cn } from '@/lib/utils'
import { getConsistentColor, getIconForCategory } from '../utils'

interface BillModalProps {
  isOpen: boolean
  /** The bill being edited; null to add a new one. */
  bill: SubscriptionDTO | null
  /** Pre-fills the due date when editing (the bill's computed next due date). */
  nextDue?: string | null
  onClose: () => void
  onSaved: () => void
  onDelete?: (bill: SubscriptionDTO) => void
}

const CYCLES: { unit: BillingUnit; count: number }[] = [
  { unit: 'WEEK', count: 1 },
  { unit: 'DAY', count: 28 },
  { unit: 'MONTH', count: 1 },
  { unit: 'MONTH', count: 2 },
  { unit: 'MONTH', count: 3 },
  { unit: 'MONTH', count: 6 },
  { unit: 'YEAR', count: 1 },
]

const CATEGORIES = ['Subscriptions', 'Bills', 'Rent', 'Utilities', 'Insurance', 'EMI', 'Health', 'Entertainment']

const cycleKey = (unit: BillingUnit, count: number) => `${unit}:${count}`

export function BillModal({ isOpen, bill, nextDue, onClose, onSaved, onDelete }: BillModalProps) {
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [cycle, setCycle] = useState(cycleKey('MONTH', 1))
  const [dueDate, setDueDate] = useState('')
  const [category, setCategory] = useState('Subscriptions')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setName(bill?.name ?? '')
    setCost(bill ? String(bill.cost) : '')
    setCycle(cycleKey(bill?.intervalUnit ?? 'MONTH', bill?.intervalCount ?? 1))
    setDueDate(nextDue ?? bill?.billingDate ?? '')
    setCategory(bill?.category ?? 'Subscriptions')
    setError('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, bill, nextDue])

  const [unit, countStr] = cycle.split(':') as [BillingUnit, string]
  const count = Number(countStr)

  // An existing bill on a cycle outside the presets (say, every 30 days) keeps it as an option.
  const cycleOptions = useMemo(() => {
    const options = [...CYCLES]
    if (!options.some((c) => cycleKey(c.unit, c.count) === cycle)) options.push({ unit, count })
    return options
  }, [cycle, unit, count])

  const categoryOptions = useMemo(
    () => (CATEGORIES.includes(category) ? CATEGORIES : [category, ...CATEGORIES]),
    [category],
  )

  const numCost = parseFloat(cost)
  const perMonth = Number.isFinite(numCost) && numCost > 0
    ? monthlyCostOf({ id: '', name, cost: numCost, billingDate: null, intervalUnit: unit, intervalCount: count })
    : null

  const isDirty = bill
    ? name !== bill.name ||
      cost !== String(bill.cost) ||
      category !== (bill.category ?? 'Subscriptions') ||
      cycle !== cycleKey(bill.intervalUnit ?? 'MONTH', bill.intervalCount ?? 1) ||
      dueDate !== (nextDue ?? bill.billingDate ?? '')
    : Boolean(name.trim() || cost.trim())
  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(isDirty, onClose)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Give the bill a name')
      return
    }
    if (!Number.isFinite(numCost) || numCost <= 0) {
      setError('Amount must be greater than 0')
      return
    }
    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        cost: numCost,
        billingDate: dueDate || undefined,
        category,
        intervalUnit: unit,
        intervalCount: count,
      }
      const res = bill
        ? await financeService.updateSubscription(bill.id, payload)
        : await financeService.addSubscription(payload)
      if (res.error) throw new Error(res.error.message)
      toast.success(bill ? `Updated ${payload.name}` : `Added ${payload.name}`)
      onSaved()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save bill'))
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <>
      <div className="finance-modal-backdrop" role="presentation" onClick={requestClose}>
        <div
          className="finance-modal-popover add-tx-modal fin-form-modal"
          role="dialog"
          aria-modal="true"
          aria-label={bill ? `Edit ${bill.name}` : 'Add bill or subscription'}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="finance-modal-close" onClick={requestClose} aria-label="Close">
            <X size={15} />
          </button>

          <h2 className="fin-form-title">{bill ? 'Edit bill' : 'Add bill or subscription'}</h2>

          <form onSubmit={handleSubmit} className="add-tx-form fin-form">
            <label className="fin-amount-field">
              <span className="fin-amount-prefix">₹</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                aria-label="Amount per payment in rupees"
                autoFocus={!bill}
              />
              {perMonth != null && (unit !== 'MONTH' || count !== 1) && (
                <span className="fin-amount-hint">≈ ₹{Math.round(perMonth).toLocaleString('en-IN')}/month</span>
              )}
            </label>

            <div className="form-group">
              <label htmlFor="fin-bill-name">Name</label>
              <input
                id="fin-bill-name"
                type="text"
                placeholder="e.g. Netflix, PG Rent, Jio Prepaid"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>

            <div className="form-row add-tx-category-date-row">
              <div className="form-group">
                <label htmlFor="fin-bill-cycle">Repeats</label>
                <select id="fin-bill-cycle" value={cycle} onChange={(e) => setCycle(e.target.value)}>
                  {cycleOptions.map((c) => (
                    <option key={cycleKey(c.unit, c.count)} value={cycleKey(c.unit, c.count)}>
                      {cycleLabel({ intervalUnit: c.unit, intervalCount: c.count })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="fin-bill-due">Next due</label>
                <input
                  id="fin-bill-due"
                  type="date"
                  value={dueDate}
                  min={bill ? undefined : localToday()}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Files payments under</label>
              <div className="fin-chip-grid" role="listbox" aria-label="Category">
                {categoryOptions.map((c) => {
                  const Icon = getIconForCategory(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      role="option"
                      aria-selected={category === c}
                      className={cn('fin-cat-chip', category === c && 'is-active')}
                      style={{ '--chip-hue': getConsistentColor(c) } as CSSProperties}
                      onClick={() => setCategory(c)}
                    >
                      <Icon size={12} strokeWidth={2.4} />
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && <p className="add-tx-error">{error}</p>}

            <div className="fin-form-actions">
              {bill && onDelete && (
                <button type="button" className="fin-form-delete" onClick={() => onDelete(bill)}>
                  <Trash2 size={14} strokeWidth={2.2} /> Delete
                </button>
              )}
              <button type="submit" className="add-tx-submit" disabled={loading}>
                {loading ? <Loader2 className="spinner" size={18} /> : bill ? 'Save changes' : 'Add bill'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {confirmCloseDialog}
    </>,
    document.body,
  )
}
