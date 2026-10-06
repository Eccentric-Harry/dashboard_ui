import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, PiggyBank, ReceiptIndianRupee, X } from 'lucide-react'
import { inr } from '@/lib/insights/engine'
import { localToday, SPENDING_CATEGORIES } from '@/lib/finance-ledger'
import type { SavingsGoal } from '@/types/finance'
import type { WishlistBuyPayload, WishlistItem } from '@/types/wishlist'
import { WishPhoto } from './wish-card'

interface WishBuyModalProps {
  wish: WishlistItem | null
  goal: SavingsGoal | undefined
  budgetLeft: number | null
  onClose: () => void
  onBuy: (wish: WishlistItem, payload: WishlistBuyPayload) => Promise<boolean>
}

/**
 * "Bought it": what it really cost and when. Says exactly what will happen in Finance before it
 * happens — a plain expense, or (with a savings goal) the saved money coming back and the
 * purchase staying off the monthly budget.
 */
export function WishBuyModal({ wish, goal, budgetLeft, onClose, onBuy }: WishBuyModalProps) {
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(localToday())
  const [category, setCategory] = useState('Shopping')
  const [busy, setBusy] = useState(false)
  const priceRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!wish) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setPrice(wish.price != null ? String(Math.round(wish.price)) : '')
    setDate(localToday())
    setCategory('Shopping')
    setBusy(false)
    /* eslint-enable react-hooks/set-state-in-effect */
    window.setTimeout(() => priceRef.current?.select(), 30)
  }, [wish])

  useEffect(() => {
    if (!wish) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [wish, onClose])

  if (!wish) return null

  const value = Number(price)
  const valid = Number.isFinite(value) && value > 0
  const fromGoal = goal ? Math.min(goal.saved, valid ? value : 0) : 0
  const categories = SPENDING_CATEGORIES.includes(category) ? SPENDING_CATEGORIES : [category, ...SPENDING_CATEGORIES]

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    const ok = await onBuy(wish, { price: value, date, category })
    setBusy(false)
    if (ok) onClose()
  }

  return createPortal(
    <div className="shopping-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="shopping-edit-modal wish-buy-modal" role="dialog" aria-modal="true" aria-label={`Bought ${wish.name}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="shopping-modal-close" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
        <div className="wish-buy-head">
          <WishPhoto wish={wish} className="is-thumb" />
          <div>
            <h2 className="shopping-modal-title">Bought it</h2>
            <p className="shopping-modal-sub">{wish.name}</p>
          </div>
        </div>

        <form onSubmit={submit} className="shopping-modal-form">
          <label className="shopping-amount">
            <span>₹</span>
            <input
              ref={priceRef}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-label="What it cost, in rupees"
            />
          </label>
          <div className="shopping-field-row is-even">
            <label className="shopping-field">
              <span>Day</span>
              <input type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value || localToday())} />
            </label>
            <label className="shopping-field">
              <span>Files under</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {goal ? (
            <p className="shopping-ledger-line">
              <PiggyBank size={13} strokeWidth={2.3} />
              <span>
                Paid from <b>{goal.name}</b>: {inr(fromGoal)} comes back from the goal
                {valid && value > fromGoal ? `, ${inr(value - fromGoal)} from your balance` : ''}. It stays off your monthly budget.
              </span>
            </p>
          ) : (
            <p className="shopping-ledger-line">
              <ReceiptIndianRupee size={13} strokeWidth={2.3} />
              <span>
                Logs {valid ? <b>{inr(value)}</b> : 'it'} as spending in Finance
                {valid && budgetLeft != null
                  ? value <= budgetLeft
                    ? ` — leaves ${inr(budgetLeft - value)} of this month’s budget.`
                    : ` — ${inr(value - budgetLeft)} more than what’s left this month.`
                  : '.'}
              </span>
            </p>
          )}

          <div className="shopping-modal-actions is-end">
            <button type="button" className="shopping-ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="shopping-modal-save" disabled={!valid || busy}>
              {busy ? <Loader2 className="spinner" size={16} /> : 'Log purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
