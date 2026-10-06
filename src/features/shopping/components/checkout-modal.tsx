import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, ReceiptIndianRupee, X } from 'lucide-react'
import { localToday, SPENDING_CATEGORIES } from '@/lib/finance-ledger'
import type { ShoppingCheckoutPayload } from '@/types/shopping'

interface CheckoutModalProps {
  open: boolean
  count: number
  onClose: () => void
  onCheckout: (payload: ShoppingCheckoutPayload) => Promise<boolean>
}

/**
 * "Done shopping": what the shop cost (optional) and where. With an amount it becomes one
 * expense in Finance — "Groceries · DMart · 8 items" — then the basket empties.
 */
function CheckoutModal({ open, count, onClose, onCheckout }: CheckoutModalProps) {
  const [amount, setAmount] = useState('')
  const [store, setStore] = useState('')
  const [category, setCategory] = useState('Groceries')
  const [date, setDate] = useState(localToday())
  const [busy, setBusy] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setAmount('')
    setStore('')
    setCategory('Groceries')
    setDate(localToday())
    setBusy(false)
    /* eslint-enable react-hooks/set-state-in-effect */
    window.setTimeout(() => amountRef.current?.focus(), 30)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const value = Number(amount)
  const logs = Number.isFinite(value) && value > 0
  const description = [category, store.trim() || null, `${count} ${count === 1 ? 'item' : 'items'}`].filter(Boolean).join(' · ')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    const ok = await onCheckout({ amount: logs ? value : null, store: store.trim() || null, category, date })
    setBusy(false)
    if (ok) onClose()
  }

  return createPortal(
    <div className="shopping-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="shopping-edit-modal shopping-checkout-modal" role="dialog" aria-modal="true" aria-label="Done shopping" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="shopping-modal-close" onClick={onClose} aria-label="Close">
          <X size={15} />
        </button>
        <h2 className="shopping-modal-title">Done shopping</h2>
        <p className="shopping-modal-sub">
          {count} {count === 1 ? 'item' : 'items'} in the basket. Add what it cost to log it in Finance — or just clear the basket.
        </p>

        <form onSubmit={submit} className="shopping-modal-form">
          <label className="shopping-amount">
            <span>₹</span>
            <input
              ref={amountRef}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="What the shop cost, in rupees"
            />
          </label>
          <div className="shopping-field-row">
            <label className="shopping-field">
              <span>Where</span>
              <input value={store} onChange={(e) => setStore(e.target.value)} placeholder="DMart" maxLength={60} autoComplete="off" />
            </label>
            <label className="shopping-field">
              <span>Day</span>
              <input type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value || localToday())} />
            </label>
          </div>
          <label className="shopping-field">
            <span>Files under</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {SPENDING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <p className={logs ? 'shopping-ledger-line' : 'shopping-ledger-line is-muted'}>
            <ReceiptIndianRupee size={13} strokeWidth={2.3} />
            {logs ? (
              <span>
                Logs <b>₹{Math.round(value).toLocaleString('en-IN')}</b> as <b>{description}</b>
              </span>
            ) : (
              <span>Nothing is logged without an amount.</span>
            )}
          </p>

          <div className="shopping-modal-actions is-end">
            <button type="button" className="shopping-ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="shopping-modal-save" disabled={busy}>
              {busy ? <Loader2 className="spinner" size={16} /> : logs ? 'Log & clear' : 'Clear basket'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

export { CheckoutModal }
