import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { BudgetScope, FinanceAccount } from '@/types/finance'
import { financeService } from '@/services/finance-service'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import { getErrorMessage } from '@/lib/errors'
import { DEFAULT_FIXED_CATEGORIES, summarize, type LedgerEntry } from '@/lib/finance-ledger'
import { cn } from '@/lib/utils'
import { getConsistentColor } from '../utils'

interface EditBudgetModalProps {
  isOpen: boolean
  currentBudget: number
  currentScope: BudgetScope
  currentFixed: string[]
  /** The month in view — powers the live "what this would mean" preview. */
  monthEntries: LedgerEntry[]
  /** Every spending category the user has logged, for the fixed-category picker. */
  spendingCategories: string[]
  onClose: () => void
  onSuccess: (saved: Pick<FinanceAccount, 'monthlyBudget'> & Partial<FinanceAccount>) => void
}

const SCOPES: { scope: BudgetScope; title: string; body: string }[] = [
  { scope: 'FLEX', title: 'Everyday spending', body: 'Food, travel, shopping. Rent and bills are planned separately.' },
  { scope: 'ALL', title: 'Everything', body: 'Every rupee of spending, rent and bills included.' },
]

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

export function EditBudgetModal({
  isOpen,
  currentBudget,
  currentScope,
  currentFixed,
  monthEntries,
  spendingCategories,
  onClose,
  onSuccess,
}: EditBudgetModalProps) {
  const [amount, setAmount] = useState('')
  const [scope, setScope] = useState<BudgetScope>('ALL')
  const [fixed, setFixed] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setAmount(currentBudget ? String(currentBudget) : '')
    setScope(currentScope)
    setFixed(currentFixed)
    setError('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, currentBudget, currentScope, currentFixed])

  // Defaults the user actually uses first, then the rest of their categories.
  const fixedOptions = useMemo(() => {
    const used = new Set(spendingCategories)
    return [...new Set([...DEFAULT_FIXED_CATEGORIES.filter((c) => used.has(c)), ...fixed, ...spendingCategories])]
  }, [spendingCategories, fixed])

  const numAmount = parseFloat(amount)
  const preview = useMemo(() => summarize(monthEntries, { scope, fixedCategories: fixed }), [monthEntries, scope, fixed])

  const isDirty =
    amount !== String(currentBudget) || scope !== currentScope || fixed.join('|') !== currentFixed.join('|')
  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(isDirty, onClose)

  if (!isOpen) return null

  const toggleFixed = (category: string) =>
    setFixed((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a positive amount')
      return
    }
    setLoading(true)
    try {
      const res = await financeService.updateBudget({ monthlyBudget: numAmount, budgetScope: scope, fixedCategories: fixed })
      if (res.error) throw new Error(res.error.message)
      const saved = res.data ?? { monthlyBudget: numAmount, budgetScope: scope, fixedCategories: fixed, balance: 0 }
      toast.success(`Budget set to ${rupees(saved.monthlyBudget)} · ${scope === 'FLEX' ? 'everyday spending' : 'all spending'}`)
      onSuccess(saved)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update budget'))
    } finally {
      setLoading(false)
    }
  }

  const left = Number.isFinite(numAmount) ? numAmount - preview.budgeted : null

  return (
    <>
      <div className="finance-modal-backdrop" role="presentation" onClick={requestClose}>
        <div
          className="finance-modal-popover add-tx-modal fin-form-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Monthly budget"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="finance-modal-close" onClick={requestClose} aria-label="Close">
            <X size={15} />
          </button>

          <h2 className="fin-form-title">Monthly budget</h2>

          <form onSubmit={handleSubmit} className="add-tx-form fin-form">
            <label className="fin-amount-field">
              <span className="fin-amount-prefix">₹</span>
              <input
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                placeholder="20000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label="Monthly budget in rupees"
                autoFocus
              />
            </label>

            <div className="form-group">
              <label>What does it cover?</label>
              <div className="fin-scope-options" role="radiogroup" aria-label="Budget covers">
                {SCOPES.map((s) => (
                  <button
                    key={s.scope}
                    type="button"
                    role="radio"
                    aria-checked={scope === s.scope}
                    className={cn('fin-scope-option', scope === s.scope && 'is-active')}
                    onClick={() => setScope(s.scope)}
                  >
                    <b>{s.title}</b>
                    <small>{s.body}</small>
                  </button>
                ))}
              </div>
            </div>

            {scope === 'FLEX' && (
              <div className="form-group">
                <label>Fixed costs — tracked, but not counted against this budget</label>
                <div className="fin-chip-grid">
                  {fixedOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={fixed.includes(c)}
                      className={cn('fin-cat-chip', fixed.includes(c) && 'is-active')}
                      style={{ '--chip-hue': getConsistentColor(c) } as CSSProperties}
                      onClick={() => toggleFixed(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <small className="fin-form-hint">Payments against a tracked bill always count as fixed.</small>
              </div>
            )}

            <div className="fin-form-preview">
              <span>This month so far</span>
              <b>
                {rupees(preview.budgeted)} counted
                {left != null && (left >= 0 ? ` · ${rupees(left)} left` : ` · ${rupees(-left)} over`)}
              </b>
              {scope === 'FLEX' && preview.fixed > 0 && <small>{rupees(preview.fixed)} of rent & bills set aside</small>}
            </div>

            {error && <p className="add-tx-error">{error}</p>}

            <button type="submit" className="add-tx-submit" disabled={loading}>
              {loading ? <Loader2 className="spinner" size={18} /> : 'Save budget'}
            </button>
          </form>
        </div>
      </div>
      {confirmCloseDialog}
    </>
  )
}
