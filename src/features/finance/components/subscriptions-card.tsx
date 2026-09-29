import { useMemo, useState, type CSSProperties } from 'react'
import { Check, Loader2, Plus, Repeat } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SubscriptionDTO } from '@/types/finance'
import { getErrorMessage } from '@/lib/errors'
import type { LedgerEntry } from '@/lib/finance-ledger'
import { billStatus, cycleLabel, DUE_SOON_DAYS, monthlyCostOf, type BillState, type BillStatus } from '@/lib/finance-recurring'
import { cn } from '@/lib/utils'
import { financeService } from '@/services/finance-service'
import { useFinanceStore } from '@/store/finance-store'
import { isAwaitingData } from '@/store/zustand-utils'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { BillModal } from './bill-modal'
import { getBrandIcon, getSubColorStyles } from './bill-brand'
import { getConsistentColor, getIconForCategory } from '../utils'

interface SubscriptionsCardProps {
  /** Every ledger row loaded (all months) — payments are matched against it. */
  entries: LedgerEntry[]
  today: string
  /** Reload the ledger + balance after a payment is logged or undone. */
  onLedgerChanged: () => void
  /** Fired when a bill is cleared, so the route can celebrate. */
  onCelebrate?: () => void
  /** Entrance-stagger index; drives the `--i` animation delay. */
  stagger?: number
}

const URGENCY: Record<BillState, number> = {
  overdue: 0,
  'due-today': 1,
  'due-soon': 2,
  upcoming: 3,
  unscheduled: 4,
  paid: 5,
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })

function statusLine(status: BillStatus): string {
  switch (status.state) {
    case 'paid':
      return `Paid · next ${shortDate(status.nextDue!)}`
    case 'due-today':
      return 'Due today'
    case 'due-soon':
      return `Due in ${status.daysUntil} day${status.daysUntil === 1 ? '' : 's'} · ${shortDate(status.nextDue!)}`
    case 'overdue':
      return `${status.daysOverdue} day${status.daysOverdue === 1 ? '' : 's'} overdue`
    case 'upcoming':
      return `Next ${shortDate(status.nextDue!)}`
    default:
      return 'No due date yet — tap to set one'
  }
}

function SubscriptionsCard({ entries, today, onLedgerChanged, onCelebrate, stagger = 0 }: SubscriptionsCardProps) {
  const subscriptionsState = useFinanceStore.use.subscriptions()
  const { loadSubscriptions } = useFinanceStore.use.actions()
  const subscriptions = subscriptionsState.data
  const loading = isAwaitingData(subscriptionsState) && subscriptions.length === 0

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ bill: SubscriptionDTO | null; nextDue: string | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionDTO | null>(null)
  const [undoTarget, setUndoTarget] = useState<{ bill: SubscriptionDTO; payment: LedgerEntry } | null>(null)

  const rows = useMemo(
    () =>
      subscriptions
        .map((bill) => ({ bill, status: billStatus(bill, entries, today) }))
        .sort(
          (a, b) =>
            URGENCY[a.status.state] - URGENCY[b.status.state] ||
            (a.status.nextDue ?? '9999').localeCompare(b.status.nextDue ?? '9999') ||
            a.bill.name.localeCompare(b.bill.name),
        ),
    [subscriptions, entries, today],
  )

  const monthlyTotal = subscriptions.reduce((sum, s) => sum + monthlyCostOf(s), 0)
  const dueSoon = rows.filter(
    (r) => r.status.state === 'overdue' || ((r.status.state === 'due-today' || r.status.state === 'due-soon') && (r.status.daysUntil ?? 99) <= DUE_SOON_DAYS),
  )
  const dueSoonTotal = dueSoon.reduce((sum, r) => sum + r.bill.cost, 0)

  const handlePay = async (bill: SubscriptionDTO) => {
    setProcessingId(bill.id)
    try {
      const res = await financeService.paySubscription(bill.id)
      if (res.error) throw new Error(res.error.message)
      toast.success(`Logged ${rupees(bill.cost)} for ${bill.name}`)
      onCelebrate?.()
      onLedgerChanged()
    } catch (error) {
      toast.error(getErrorMessage(error, `Couldn't log the payment for ${bill.name}`))
    } finally {
      setProcessingId(null)
    }
  }

  const confirmUndo = async () => {
    if (!undoTarget) return
    const { bill, payment } = undoTarget
    setUndoTarget(null)
    setProcessingId(bill.id)
    try {
      const res = await financeService.deleteTransaction(payment.id)
      if (res.error) throw new Error(res.error.message)
      toast.success(`Removed the ${shortDate(payment.day)} payment for ${bill.name}`)
      onLedgerChanged()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to undo the payment'))
    } finally {
      setProcessingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const bill = deleteTarget
    setDeleteTarget(null)
    setModal(null)
    try {
      const res = await financeService.deleteSubscription(bill.id)
      if (res.error) throw new Error(res.error.message)
      toast.success(`Removed ${bill.name}. Past payments stay in your ledger.`)
      await loadSubscriptions()
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to remove ${bill.name}`))
    }
  }

  return (
    <section className="finance-card finance-subscription-card fin-bills" style={{ '--i': stagger } as CSSProperties}>
      <div className="finance-section-head compact">
        <div>
          <span className="finance-eyebrow">Recurring</span>
          <h2>Bills & plans</h2>
          <p>
            {subscriptions.length === 0 ? (
              'Rent, plans and memberships'
            ) : (
              <>
                <b className="fin-bills-total">{rupees(monthlyTotal)}/mo</b>
                {' · '}
                {dueSoon.length > 0
                  ? `${rupees(dueSoonTotal)} due in ${DUE_SOON_DAYS} days`
                  : `nothing due in ${DUE_SOON_DAYS} days`}
              </>
            )}
          </p>
        </div>
        <div className="fin-bills-head-right">
          <button
            type="button"
            className="fin-icon-btn"
            onClick={() => setModal({ bill: null, nextDue: null })}
            aria-label="Add bill or subscription"
            title="Add bill or subscription"
          >
            <Plus size={15} strokeWidth={2.6} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="fin-bills-list">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="fin-bill-row is-skeleton">
              <span className="skeleton-circle skeleton-shimmer" style={{ width: 32, height: 32, borderRadius: 10 }} />
              <span style={{ flex: 1 }}>
                <span className="skeleton-rect skeleton-shimmer" style={{ width: '45%', height: 11 }} />
                <span className="skeleton-rect skeleton-shimmer" style={{ width: '30%', height: 8, marginTop: 6 }} />
              </span>
              <span className="skeleton-rect skeleton-shimmer" style={{ width: 52, height: 26, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <button type="button" className="fin-empty fin-empty--action" onClick={() => setModal({ bill: null, nextDue: null })}>
          <span className="fin-empty-glyph">
            <Repeat size={20} strokeWidth={2.2} />
          </span>
          <span className="fin-empty-title">Track what repeats</span>
          <span className="fin-empty-sub">
            Add rent, phone plans and subscriptions — see what's due, pay in one tap, and never
            double-count a month.
          </span>
        </button>
      ) : (
        <ul className="fin-bills-list">
          {rows.map(({ bill, status }) => {
            const hue = getConsistentColor(bill.category ?? 'Subscriptions')
            const CategoryIcon = getIconForCategory(bill.category ?? 'Subscriptions')
            const brand = getBrandIcon(bill.name)
            const busy = processingId === bill.id
            const paid = status.state === 'paid'
            return (
              <li key={bill.id} className={cn('fin-bill-row', `is-${status.state}`)}>
                <button
                  type="button"
                  className="fin-bill-open"
                  onClick={() => setModal({ bill, nextDue: status.nextDue })}
                  aria-label={`Edit ${bill.name}`}
                >
                  <span className="fin-bill-icon" style={getSubColorStyles(bill.name, hue)} aria-hidden="true">
                    {brand ?? <CategoryIcon size={15} strokeWidth={2.3} />}
                  </span>
                  <span className="fin-bill-main">
                    <b>{bill.name}</b>
                    <small>
                      {/* Monthly is the default and says nothing; only an unusual cycle
                          earns room next to the status, which is what the row is for. */}
                      {cycleLabel(bill) !== 'Monthly' && <span className="fin-bill-cycle">{cycleLabel(bill)}</span>}
                      <span className="fin-bill-status">{statusLine(status)}</span>
                    </small>
                  </span>
                  <strong className="fin-bill-amount">{rupees(bill.cost)}</strong>
                </button>
                <button
                  type="button"
                  className={cn('fin-bill-action', paid && 'is-paid', status.state === 'overdue' && 'is-overdue')}
                  disabled={busy}
                  onClick={() =>
                    paid && status.payments[0]
                      ? setUndoTarget({ bill, payment: status.payments[0] })
                      : void handlePay(bill)
                  }
                  aria-label={paid ? `Undo ${bill.name} payment` : `Log payment for ${bill.name}`}
                  title={paid ? 'Paid — tap to undo' : `Log ${rupees(bill.cost)} as paid today`}
                >
                  {busy ? <Loader2 size={12} className="animate-spin" /> : paid ? <Check size={13} strokeWidth={2.8} /> : 'Pay'}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <BillModal
        isOpen={modal != null}
        bill={modal?.bill ?? null}
        nextDue={modal?.nextDue ?? null}
        onClose={() => setModal(null)}
        onSaved={() => void loadSubscriptions()}
        onDelete={(bill) => setDeleteTarget(bill)}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="Remove bill"
        message={deleteTarget ? `Stop tracking ${deleteTarget.name}? Payments you've already logged stay in your ledger.` : ''}
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={undoTarget != null}
        title="Undo payment"
        message={
          undoTarget
            ? `Delete the ${rupees(undoTarget.payment.amount)} ${undoTarget.bill.name} payment logged on ${shortDate(undoTarget.payment.day)}? The bill will show as due again.`
            : ''
        }
        confirmLabel="Undo payment"
        onConfirm={confirmUndo}
        onCancel={() => setUndoTarget(null)}
      />
    </section>
  )
}

export { SubscriptionsCard }
