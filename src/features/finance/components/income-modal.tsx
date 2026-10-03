// Your pay — declared once so savings goals can say whether a pace fits. Nothing is
// logged as income on /finance today, so without this the "can I afford it" half of a
// plan stays honestly blank rather than guessing.

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { FinanceAccount } from '@/types/finance'
import { financeService } from '@/services/finance-service'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import { getErrorMessage } from '@/lib/errors'
import { inr } from '@/lib/insights/engine'
import { cn } from '@/lib/utils'

interface IncomeModalProps {
  isOpen: boolean
  takeHome: number | null
  payday: number | null
  onClose: () => void
  onSaved: (plan: Pick<FinanceAccount, 'takeHomeMonthly' | 'payday'>) => void
}

const PAYDAYS: { day: number; label: string }[] = [
  { day: 1, label: '1st' },
  { day: 5, label: '5th' },
  { day: 7, label: '7th' },
  { day: 10, label: '10th' },
  { day: 15, label: '15th' },
  { day: 25, label: '25th' },
  { day: 31, label: 'Last day' },
]

export function IncomeModal({ isOpen, takeHome, payday, onClose, onSaved }: IncomeModalProps) {
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setAmount(takeHome ? String(Math.round(takeHome)) : '')
    setDay(payday ?? 1)
    setError('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, takeHome, payday])

  const isDirty = amount !== (takeHome ? String(Math.round(takeHome)) : '') || day !== (payday ?? 1)
  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(isDirty, onClose)
  if (!isOpen) return null

  const save = async (clear = false) => {
    setError('')
    const value = parseFloat(amount)
    if (!clear && (!Number.isFinite(value) || value <= 0)) {
      setError('Enter your monthly take-home')
      return
    }
    setLoading(true)
    try {
      const body = clear ? { takeHomeMonthly: null, payday: null } : { takeHomeMonthly: value, payday: day }
      const res = await financeService.updateIncomePlan(body)
      if (res.error) throw new Error(res.error.message)
      toast.success(clear ? 'Cleared your pay' : `Planning on ${inr(value)} on the ${PAYDAYS.find((p) => p.day === day)?.label ?? day}`)
      onSaved(body)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save your pay'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="finance-modal-backdrop" role="presentation" onClick={requestClose}>
        <div
          className="finance-modal-popover add-tx-modal fin-form-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Your pay"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="finance-modal-close" onClick={requestClose} aria-label="Close">
            <X size={15} />
          </button>
          <h2 className="fin-form-title">Your pay</h2>
          <form
            className="add-tx-form fin-form"
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            <label className="fin-amount-field">
              <span className="fin-amount-prefix">₹</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label="Monthly take-home in rupees"
                autoFocus
              />
              <span className="fin-amount-hint">take-home a month</span>
            </label>
            <div className="form-group">
              <label>Payday</label>
              <div className="fin-goal-chips">
                {PAYDAYS.map((p) => (
                  <button key={p.day} type="button" className={cn('fin-cat-chip', day === p.day && 'is-active')} onClick={() => setDay(p.day)}>
                    {p.label}
                  </button>
                ))}
              </div>
              <small className="fin-form-hint">
                Goals ask for their set-aside on this day — pay yourself first, before the month spends it.
              </small>
            </div>
            <div className="fin-form-preview">
              <span>Only used here</span>
              <b>Plans goals against it</b>
              <small>It isn't logged as income and never moves your balance.</small>
            </div>
            {error && <p className="add-tx-error">{error}</p>}
            <div className="fin-form-actions">
              {takeHome != null && (
                <button type="button" className="fin-form-delete is-quiet" onClick={() => void save(true)}>
                  Clear
                </button>
              )}
              <button type="submit" className="add-tx-submit" disabled={loading}>
                {loading ? <Loader2 className="spinner" size={18} /> : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {confirmCloseDialog}
    </>
  )
}
