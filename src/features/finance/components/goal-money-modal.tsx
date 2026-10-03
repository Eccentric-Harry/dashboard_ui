// Moving money for a savings goal: set some aside, take some back out, or record buying
// the thing. Every one is a ledger row the user chose to write — nothing moves on its own.
//
// Taking money out is allowed, never blocked, but it asks why and shows what it costs the
// plan first: people raid savings goals (CFPB's Qapital study — most goals stayed open,
// few kept their money), and a moment's friction plus the honest effect is the guard.

import { createElement, useEffect, useState, type CSSProperties } from 'react'
import { Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SavingsGoal } from '@/types/finance'
import { financeService } from '@/services/finance-service'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import { getErrorMessage } from '@/lib/errors'
import { inr } from '@/lib/insights/engine'
import { goalDays, spanWords, type GoalColor, type GoalPlan } from '@/lib/finance-goals'
import { localToday } from '@/lib/finance-ledger'
import { cn } from '@/lib/utils'
import { getConsistentColor, getIconForCategory } from '../utils'
import { goalIcon } from '../goal-icons'

export type GoalMoneyMode = 'set-aside' | 'take-out' | 'buy'

interface GoalMoneyModalProps {
  isOpen: boolean
  mode: GoalMoneyMode
  plan: GoalPlan | null
  color: GoalColor
  /** Pre-filled amount (this payday's due, a leftover sweep). */
  initialAmount?: number
  /** Pre-filled note — a leftover sweep's "September leftover". */
  initialNote?: string
  onClose: () => void
  onDone: (updated: SavingsGoal, mode: GoalMoneyMode) => void
}

const REASONS = ['Emergency', 'Changed plans', 'Moving it to another goal', 'Something else']
const PURCHASE_CATEGORIES = ['Shopping', 'Electronics', 'Travel', 'Gifts', 'Home', 'Health', 'Education']

const TITLE: Record<GoalMoneyMode, string> = {
  'set-aside': 'Set aside',
  'take-out': 'Take money out',
  buy: 'Bought it',
}

export function GoalMoneyModal({ isOpen, mode, plan, color, initialAmount, initialNote, onClose, onDone }: GoalMoneyModalProps) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(localToday)
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [category, setCategory] = useState('Shopping')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !plan) return
    /* eslint-disable react-hooks/set-state-in-effect */
    const prefill =
      initialAmount ??
      (mode === 'buy' ? plan.target ?? plan.saved : mode === 'set-aside' && plan.dueThisCycle >= 1 ? Math.round(plan.dueThisCycle) : undefined)
    setAmount(prefill ? String(Math.round(prefill)) : '')
    setDate(localToday())
    setNote(initialNote ?? '')
    setReason('')
    setCategory(plan.goal.kind === 'TRIP' ? 'Travel' : 'Shopping')
    setError('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, plan, mode, initialAmount, initialNote])

  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(Boolean(note.trim() || reason), onClose)

  if (!isOpen || !plan) return null
  const { goal } = plan
  const value = parseFloat(amount)
  const valid = Number.isFinite(value) && value > 0

  // ── The "so what" line ───────────────────────────────────────────────────
  let preview: { label: string; main: string; sub?: string } | null = null
  if (valid && mode === 'set-aside') {
    const after = plan.saved + value
    preview = {
      label: 'After this',
      main: plan.target != null
        ? `${inr(after)} of ${inr(plan.target)} · ${Math.min(100, Math.round((after / plan.target) * 100))}%`
        : `${inr(after)} set aside`,
      sub: goal.keptAt ? `Move it to ${goal.keptAt} so it stays out of reach.` : 'Lowers your spendable balance — never counts as spending.',
    }
  } else if (valid && mode === 'take-out') {
    const days = goalDays(value, plan)
    preview = {
      label: 'What it costs the plan',
      main: `Leaves ${inr(Math.max(0, plan.saved - value))}${days ? ` · about ${spanWords(days)} more saving` : ''}`,
      sub: 'Comes back to your balance. Your plan re-spreads what\'s left — nothing is lost.',
    }
  } else if (valid && mode === 'buy') {
    const fromGoal = Math.min(plan.saved, value)
    const fromBalance = value - fromGoal
    preview = {
      label: 'How it\'s paid',
      main: fromBalance > 0 ? `${inr(fromGoal)} from the goal + ${inr(fromBalance)} from your balance` : `All ${inr(value)} from the goal`,
      sub:
        fromGoal < plan.saved
          ? `${inr(plan.saved - fromGoal)} stays set aside. Never counts against your monthly budget.`
          : 'Never counts against your monthly budget — you saved for it.',
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!valid) {
      setError('Enter an amount greater than 0')
      return
    }
    if (mode === 'take-out' && value > plan.saved) {
      setError(`Only ${inr(plan.saved)} is set aside`)
      return
    }
    if (mode === 'take-out' && !reason) {
      setError('What is it for?')
      return
    }
    setLoading(true)
    try {
      const res =
        mode === 'set-aside'
          ? await financeService.setAsideForGoal(goal.id, { amount: value, date, note: note.trim() || undefined })
          : mode === 'take-out'
            ? await financeService.takeOutOfGoal(goal.id, { amount: value, date, note: reason })
            : await financeService.buyGoal(goal.id, { price: value, date, category, description: goal.name })
      if (res.error) throw new Error(res.error.message)
      toast.success(
        mode === 'set-aside'
          ? `Set aside ${inr(value)} for ${goal.name}`
          : mode === 'take-out'
            ? `Took ${inr(value)} out of ${goal.name}`
            : `Bought ${goal.name} — it won't touch your budget`,
      )
      if (res.data) onDone(res.data, mode)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="finance-modal-backdrop" role="presentation" onClick={requestClose}>
        <div
          className={cn('finance-modal-popover add-tx-modal fin-form-modal fin-goal-modal', `fin-goal--${color}`)}
          role="dialog"
          aria-modal="true"
          aria-label={`${TITLE[mode]} — ${goal.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="finance-modal-close" onClick={requestClose} aria-label="Close">
            <X size={15} />
          </button>

          <h2 className="fin-form-title fin-goal-money-title">
            <span className="fin-goal-title-ic" aria-hidden="true">
              {createElement(goalIcon(goal), { size: 15, strokeWidth: 2.4 })}
            </span>
            {TITLE[mode]} <em>{mode === 'buy' ? goal.name : `· ${goal.name}`}</em>
          </h2>

          <form onSubmit={handleSubmit} className="add-tx-form fin-form">
            <label className="fin-amount-field">
              <span className="fin-amount-prefix">₹</span>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                min="1"
                max={mode === 'take-out' ? plan.saved : undefined}
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label={mode === 'buy' ? 'What it cost' : 'Amount in rupees'}
                autoFocus
              />
              <span className="fin-amount-hint">
                {mode === 'buy' ? 'what it cost' : mode === 'take-out' ? `of ${inr(plan.saved)}` : plan.dueThisCycle >= 1 ? `${inr(plan.dueThisCycle)} due` : ''}
              </span>
            </label>

            {mode === 'take-out' && (
              <div className="form-group">
                <label>What's it for?</label>
                <div className="fin-goal-chips">
                  {REASONS.map((r) => (
                    <button key={r} type="button" className={cn('fin-cat-chip', reason === r && 'is-active')} onClick={() => setReason(r)}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'buy' && (
              <div className="form-group">
                <label>Files the purchase under</label>
                <div className="fin-chip-grid" role="listbox" aria-label="Category">
                  {PURCHASE_CATEGORIES.map((c) => {
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
            )}

            <div className={cn('form-row add-tx-category-date-row', mode !== 'set-aside' && 'is-single')}>
              <div className="form-group">
                <label htmlFor="fin-goal-money-date">Date</label>
                <input id="fin-goal-money-date" type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value)} />
              </div>
              {mode === 'set-aside' && (
                <div className="form-group">
                  <label htmlFor="fin-goal-money-note">Note (optional)</label>
                  <input id="fin-goal-money-note" type="text" maxLength={80} placeholder="e.g. October payday" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
              )}
            </div>

            {preview && (
              <div className="fin-form-preview fin-goal-preview">
                <span>{preview.label}</span>
                <b>{preview.main}</b>
                {preview.sub && <small>{preview.sub}</small>}
              </div>
            )}

            {error && <p className="add-tx-error">{error}</p>}

            <button type="submit" className={cn('add-tx-submit', mode === 'take-out' && 'is-quiet')} disabled={loading}>
              {loading ? <Loader2 className="spinner" size={18} /> : mode === 'set-aside' ? 'Set it aside' : mode === 'take-out' ? 'Take it out' : 'Record the purchase'}
            </button>
          </form>
        </div>
      </div>
      {confirmCloseDialog}
    </>
  )
}
