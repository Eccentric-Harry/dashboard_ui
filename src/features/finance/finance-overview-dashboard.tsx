import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { FinanceHeader } from './components/finance-header'
import { MonthHero } from './components/month-hero'
import { WalletCard, type BillsGlance } from './components/wallet-card'
import { SpendingOverviewCard } from './components/spending-overview-card'
import { SubscriptionsCard } from './components/subscriptions-card'
import { RepaymentScheduleCard } from './components/repayment-schedule-card'
import { TransactionsCard, type LedgerFilter } from './components/transactions-card'
import { TransfersCard, type LegacyBucket } from './components/transfers-card'
import { AddTransactionModal, type TransactionFormData } from './components/add-transaction-modal'
import { EditBalanceModal } from './components/edit-balance-modal'
import { EditBudgetModal } from './components/edit-budget-modal'
import { LendingCard } from './components/lending-card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FloatingAdd } from '@/components/ui/floating-add'
import { getErrorMessage } from '@/lib/errors'
import type { LendingRecord } from '@/types/finance'
import { financeService } from '@/services/finance-service'
import { isGuestSession } from '@/services/http/session'
import { useFinanceStore } from '@/store/finance-store'
import {
  budgetConfigOf,
  entriesInMonth,
  FAMILY_CATEGORY,
  flattenLogs,
  localToday,
  monthOptions,
  summarize,
  type LedgerEntry,
} from '@/lib/finance-ledger'
import { inr, monthLabel } from '@/lib/insights/engine'
import {
  buildBurndown,
  dailyBreakdown,
  duplicateCategoryPair,
  spendingComparison,
  legacyTransferBuckets,
  transferSummary,
} from '@/lib/insights/finance'
import { billStatus, stillDueInMonth } from '@/lib/finance-recurring'
import { celebrationActions } from '@/store/celebration-store'

import './finance-overview.css'
// Redesign layer — must load after the base sheet so its refinements win.
import './finance-playful.css'
// Transfers, bills, ledger and bento layout — loads last.
import './finance-refresh.css'

type TxModalState =
  | { tab: 'Transaction'; edit: TransactionFormData | null; preset?: Partial<TransactionFormData> }
  | { tab: 'Lending'; lending: LendingRecord | null }

const monthKeyOfDate = (date: string) => date.slice(0, 7)

const DEEP_LINK_KEYS = ['edit', 'reclassify', 'merge', 'into']

interface DeepLinkDialogs {
  budget: boolean
  reclassify: LegacyBucket | null
  merge: { from: string; into: string } | null
}

function dialogsFromParams(params: URLSearchParams, legacy: LegacyBucket[]): DeepLinkDialogs {
  const reclassify = params.get('reclassify')
  const merge = params.get('merge')
  const into = params.get('into')
  return {
    budget: params.get('edit') === 'budget',
    reclassify: reclassify ? (legacy.find((b) => b.category === reclassify) ?? null) : null,
    merge: merge && into ? { from: merge, into } : null,
  }
}

function FinanceOverviewDashboard() {
  const isGuest = isGuestSession()

  // Server state from the finance store; ephemeral UI state stays local below.
  const logsState = useFinanceStore.use.dailyLogs()
  const accountState = useFinanceStore.use.account()
  const budgetState = useFinanceStore.use.budget()
  const subscriptionsState = useFinanceStore.use.subscriptions()
  const lendingState = useFinanceStore.use.lending()
  const repaymentsState = useFinanceStore.use.repayments()
  const financeActions = useFinanceStore.use.actions()

  const logs = logsState.data
  const loading = logsState.loading || (!logsState.loaded && !logsState.hasErrors)
  const balance = accountState.loaded ? (accountState.data?.balance ?? 0) : null
  const settings = budgetState.data ?? accountState.data
  const monthlyBudget = settings?.monthlyBudget ?? null
  const scope = settings?.budgetScope
  const fixedCategories = settings?.fixedCategories
  const config = useMemo(() => budgetConfigOf({ budgetScope: scope, fixedCategories }), [scope, fixedCategories])

  const today = localToday()
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new URLSearchParams(window.location.search).get('date') || localToday(),
  )
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => monthKeyOfDate(selectedDate))
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all')

  const [txModal, setTxModal] = useState<TxModalState | null>(null)
  const [isEditBalanceOpen, setIsEditBalanceOpen] = useState(false)
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TransactionFormData | null>(null)
  const [deleteLendingTarget, setDeleteLendingTarget] = useState<LendingRecord | null>(null)
  const [reclassifyTarget, setReclassifyTarget] = useState<LegacyBucket | null>(null)
  const [mergeTarget, setMergeTarget] = useState<{ from: string; into: string } | null>(null)
  const ledgerRef = useRef<HTMLDivElement>(null)
  const billsRef = useRef<HTMLDivElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)

  const [showFinanceGrids, setShowFinanceGrids] = useState(() => localStorage.getItem('showFinanceGrids') === 'true')

  // Any child that lands a "money went right" moment — a loan recovered, a bill cleared.
  const celebrate = useCallback(() => celebrationActions.celebrate({ palette: 'finance' }), [])
  const refreshData = useCallback(() => void financeActions.loadAll(), [financeActions])

  useEffect(() => {
    void financeActions.loadAll()
    void financeActions.loadCommitments()
  }, [financeActions])

  // ── One pass over the ledger feeds every card ─────────────────────────────
  const entries = useMemo(() => flattenLogs(logs), [logs])
  const monthEntries = useMemo(() => entriesInMonth(entries, selectedMonthKey), [entries, selectedMonthKey])
  const summary = useMemo(() => summarize(monthEntries, config), [monthEntries, config])
  const months = useMemo(
    () => monthOptions(entries, today.slice(0, 7), selectedMonthKey),
    [entries, today, selectedMonthKey],
  )
  const spendingCategories = useMemo(
    () => [...new Set(entries.filter((e) => e.kind === 'spending').map((e) => e.category))],
    [entries],
  )
  // Commitments settle on their own; a failed one is null and only gates its own insights.
  const subscriptions = subscriptionsState.loaded ? subscriptionsState.data : null
  const lending = lendingState.loaded ? lendingState.data : null
  const repayments = repaymentsState.loaded ? repaymentsState.data : null
  const engineInput = useMemo(
    () => ({
      today,
      monthKey: selectedMonthKey,
      logs,
      monthlyBudget,
      budgetScope: config.scope,
      fixedCategories: config.fixedCategories,
      subscriptions,
      lending,
      repayments,
    }),
    [today, selectedMonthKey, logs, monthlyBudget, config, subscriptions, lending, repayments],
  )
  // The Patterns list was removed (2026-09-29: never read). Its two actionable findings
  // live on the cards they concern — legacy transfer buckets on Sent home, duplicate
  // category spellings on Where it went — and the month-to-date comparison in the hero.
  const engine = useMemo(
    () => ({
      burndown: buildBurndown(engineInput),
      days: dailyBreakdown(engineInput),
      comparison: spendingComparison(engineInput),
      transfers: transferSummary(engineInput),
      legacy: legacyTransferBuckets(engineInput),
      duplicate: duplicateCategoryPair(engineInput),
    }),
    [engineInput],
  )
  const { transfers, legacy } = engine

  const bills = useMemo<BillsGlance>(() => {
    const subs = subscriptions ?? []
    const statuses = subs.map((bill) => ({ bill, status: billStatus(bill, entries, today) }))
    const due = statuses
      .filter(({ status }) => stillDueInMonth(status, today.slice(0, 7)))
      .sort((a, b) => (a.status.overdueSince ?? a.status.nextDue ?? '').localeCompare(b.status.overdueSince ?? b.status.nextDue ?? ''))
    const upcoming = [...statuses]
      .filter(({ status }) => status.nextDue)
      .sort((a, b) => (a.status.nextDue ?? '').localeCompare(b.status.nextDue ?? ''))
    const next = due[0] ?? upcoming[0]
    return {
      hasBills: subs.length > 0,
      dueTotal: due.reduce((sum, d) => sum + d.bill.cost, 0),
      dueCount: due.length,
      next: next
        ? {
            name: next.bill.name,
            date: next.status.overdueSince ?? next.status.nextDue ?? today,
            overdue: next.status.state === 'overdue',
          }
        : null,
    }
  }, [subscriptions, entries, today])

  // ── Deep links: `?edit=budget`, `?reclassify=To Home`, `?merge=A&into=B` ──
  // Home's insight buttons land here. A deep link opens its dialog once, then the flag is
  // dropped so a reload doesn't reopen it.

  const deepLinkHandled = useRef(false)
  useEffect(() => {
    // Reclassify needs the ledger loaded to find its bucket, so wait for the first load.
    if (deepLinkHandled.current || !logsState.loaded) return
    deepLinkHandled.current = true
    const params = new URLSearchParams(window.location.search)
    if (!DEEP_LINK_KEYS.some((k) => params.has(k))) return
    // One-shot: reads the URL once after the first ledger load, then clears it.
    const d = dialogsFromParams(params, legacy)
    /* eslint-disable react-hooks/set-state-in-effect */
    if (d.budget) setIsEditBudgetOpen(true)
    if (d.reclassify) setReclassifyTarget(d.reclassify)
    if (d.merge) setMergeTarget(d.merge)
    /* eslint-enable react-hooks/set-state-in-effect */
    DEEP_LINK_KEYS.forEach((k) => params.delete(k))
    const rest = params.toString()
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`)
  }, [logsState.loaded, legacy])


  // ── Shell events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const quickAdd = () => setTxModal({ tab: 'Transaction', edit: null })
    const gridsChanged = (e: Event) => setShowFinanceGrids((e as CustomEvent<boolean>).detail)
    const storage = (e: StorageEvent) => {
      if (e.key === 'showFinanceGrids') setShowFinanceGrids(e.newValue === 'true')
    }
    const popstate = () => {
      const next = new URLSearchParams(window.location.search).get('date') || localToday()
      setSelectedDate(next)
      setSelectedMonthKey(monthKeyOfDate(next))
    }
    window.addEventListener('mobile-quick-add', quickAdd)
    window.addEventListener('financeGridsVisibilityChanged', gridsChanged)
    window.addEventListener('storage', storage)
    window.addEventListener('popstate', popstate)
    return () => {
      window.removeEventListener('mobile-quick-add', quickAdd)
      window.removeEventListener('financeGridsVisibilityChanged', gridsChanged)
      window.removeEventListener('storage', storage)
      window.removeEventListener('popstate', popstate)
    }
  }, [])

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setSelectedMonthKey(monthKeyOfDate(date))
  }

  const changeMonth = (monthKey: string) => {
    setSelectedMonthKey(monthKey)
    setSelectedCategory(null)
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  const openEntry = (entry: LedgerEntry) =>
    setTxModal({
      tab: 'Transaction',
      edit: {
        id: entry.id,
        description: entry.description,
        amount: entry.amount,
        category: entry.category,
        type: entry.type,
        direction: entry.direction,
        date: entry.day,
      },
    })

  const confirmDelete = async () => {
    const target = deleteTarget
    if (!target?.id) return
    setDeleteTarget(null)
    try {
      const res = await financeService.deleteTransaction(target.id)
      if (res.error) throw new Error(res.error.message)
      toast.success(`Deleted "${target.description}"`)
      setTxModal(null)
      refreshData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete transaction'))
    }
  }

  const confirmDeleteLending = async () => {
    const target = deleteLendingTarget
    if (!target) return
    setDeleteLendingTarget(null)
    try {
      const res = await financeService.deleteLending(target.id)
      if (res.error) throw new Error(res.error.message)
      toast.success(`Deleted lending record for ${target.borrower}`)
      void financeActions.loadLending()
      refreshData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete lending record'))
    }
  }

  const confirmReclassify = async () => {
    const bucket = reclassifyTarget
    if (!bucket) return
    setReclassifyTarget(null)
    try {
      const res = await financeService.reclassifyCategory({
        category: bucket.category,
        targetCategory: bucket.target,
        type: 'Transfer',
        direction: bucket.direction,
      })
      if (res.error) throw new Error(res.error.message)
      toast.success(`Moved ${res.data?.updated ?? bucket.count} transaction(s) to transfers — no longer counted as ${bucket.direction === 'IN' ? 'income' : 'spending'}`)
      refreshData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to move transactions'))
    }
  }

  const confirmMerge = async () => {
    const target = mergeTarget
    if (!target) return
    setMergeTarget(null)
    try {
      const res = await financeService.reclassifyCategory({ category: target.from, targetCategory: target.into })
      if (res.error) throw new Error(res.error.message)
      toast.success(`Merged ${res.data?.updated ?? ''} "${target.from}" transaction(s) into ${target.into}`)
      if (selectedCategory === target.from) setSelectedCategory(target.into)
      refreshData()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to merge categories'))
    }
  }

  const showTransfersInLedger = () => {
    setLedgerFilter('transfers')
    setSelectedCategory(null)
    ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openAdd = () => setTxModal({ tab: 'Transaction', edit: null })

  const jumpTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section className="finance-dashboard route-scroll" aria-label="Finance overview dashboard">
      <FinanceHeader
        onAddClick={openAdd}
        addButtonRef={addButtonRef}
        logs={logs}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
      />
      {/* Entrance stagger: each grid child declares its own index, so cards can be
          added or reordered without any nth-child bookkeeping in the CSS. */}
      <div className={`finance-dashboard-grid fin-bento${isGuest ? ' finance-dashboard-guest' : ''}`}>
        <MonthHero
          monthKey={selectedMonthKey}
          months={months}
          onMonthChange={changeMonth}
          burndown={engine.burndown}
          days={engine.days}
          comparison={engine.comparison}
          summary={summary}
          budget={monthlyBudget}
          scope={config.scope}
          loading={loading}
          onEditBudget={() => setIsEditBudgetOpen(true)}
          stagger={0}
        />
        <WalletCard
          balance={balance}
          summary={summary}
          monthName={monthLabel(selectedMonthKey).split(' ')[0]}
          bills={bills}
          loading={loading}
          onEditBalance={() => setIsEditBalanceOpen(true)}
          onJumpToBills={() => jumpTo(billsRef)}
          stagger={1}
        />

        {/* Rows are balanced rather than two free-running columns: a tall ledger in one
            column used to hang beside empty space. Nutrition's 7 + 5 rhythm: spending |
            wallet, then breakdown | bills, each pair stretched to one height; Sent home and
            the ledger each take the full width. */}
        <div className="fin-slot fin-slot--breakdown">
          <SpendingOverviewCard
            monthEntries={monthEntries}
            config={config}
            selectedCategory={selectedCategory}
            onCategorySelect={(category) => {
              setSelectedCategory(category)
              if (category) setLedgerFilter('spending')
            }}
            mergeSuggestion={engine.duplicate}
            onMerge={setMergeTarget}
            loading={loading}
            stagger={2}
          />
        </div>

        <div ref={billsRef} className="fin-slot fin-slot--bills fin-scroll-anchor">
          <SubscriptionsCard
            entries={entries}
            today={today}
            onLedgerChanged={refreshData}
            onCelebrate={celebrate}
            stagger={3}
          />
        </div>

        <div className="fin-slot fin-slot--transfers">
          <TransfersCard
            monthEntries={monthEntries}
            summary={transfers}
            monthLabel={monthLabel(selectedMonthKey)}
            legacy={legacy}
            onLogTransfer={() =>
              setTxModal({ tab: 'Transaction', edit: null, preset: { type: 'Transfer', direction: 'OUT', category: FAMILY_CATEGORY } })
            }
            onReclassify={setReclassifyTarget}
            onShowAll={showTransfersInLedger}
            stagger={4}
          />
        </div>

        <div ref={ledgerRef} className="fin-slot fin-slot--wide fin-scroll-anchor">
          <TransactionsCard
            entries={monthEntries}
            loading={loading}
            onOpen={openEntry}
            categoryFilter={selectedCategory}
            onClearCategory={() => setSelectedCategory(null)}
            filter={ledgerFilter}
            onFilterChange={setLedgerFilter}
            monthLabel={monthLabel(selectedMonthKey)}
            stagger={5}
          />
        </div>

        {!isGuest && showFinanceGrids && (
          <div className="fin-slot fin-slot--half">
            <LendingCard
              onEditClick={(record) => setTxModal({ tab: 'Lending', lending: record })}
              onDeleteClick={setDeleteLendingTarget}
              onRefreshTransactions={refreshData}
              onCelebrate={celebrate}
              stagger={5}
            />
          </div>
        )}
        {!isGuest && showFinanceGrids && (
          <div className="fin-slot fin-slot--half">
            <RepaymentScheduleCard transactions={entries} onRefresh={refreshData} onCelebrate={celebrate} stagger={6} />
          </div>
        )}
      </div>

      <FloatingAdd watch={addButtonRef} label="Add transaction" onClick={openAdd} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete transaction"
        message={deleteTarget ? `Delete "${deleteTarget.description}" (₹${deleteTarget.amount.toLocaleString('en-IN')})? Your balance is adjusted back.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteLendingTarget}
        title="Delete lending record"
        message={deleteLendingTarget ? `Delete the lending record for "${deleteLendingTarget.borrower}" (₹${deleteLendingTarget.amount.toLocaleString('en-IN')})?` : ''}
        onConfirm={confirmDeleteLending}
        onCancel={() => setDeleteLendingTarget(null)}
      />

      <ConfirmDialog
        open={!!reclassifyTarget}
        title="Move to transfers"
        tone="accent"
        confirmLabel="Move them"
        message={
          reclassifyTarget
            ? `Move ${reclassifyTarget.count} "${reclassifyTarget.category}" transaction(s) (${inr(reclassifyTarget.total)}) to transfers as "${reclassifyTarget.target}"? They stop counting as ${reclassifyTarget.direction === 'IN' ? 'income' : 'spending and against your budget'}; your balance doesn't change.`
            : ''
        }
        onConfirm={confirmReclassify}
        onCancel={() => setReclassifyTarget(null)}
      />

      <ConfirmDialog
        open={!!mergeTarget}
        title="Merge categories"
        tone="accent"
        confirmLabel="Merge"
        message={mergeTarget ? `Move every "${mergeTarget.from}" transaction into "${mergeTarget.into}"? Amounts, dates and your balance stay the same.` : ''}
        onConfirm={confirmMerge}
        onCancel={() => setMergeTarget(null)}
      />

      <EditBalanceModal
        isOpen={isEditBalanceOpen}
        currentBalance={balance ?? 0}
        onClose={() => setIsEditBalanceOpen(false)}
        onSuccess={(newBalance) => financeActions.applyBalance(newBalance)}
      />

      <EditBudgetModal
        isOpen={isEditBudgetOpen}
        currentBudget={monthlyBudget ?? 20000}
        currentScope={config.scope}
        currentFixed={config.fixedCategories}
        monthEntries={monthEntries}
        spendingCategories={spendingCategories}
        onClose={() => setIsEditBudgetOpen(false)}
        onSuccess={(saved) => financeActions.applyBudget(saved)}
      />

      <AddTransactionModal
        isOpen={txModal != null}
        initialTab={txModal?.tab ?? 'Transaction'}
        isEdit={txModal?.tab === 'Transaction' ? txModal.edit != null : txModal?.tab === 'Lending' && txModal.lending != null}
        initialTransactionData={txModal?.tab === 'Transaction' ? txModal.edit : null}
        initialLendingData={txModal?.tab === 'Lending' ? txModal.lending : null}
        preset={txModal?.tab === 'Transaction' ? txModal.preset : null}
        history={entries}
        onDelete={setDeleteTarget}
        onClose={() => setTxModal(null)}
        onSuccess={() => {
          void financeActions.loadLending()
          refreshData()
        }}
      />
    </section>
  )
}

export { FinanceOverviewDashboard }
