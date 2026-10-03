// New / edit savings goal — the add-transaction modal's vocabulary (segmented kind
// control, big amount, tinted chips), with a live "so what" line: what each payday would
// ask and, when the take-home is known, whether that fits.
//
// Two columns on desktop — what it is (name, icon, price) beside when and where (date,
// where the money sits, the read) — so the whole form fits the window without scrolling.

import { createElement, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Archive, ChevronDown, Loader2, Pause, Play, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SavingsGoal, SavingsGoalKind, SavingsGoalRequest } from '@/types/finance'
import { financeService } from '@/services/finance-service'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import { getErrorMessage } from '@/lib/errors'
import { inr, isoDate } from '@/lib/insights/engine'
import {
  GOAL_COLORS,
  KIND_LABEL,
  nearAppleLaunch,
  planGoal,
  shortDate,
  type GoalColor,
} from '@/lib/finance-goals'
import { cn } from '@/lib/utils'
import { GOAL_ICONS, ICONS_BY_KIND, defaultIconFor, iconKeyOf } from '../goal-icons'

interface GoalModalProps {
  isOpen: boolean
  /** The goal being edited; null for a new one. */
  goal: SavingsGoal | null
  /** Colour a new goal gets unless one is picked. */
  defaultColor: GoalColor
  today: string
  payday: number
  /** What's free each month after the goals already planned (excluding this one when editing); null = take-home unknown. */
  room: number | null
  /** A typical month of rent, bills, everyday spending and money sent home — sizes a safety net. */
  essentials: number
  /** "Kept at" labels already in use, offered as chips. */
  keptAtOptions: string[]
  onClose: () => void
  onSaved: (goal: SavingsGoal) => void
  onArchive?: (goal: SavingsGoal) => void
}

const KINDS: SavingsGoalKind[] = ['PURCHASE', 'TRIP', 'SAFETY_NET', 'OPEN']
const KIND_SHORT: Record<SavingsGoalKind, string> = { PURCHASE: 'Buy', TRIP: 'Trip', SAFETY_NET: 'Safety net', OPEN: 'Just save' }

const DATE_PRESETS: { label: string; months: number }[] = [
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
]

type When = 'date' | 'monthly'

/** The same day `months` from today, clamped to a shorter month's end. */
const monthsAhead = (today: string, months: number): string => {
  const [y, m, d] = today.split('-').map(Number)
  const last = new Date(y, m - 1 + months + 1, 0).getDate()
  return isoDate(new Date(y, m - 1 + months, Math.min(d, last)))
}

const num = (v: string): number | null => {
  const n = parseFloat(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

const str = (n: number | null | undefined): string => (n != null && n > 0 ? String(Math.round(n)) : '')

export function GoalModal({
  isOpen,
  goal,
  defaultColor,
  today,
  payday,
  room,
  essentials,
  keptAtOptions,
  onClose,
  onSaved,
  onArchive,
}: GoalModalProps) {
  const [kind, setKind] = useState<SavingsGoalKind>('PURCHASE')
  const [icon, setIcon] = useState(defaultIconFor('PURCHASE'))
  const [color, setColor] = useState<GoalColor>(defaultColor)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [exchange, setExchange] = useState('')
  const [offer, setOffer] = useState('')
  const [showKnock, setShowKnock] = useState(false)
  const [when, setWhen] = useState<When>('date')
  const [targetDate, setTargetDate] = useState('')
  const [monthly, setMonthly] = useState('')
  const [keptAt, setKeptAt] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    /* eslint-disable react-hooks/set-state-in-effect */
    const k = goal?.kind ?? 'PURCHASE'
    setKind(k)
    setIcon(goal ? iconKeyOf(goal) : defaultIconFor(k))
    setColor((GOAL_COLORS as readonly string[]).includes(goal?.color ?? '') ? (goal?.color as GoalColor) : defaultColor)
    setName(goal?.name ?? '')
    setAmount(str(k === 'PURCHASE' && goal?.listPrice ? goal.listPrice : goal?.targetAmount))
    setExchange(str(goal?.exchangeValue))
    setOffer(str(goal?.cardOffer))
    setShowKnock(Boolean(goal?.exchangeValue || goal?.cardOffer))
    setWhen(goal && !goal.targetDate ? 'monthly' : 'date')
    setTargetDate(goal?.targetDate ?? (goal ? '' : monthsAhead(today, 6)))
    setMonthly(str(goal?.plannedMonthly))
    setKeptAt(goal?.keptAt ?? '')
    setStatus(goal?.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE')
    setError('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, goal, defaultColor, today])

  const isPurchase = kind === 'PURCHASE'
  const price = num(amount)
  const target = isPurchase && price != null ? Math.max(0, price - (num(exchange) ?? 0) - (num(offer) ?? 0)) : price
  const plannedMonthly = when === 'monthly' ? num(monthly) : null

  // The live read: plan a draft of this goal exactly as the card will.
  const preview = useMemo(() => {
    if (target == null || target <= 0) {
      if (kind === 'OPEN' && plannedMonthly) return { line: `${inr(plannedMonthly)} a month, no finish line`, fit: null as string | null, hint: null as string | null }
      return null
    }
    const draft: SavingsGoal = {
      id: goal?.id ?? 'draft',
      name: name || 'this',
      kind,
      icon,
      color,
      targetAmount: target,
      listPrice: null,
      exchangeValue: null,
      cardOffer: null,
      targetDate: when === 'date' && targetDate ? targetDate : null,
      plannedMonthly,
      keptAt: null,
      startDate: goal?.startDate ?? today,
      priority: 0,
      status: 'ACTIVE',
      boughtOn: null,
      boughtFor: null,
      saved: goal?.saved ?? 0,
      setAside: 0,
      takenOut: 0,
      spent: 0,
      contributions: 0,
      firstContributionDate: null,
      lastContributionDate: null,
    }
    const plan = planGoal(draft, { entries: [], today, payday })
    if (plan.state === 'ready') return { line: `Already covered — ${inr(plan.saved)} is set aside`, fit: null, hint: null }
    const need = plan.monthlyNeed
    let line: string
    if (when === 'date') {
      if (!targetDate) return null
      line =
        plan.paydaysLeft === 0
          ? `That date has passed — pick a later one`
          : `${inr(need ?? 0)} each payday, ${plan.paydaysLeft === 1 ? 'just this one' : `${plan.paydaysLeft} times`}`
    } else if (plannedMonthly) {
      line = plan.projectedDate ? `There by ${shortDate(plan.projectedDate)} ${plan.projectedDate.slice(0, 4)}` : `${inr(plannedMonthly)} a month`
    } else {
      return null
    }
    let fit: string | null = null
    const monthlyAsk = when === 'date' ? need : plannedMonthly
    if (room != null && monthlyAsk && monthlyAsk > 0) {
      if (room <= 0) fit = 'Your month is already spoken for — something else would have to give'
      else if (monthlyAsk <= room) fit = `Fits — ${Math.round((monthlyAsk / room) * 100)}% of the ${inr(room)} you have spare`
      else fit = `${inr(monthlyAsk - room)} a month more than you have spare`
    }
    const hint = nearAppleLaunch({ kind, name }, plan.projectedDate ?? (when === 'date' ? targetDate : null))
      ? 'Apple launches in September — the current model usually gets cheaper right after.'
      : null
    return { line, fit, hint }
  }, [target, kind, plannedMonthly, goal, name, icon, color, when, targetDate, today, payday, room])

  const isDirty = goal
    ? name !== goal.name || amount !== str(isPurchase && goal.listPrice ? goal.listPrice : goal.targetAmount) || keptAt !== (goal.keptAt ?? '')
    : Boolean(name.trim() || amount.trim())
  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(isDirty, onClose)

  if (!isOpen) return null

  const chooseKind = (next: SavingsGoalKind) => {
    setKind(next)
    if (!goal) setIcon(defaultIconFor(next))
    if (next === 'OPEN') setWhen('monthly')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Give it a name')
      return
    }
    if (kind !== 'OPEN' && (target == null || target <= 0)) {
      setError(isPurchase && price != null ? 'The exchange and offer cover the whole price' : 'How much does it need?')
      return
    }
    if (when === 'date' && kind !== 'OPEN' && !targetDate) {
      setError('Pick a date, or switch to a monthly amount')
      return
    }
    if (when === 'monthly' && kind !== 'OPEN' && !plannedMonthly) {
      setError('How much a month?')
      return
    }
    const payload: SavingsGoalRequest = {
      name: name.trim(),
      kind,
      icon,
      color,
      // A purchase sends its price and lets the server work out the target from it.
      targetAmount: isPurchase ? null : price,
      listPrice: isPurchase ? price : null,
      exchangeValue: isPurchase ? num(exchange) : null,
      cardOffer: isPurchase ? num(offer) : null,
      targetDate: when === 'date' ? targetDate || null : null,
      plannedMonthly: when === 'monthly' ? plannedMonthly : null,
      keptAt: keptAt.trim() || null,
      // Only a real pause/resume is sent — a plain edit must never reopen a bought goal.
      ...(goal && status !== (goal.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE') ? { status } : {}),
    }
    setLoading(true)
    try {
      const res = goal ? await financeService.updateSavingsGoal(goal.id, payload) : await financeService.addSavingsGoal(payload)
      if (res.error) throw new Error(res.error.message)
      toast.success(goal ? `Updated ${payload.name}` : `Saving for ${payload.name}`)
      if (res.data) onSaved(res.data)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save the goal'))
    } finally {
      setLoading(false)
    }
  }

  const kindIndex = KINDS.indexOf(kind)
  const presetFor = (months: number) => monthsAhead(today, months)
  const keptChips = [...new Set([...keptAtOptions, 'Savings account', 'RD', 'Liquid fund'])].slice(0, 5)

  return (
    <>
      <div className="finance-modal-backdrop" role="presentation" onClick={requestClose}>
        <div
          className={cn('finance-modal-popover add-tx-modal fin-form-modal fin-goal-modal is-split', `fin-goal--${color}`)}
          role="dialog"
          aria-modal="true"
          aria-label={goal ? `Edit ${goal.name}` : 'New savings goal'}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="finance-modal-close" onClick={requestClose} aria-label="Close">
            <X size={15} />
          </button>

          <h2 className="fin-form-title">{goal ? 'Edit goal' : 'Save for something'}</h2>

          <form onSubmit={handleSubmit} className="add-tx-form fin-form fin-goal-form">
            <div className="fin-seg is-goal" style={{ '--seg-count': 4, '--seg-i': kindIndex } as CSSProperties}>
              <span className="fin-seg-pill" aria-hidden="true" />
              {KINDS.map((k) => (
                <button key={k} type="button" className={cn(kind === k && 'is-active')} onClick={() => chooseKind(k)} aria-pressed={kind === k} title={KIND_LABEL[k]}>
                  {KIND_SHORT[k]}
                </button>
              ))}
            </div>

            <div className="fin-goal-form-cols">
              {/* What it is */}
              <div className="fin-goal-form-col">
                <div className="fin-goal-namebar">
                  <span className="fin-goal-icon-big" aria-hidden="true">
                    {createElement(GOAL_ICONS[icon] ?? GOAL_ICONS.piggy, { size: 20, strokeWidth: 2.2 })}
                  </span>
                  <input
                    type="text"
                    className="fin-goal-name-input"
                    placeholder={isPurchase ? 'e.g. iPhone 18 Pro' : kind === 'TRIP' ? 'e.g. Goa in December' : kind === 'SAFETY_NET' ? 'Safety net' : 'e.g. Rainy-day fund'}
                    value={name}
                    maxLength={40}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="Goal name"
                    autoFocus={!goal}
                  />
                </div>
                <div className="fin-goal-icon-row" role="listbox" aria-label="Icon">
                  {ICONS_BY_KIND[kind].map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="option"
                      aria-selected={icon === key}
                      aria-label={key}
                      className={cn(icon === key && 'is-active')}
                      onClick={() => setIcon(key)}
                    >
                      {createElement(GOAL_ICONS[key], { size: 15, strokeWidth: 2.2 })}
                    </button>
                  ))}
                </div>
                <div className="fin-goal-swatches" role="radiogroup" aria-label="Colour">
                  {GOAL_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={color === c}
                      aria-label={c}
                      className={cn('fin-goal-swatch', `fin-goal--${c}`, color === c && 'is-active')}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>

                <label className="fin-amount-field">
                  <span className="fin-amount-prefix">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-label={isPurchase ? 'Price in rupees' : 'Target in rupees'}
                  />
                  <span className="fin-amount-hint">{isPurchase ? 'price' : kind === 'OPEN' ? 'target, if any' : 'target'}</span>
                </label>

                {kind === 'SAFETY_NET' && essentials > 0 && (
                  <div className="fin-goal-chips" aria-label="Size the safety net">
                    {[3, 6].map((m) => (
                      <button key={m} type="button" className="fin-cat-chip" onClick={() => setAmount(String(Math.round((essentials * m) / 1000) * 1000))}>
                        {m} months of essentials · {inr(Math.round((essentials * m) / 1000) * 1000)}
                      </button>
                    ))}
                  </div>
                )}

                {isPurchase && (
                  <div className="fin-goal-knock">
                    <button type="button" className="fin-goal-knock-toggle" onClick={() => setShowKnock((v) => !v)} aria-expanded={showKnock}>
                      <span>
                        {target != null && price != null && target !== price
                          ? <>You need <b>{inr(target)}</b> after the trade-in and offer</>
                          : 'Trading in a phone, or a card offer?'}
                      </span>
                      <ChevronDown size={13} strokeWidth={2.6} />
                    </button>
                    {showKnock && (
                      <div className="form-row add-tx-category-date-row">
                        <div className="form-group">
                          <label htmlFor="fin-goal-exchange">Trade-in value</label>
                          <input id="fin-goal-exchange" type="number" inputMode="numeric" min="0" placeholder="0" value={exchange} onChange={(e) => setExchange(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label htmlFor="fin-goal-offer">Card offer</label>
                          <input id="fin-goal-offer" type="number" inputMode="numeric" min="0" placeholder="0" value={offer} onChange={(e) => setOffer(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* When, where, and what it asks */}
              <div className="fin-goal-form-col">
                <div className="form-group">
                  <label>{kind === 'OPEN' ? 'How much a month?' : 'When do you want it?'}</label>
                  <div className="fin-goal-chips">
                    {kind !== 'OPEN' &&
                      DATE_PRESETS.map((p) => {
                        const date = presetFor(p.months)
                        const active = when === 'date' && targetDate === date
                        return (
                          <button
                            key={p.label}
                            type="button"
                            className={cn('fin-cat-chip', active && 'is-active')}
                            onClick={() => {
                              setWhen('date')
                              setTargetDate(date)
                            }}
                          >
                            In {p.label}
                          </button>
                        )
                      })}
                    {kind !== 'OPEN' && (
                      <button type="button" className={cn('fin-cat-chip', when === 'monthly' && 'is-active')} onClick={() => setWhen('monthly')}>
                        No date
                      </button>
                    )}
                  </div>
                  {when === 'date' && kind !== 'OPEN' ? (
                    <input type="date" value={targetDate} min={today} onChange={(e) => setTargetDate(e.target.value)} aria-label="Target date" />
                  ) : (
                    <label className="fin-goal-inline-amount">
                      <span>₹</span>
                      <input type="number" inputMode="numeric" min="1" placeholder="15000" value={monthly} onChange={(e) => setMonthly(e.target.value)} aria-label="Amount per month" />
                      <em>a month</em>
                    </label>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="fin-goal-kept">Where will the money sit?</label>
                  <input id="fin-goal-kept" type="text" placeholder="e.g. SBI savings, HDFC RD" value={keptAt} maxLength={40} onChange={(e) => setKeptAt(e.target.value)} />
                  <div className="fin-goal-chips is-small">
                    {keptChips.map((k) => (
                      <button key={k} type="button" className={cn('fin-cat-chip', keptAt === k && 'is-active')} onClick={() => setKeptAt(k)}>
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                {preview ? (
                  <div className="fin-form-preview fin-goal-preview">
                    <span>{when === 'date' ? 'What it asks' : 'At that pace'}</span>
                    <b>{preview.line}</b>
                    {preview.fit && <small>{preview.fit}</small>}
                    {room == null && <small>Add your take-home on the goal page to see whether it fits.</small>}
                    {preview.hint && <small className="is-hint">{preview.hint}</small>}
                  </div>
                ) : (
                  <div className="fin-form-preview fin-goal-preview is-empty">
                    <span>What it asks</span>
                    <small>Add an amount and a date to see what each payday needs.</small>
                  </div>
                )}
              </div>
            </div>

            {error && <p className="add-tx-error">{error}</p>}

            <div className="fin-form-actions">
              {goal && (
                <>
                  {(goal.status === 'ACTIVE' || goal.status === 'PAUSED') && (
                    <button type="button" className="fin-form-delete is-quiet" onClick={() => setStatus((s) => (s === 'PAUSED' ? 'ACTIVE' : 'PAUSED'))}>
                      {status === 'PAUSED' ? <Play size={14} strokeWidth={2.2} /> : <Pause size={14} strokeWidth={2.2} />}
                      {status === 'PAUSED' ? 'Paused' : 'Pause'}
                    </button>
                  )}
                  {onArchive && (
                    <button type="button" className="fin-form-delete" onClick={() => onArchive(goal)}>
                      <Archive size={14} strokeWidth={2.2} /> Archive
                    </button>
                  )}
                </>
              )}
              <button type="submit" className="add-tx-submit" disabled={loading}>
                {loading ? <Loader2 className="spinner" size={18} /> : goal ? 'Save changes' : 'Start saving'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {confirmCloseDialog}
    </>
  )
}
