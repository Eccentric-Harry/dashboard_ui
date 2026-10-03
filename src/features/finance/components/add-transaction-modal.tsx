import { createElement, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowDownLeft, ArrowUpRight, Loader2, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { LendingRecord, TransactionType, TransferDirection } from '@/types/finance'
import { financeService } from '@/services/finance-service'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import {
  FAMILY_CATEGORY,
  INCOME_CATEGORIES,
  localToday,
  SPENDING_CATEGORIES,
  TRANSFER_IN_CATEGORIES,
  TRANSFER_OUT_CATEGORIES,
  type LedgerEntry,
  type TxKind,
} from '@/lib/finance-ledger'
import { spanWords } from '@/lib/finance-goals'
import { GOAL_ICONS, type GoalTag } from '../goal-icons'
import { cn } from '@/lib/utils'
import { getConsistentColor, getIconForCategory } from '../utils'

/** Transfers in this category can belong to a savings goal. */
const SAVINGS_CATEGORY = 'Savings'

import faaahAudio from '@/assets/faaah.mp3'
import { getErrorMessage } from '@/lib/errors'

/** A ledger transaction as the form edits it. */
export interface TransactionFormData {
  id?: string
  description: string
  amount: number
  category: string
  type: TransactionType
  direction?: TransferDirection
  date: string
  /** The savings goal a Savings transfer belongs to. */
  goalId?: string | null
}

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  isEdit?: boolean
  initialTab?: 'Transaction' | 'Lending'
  initialTransactionData?: TransactionFormData | null
  initialLendingData?: LendingRecord | null
  /** Starting values for a new entry — e.g. the Transfers card's "Log money sent home". */
  preset?: Partial<TransactionFormData> | null
  /** Past ledger rows: ranks the category chips and powers merchant memory. */
  history?: LedgerEntry[]
  /** Edit mode only — asks the route to confirm and delete. */
  onDelete?: (tx: TransactionFormData) => void
  /** Live savings goals, offered when money moves into or out of Savings. */
  goals?: (GoalTag & { id: string })[]
  /** The lead savings goal, for "≈ 2 weeks of saving for iPhone 18 Pro" under a big expense. */
  goalLens?: { name: string; perDay: number } | null
}

const KINDS: { type: TransactionType; label: string }[] = [
  { type: 'Expense', label: 'Expense' },
  { type: 'Transfer', label: 'Transfer' },
  { type: 'Income', label: 'Income' },
]

const kindOf = (type: TransactionType, direction: TransferDirection): TxKind =>
  type === 'Income' ? 'income' : type === 'Expense' ? 'spending' : direction === 'IN' ? 'transfer-in' : 'transfer-out'

const defaultsFor = (kind: TxKind): string[] =>
  kind === 'income'
    ? INCOME_CATEGORIES
    : kind === 'transfer-out'
      ? TRANSFER_OUT_CATEGORIES
      : kind === 'transfer-in'
        ? TRANSFER_IN_CATEGORIES
        : SPENDING_CATEGORIES

const CHIP_LIMIT = 11

export function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  isEdit,
  initialTab = 'Transaction',
  initialTransactionData,
  initialLendingData,
  preset,
  history = [],
  onDelete,
  goals = [],
  goalLens = null,
}: AddTransactionModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'Transaction' | 'Lending'>('Transaction')

  // Transaction form
  const [type, setType] = useState<TransactionType>('Expense')
  const [direction, setDirection] = useState<TransferDirection>('OUT')
  const [category, setCategory] = useState('')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [customCategory, setCustomCategory] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(localToday)
  const [goalId, setGoalId] = useState<string | null>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  // Lending form
  const [borrower, setBorrower] = useState('')
  const [lendingAmount, setLendingAmount] = useState('')
  const [lendingDate, setLendingDate] = useState(localToday)
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<'Pending' | 'Repaid'>('Pending')
  const [notes, setNotes] = useState('')
  const [logLendingTransfer, setLogLendingTransfer] = useState(true)

  useEffect(() => {
    if (!isOpen) return
    const tab = initialTab || (initialLendingData ? 'Lending' : 'Transaction')
    /* eslint-disable react-hooks/set-state-in-effect */
    setActiveTab(tab)
    setError('')
    setCustomCategory(null)
    const tx = isEdit ? initialTransactionData : preset
    setType(tx?.type ?? 'Expense')
    setDirection(tx?.direction ?? 'OUT')
    setCategory(tx?.category ?? '')
    setCategoryTouched(Boolean(tx?.category))
    setAmount(tx?.amount ? String(tx.amount) : '')
    setDescription(tx?.description ?? '')
    setDate(tx?.date ?? localToday())
    setGoalId(tx?.goalId ?? null)

    const lend = isEdit ? initialLendingData : null
    setBorrower(lend?.borrower ?? '')
    setLendingAmount(lend ? String(lend.amount) : '')
    setLendingDate(lend?.date ? lend.date.slice(0, 10) : localToday())
    setDueDate(lend?.dueDate ? lend.dueDate.slice(0, 10) : '')
    setStatus(lend?.status ?? 'Pending')
    setNotes(lend?.notes ?? '')
    setLogLendingTransfer(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, isEdit, initialTab, initialTransactionData, initialLendingData, preset])

  const kind = kindOf(type, direction)

  // Categories this kind has actually used, most-used first, topped up with defaults.
  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of history) {
      if (e.kind === kind) counts.set(e.category, (counts.get(e.category) ?? 0) + 1)
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
    const merged = [...new Set([...ranked, ...defaultsFor(kind)])]
      // A legacy spelling of Family shouldn't be offered next to Family itself.
      .filter((c) => !(kind === 'transfer-out' && c === 'To Home'))
      .slice(0, CHIP_LIMIT)
    if (category && !merged.includes(category)) merged.unshift(category)
    return merged
  }, [history, kind, category])

  // Merchant memory: the last category each description was filed under, per kind.
  const memory = useMemo(() => {
    const byDescription = new Map<string, { description: string; category: string }>()
    for (const e of history) {
      if (e.kind !== kind || !e.description) continue
      const key = e.description.trim().toLowerCase()
      if (!byDescription.has(key)) byDescription.set(key, { description: e.description.trim(), category: e.category })
    }
    return byDescription
  }, [history, kind])

  // Editing an existing row starts filled in, so it's only dirty once something changes.
  const editing = isEdit && activeTab === 'Transaction' ? initialTransactionData : null
  const isDirty = editing
    ? amount !== String(editing.amount) ||
      description !== editing.description ||
      (customCategory ?? category) !== editing.category ||
      type !== editing.type ||
      date !== editing.date ||
      goalId !== (editing.goalId ?? null)
    : Boolean(
        (isEdit ? '' : amount.trim() || description.trim()) ||
          borrower.trim() || lendingAmount.trim() || dueDate.trim() || notes.trim(),
      )
  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(isDirty, onClose)

  if (!isOpen) return null

  const chooseKind = (next: TransactionType) => {
    setType(next)
    if (!categoryTouched) setCategory('')
    if (next === 'Transfer' && !categoryTouched) setCategory(FAMILY_CATEGORY)
  }

  const onDescriptionChange = (value: string) => {
    setDescription(value)
    const remembered = memory.get(value.trim().toLowerCase())
    if (remembered && !categoryTouched) setCategory(remembered.category)
  }

  const pickCategory = (value: string) => {
    setCategory(value)
    setCategoryTouched(true)
    setCustomCategory(null)
  }

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const finalCategory = (customCategory ?? category).trim()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Enter an amount greater than 0')
      amountRef.current?.focus()
      return
    }
    if (!description.trim()) {
      setError('Add a short description')
      return
    }
    if (!finalCategory) {
      setError('Pick a category')
      return
    }

    setLoading(true)
    try {
      const offersGoals = type === 'Transfer' && finalCategory === SAVINGS_CATEGORY && goals.length > 0
      const initialGoal = initialTransactionData?.goalId ?? null
      // A plain edit never touches the goal link (omitted = keep); '' unlinks it.
      const goalField = offersGoals
        ? isEdit
          ? goalId !== initialGoal ? { goalId: goalId ?? '' } : {}
          : goalId ? { goalId } : {}
        : {}
      const payload = {
        description: description.trim(),
        amount: numAmount,
        category: finalCategory,
        type,
        direction: type === 'Transfer' ? direction : undefined,
        date,
        ...goalField,
      }
      const verb = isEdit ? 'Updated' : 'Saved'
      const res = isEdit && initialTransactionData?.id
        ? await financeService.updateTransaction(initialTransactionData.id, payload)
        : await financeService.addTransaction(payload)
      if (res.error) throw new Error(res.error.message)
      toast.success(`${verb} "${payload.description}" (₹${numAmount.toLocaleString('en-IN')})`)

      // The route's signature "faaah" is for spending — sending money home isn't a splurge.
      if (type === 'Expense' && !isEdit) {
        const audio = new Audio(faaahAudio)
        audio.play().catch(() => undefined)
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save transaction'))
    } finally {
      setLoading(false)
    }
  }

  const handleLendingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!borrower.trim() || !lendingAmount || !lendingDate) {
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
        borrower: borrower.trim(),
        amount: numAmount,
        date: lendingDate,
        dueDate: dueDate || undefined,
        status,
        notes: notes || undefined,
      }
      if (isEdit && initialLendingData?.id) {
        const res = await financeService.updateLending(initialLendingData.id, payload)
        if (res.error) throw new Error(res.error.message)
        toast.success(`Updated lending to ${payload.borrower}`)
      } else {
        const res = await financeService.addLending(payload)
        if (res.error) throw new Error(res.error.message)
        // Lending is money out, not spending: the balance drops, the budget doesn't.
        if (logLendingTransfer) {
          const tx = await financeService.addTransaction({
            description: `Lent to ${payload.borrower}`,
            amount: numAmount,
            category: 'Lending',
            type: 'Transfer',
            direction: 'OUT',
            date: lendingDate,
          })
          if (tx.error) toast.error(`Lending saved, but the transfer wasn't logged: ${tx.error.message}`)
        }
        toast.success(`Recorded ₹${numAmount.toLocaleString('en-IN')} lent to ${payload.borrower}`)
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save lending record'))
    } finally {
      setLoading(false)
    }
  }

  const title = isEdit
    ? activeTab === 'Lending' ? 'Edit lending' : 'Edit transaction'
    : activeTab === 'Lending' ? 'Record lending' : 'Add transaction'

  const kindIndex = KINDS.findIndex((k) => k.type === type)
  const numericAmount = parseFloat(amount)
  const goalDaysOfSpend =
    goalLens && type === 'Expense' && !isEdit && Number.isFinite(numericAmount) && numericAmount >= 500
      ? numericAmount / goalLens.perDay
      : null
  const showGoalChips = type === 'Transfer' && (customCategory ?? category) === SAVINGS_CATEGORY && goals.length > 0

  return (
    <>
      <div className="finance-modal-backdrop" role="presentation" onClick={requestClose}>
        <div
          className="finance-modal-popover add-tx-modal fin-form-modal"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="finance-modal-close" onClick={requestClose} aria-label="Close">
            <X size={15} />
          </button>

          <h2 className="fin-form-title">{title}</h2>

          {!isEdit && (
            <div className="fin-seg fin-seg--tabs" style={{ '--seg-count': 2, '--seg-i': activeTab === 'Lending' ? 1 : 0 } as CSSProperties}>
              <span className="fin-seg-pill" aria-hidden="true" />
              {(['Transaction', 'Lending'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={cn(activeTab === tab && 'is-active')}
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'Transaction' ? (
            <form onSubmit={handleTransactionSubmit} className="add-tx-form fin-form">
              <div className={cn('fin-seg', `is-${kind}`)} style={{ '--seg-count': 3, '--seg-i': kindIndex } as CSSProperties}>
                <span className="fin-seg-pill" aria-hidden="true" />
                {KINDS.map((k) => (
                  <button
                    key={k.type}
                    type="button"
                    className={cn(type === k.type && 'is-active')}
                    onClick={() => chooseKind(k.type)}
                    aria-pressed={type === k.type}
                  >
                    {k.label}
                  </button>
                ))}
              </div>

              {type === 'Transfer' && (
                <div className="fin-transfer-note">
                  <div className="fin-direction" role="group" aria-label="Transfer direction">
                    <button
                      type="button"
                      className={cn(direction === 'OUT' && 'is-active')}
                      onClick={() => { setDirection('OUT'); if (!categoryTouched) setCategory(FAMILY_CATEGORY) }}
                    >
                      <ArrowUpRight size={13} strokeWidth={2.4} /> Money out
                    </button>
                    <button
                      type="button"
                      className={cn(direction === 'IN' && 'is-active')}
                      onClick={() => { setDirection('IN'); if (!categoryTouched) setCategory('Loan Recovery') }}
                    >
                      <ArrowDownLeft size={13} strokeWidth={2.4} /> Money in
                    </button>
                  </div>
                  <p title="Sent home, lent, moved to savings — it changes your balance, but never counts as spending or against your budget.">
                    Never counts as spending.
                  </p>
                </div>
              )}

              {/* The date rides on the amount's line — one row instead of a field of its own,
                  so the form fits without scrolling. */}
              <div className="fin-amount-row">
                <label className="fin-amount-field">
                  <span className="fin-amount-prefix">₹</span>
                  <input
                    ref={amountRef}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-label="Amount in rupees"
                    autoFocus
                  />
                </label>
                <input
                  id="fin-tx-date"
                  className="fin-date-pill"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Date"
                />
              </div>
              {goalDaysOfSpend != null && goalDaysOfSpend >= 1 && (
                <p className="fin-goal-lens">
                  That's about <b>{spanWords(goalDaysOfSpend)}</b> of saving for {goalLens?.name}
                </p>
              )}

              <div className="form-group">
                <label htmlFor="fin-tx-description">
                  {type === 'Transfer' ? 'What was it?' : type === 'Income' ? 'From' : 'Merchant / description'}
                </label>
                <input
                  id="fin-tx-description"
                  type="text"
                  autoComplete="off"
                  placeholder={type === 'Transfer' ? 'e.g. Sent home to Amma' : type === 'Income' ? 'e.g. Salary — September' : 'e.g. Swiggy, Metro recharge'}
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <div className="fin-chip-grid" role="listbox" aria-label="Category">
                  {categoryChips.map((c) => {
                    const Icon = getIconForCategory(c)
                    const active = customCategory == null && category === c
                    return (
                      <button
                        key={c}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={cn('fin-cat-chip', active && 'is-active')}
                        style={{ '--chip-hue': getConsistentColor(c) } as CSSProperties}
                        onClick={() => pickCategory(c)}
                      >
                        <Icon size={12} strokeWidth={2.4} />
                        {c}
                      </button>
                    )
                  })}
                  {customCategory == null ? (
                    <button type="button" className="fin-cat-chip is-new" onClick={() => setCustomCategory('')}>
                      <Plus size={12} strokeWidth={2.6} /> New
                    </button>
                  ) : (
                    <input
                      className="fin-cat-input"
                      autoFocus
                      placeholder="New category"
                      value={customCategory}
                      maxLength={40}
                      onChange={(e) => setCustomCategory(e.target.value)}
                    />
                  )}
                </div>
              </div>

              {showGoalChips && (
                <div className="form-group">
                  <label>For a goal?</label>
                  <div className="fin-chip-grid is-goals" role="listbox" aria-label="Savings goal">
                    {goals.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        role="option"
                        aria-selected={goalId === g.id}
                        className={cn('fin-cat-chip fin-goal-chip-opt', g.color && `fin-goal--${g.color}`, goalId === g.id && 'is-active')}
                        onClick={() => setGoalId(goalId === g.id ? null : g.id)}
                      >
                        {createElement(GOAL_ICONS[g.icon] ?? GOAL_ICONS.piggy, { size: 11, strokeWidth: 2.4 })}
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="add-tx-error">{error}</p>}

              <div className="fin-form-actions">
                {isEdit && onDelete && initialTransactionData && (
                  <button type="button" className="fin-form-delete" onClick={() => onDelete(initialTransactionData)}>
                    <Trash2 size={14} strokeWidth={2.2} /> Delete
                  </button>
                )}
                <button type="submit" className="add-tx-submit" disabled={loading}>
                  {loading ? <Loader2 className="spinner" size={18} /> : isEdit ? 'Save changes' : `Save ${type.toLowerCase()}`}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLendingSubmit} className="add-tx-form fin-form">
              <label className="fin-amount-field">
                <span className="fin-amount-prefix">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  placeholder="0"
                  value={lendingAmount}
                  onChange={(e) => setLendingAmount(e.target.value)}
                  aria-label="Amount lent in rupees"
                  autoFocus
                />
              </label>

              <div className="form-group">
                <label htmlFor="fin-lend-borrower">Borrower</label>
                <input
                  id="fin-lend-borrower"
                  type="text"
                  placeholder="Who borrowed this money?"
                  value={borrower}
                  onChange={(e) => setBorrower(e.target.value)}
                />
              </div>

              <div className="form-row add-tx-category-date-row">
                <div className="form-group">
                  <label htmlFor="fin-lend-date">Date lent</label>
                  <input id="fin-lend-date" type="date" value={lendingDate} onChange={(e) => setLendingDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="fin-lend-due">Expected back (optional)</label>
                  <input id="fin-lend-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="fin-lend-notes">Notes (optional)</label>
                <textarea
                  id="fin-lend-notes"
                  className="fin-textarea"
                  placeholder="Reason, split details…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {!isEdit && (
                <label className="fin-check">
                  <input
                    type="checkbox"
                    checked={logLendingTransfer}
                    onChange={(e) => setLogLendingTransfer(e.target.checked)}
                  />
                  <span>
                    <b>Also log it as money out</b>
                    <small>A transfer — lowers your balance, never your spending.</small>
                  </span>
                </label>
              )}

              {error && <p className="add-tx-error">{error}</p>}

              <button type="submit" className="add-tx-submit" disabled={loading}>
                {loading ? <Loader2 className="spinner" size={18} /> : isEdit ? 'Save changes' : 'Save record'}
              </button>
            </form>
          )}
        </div>
      </div>
      {confirmCloseDialog}
    </>
  )
}
