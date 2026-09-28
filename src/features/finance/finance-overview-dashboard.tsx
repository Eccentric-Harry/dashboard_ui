import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import toast from 'react-hot-toast'
import { ArrowUpRight, HeartHandshake, Landmark, Target } from 'lucide-react'
import { BalanceSummaryCard } from './components/balance-summary-card'
import { FinanceHeader } from './components/finance-header'
import { MetricCard } from './components/metric-card'
import { SpendingOverviewCard } from './components/spending-overview-card'
import { SubscriptionsCard } from './components/subscriptions-card'
import { RepaymentScheduleCard } from './components/repayment-schedule-card'
import { TransactionsCard, type LedgerFilter } from './components/transactions-card'
import { TransfersCard, type LegacyBucket } from './components/transfers-card'
import { AddTransactionModal, type TransactionFormData } from './components/add-transaction-modal'
import { EditBalanceModal } from './components/edit-balance-modal'
import { EditBudgetModal } from './components/edit-budget-modal'
import { LendingCard } from './components/lending-card'
import { FinanceIntelligence } from './components/finance-intelligence'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getErrorMessage } from '@/lib/errors'
import type { FinanceMetric } from './data'
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
import { daysElapsedInMonth, daysInMonth, inr, monthLabel, type Insight, type InsightAction } from '@/lib/insights/engine'
import { legacyTransferBuckets, transferSummary } from '@/lib/insights/finance'
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

function FinanceOverviewDashboard() {
  const isGuest = isGuestSession()

  // Server state from the finance store; ephemeral UI state stays local below.
  const logsState = useFinanceStore.use.dailyLogs()
  const accountState = useFinanceStore.use.account()
  const budgetState = useFinanceStore.use.budget()
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
  const engineInput = useMemo(
    () => ({
      today,
      monthKey: selectedMonthKey,
      logs,
      monthlyBudget,
      budgetScope: config.scope,
      fixedCategories: config.fixedCategories,
    }),
    [today, selectedMonthKey, logs, monthlyBudget, config],
  )
  const transfers = useMemo(() => transferSummary(engineInput), [engineInput])
  const legacy = useMemo(() => legacyTransferBuckets(engineInput), [engineInput])

  // ── Deep links: `?edit=budget`, `?reclassify=To Home`, `?merge=A&into=B` ──
  // Home's insight buttons land here; each opens its dialog once, then the flag is
  // dropped so a reload doesn't reopen it.
  const openFromParams = useCallback(
    (params: URLSearchParams) => {
      if (params.get('edit') === 'budget') setIsEditBudgetOpen(true)
      const reclassify = params.get('reclassify')
      if (reclassify) {
        const bucket = legacy.find((b) => b.category === reclassify)
        if (bucket) setReclassifyTarget(bucket)
      }
      const merge = params.get('merge')
      const into = params.get('into')
      if (merge && into) setMergeTarget({ from: merge, into })
    },
    [legacy],
  )

  const deepLinkHandled = useRef(false)
  useEffect(() => {
    // Reclassify needs the ledger loaded to find its bucket, so wait for the first load.
    if (deepLinkHandled.current || !logsState.loaded) return
    deepLinkHandled.current = true
    const params = new URLSearchParams(window.location.search)
    if (!['edit', 'reclassify', 'merge'].some((k) => params.has(k))) return
    // One-shot: reads the URL once after the first ledger load, then clears it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openFromParams(params)
    ;['edit', 'reclassify', 'merge', 'into'].forEach((k) => params.delete(k))
    const rest = params.toString()
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`)
  }, [logsState.loaded, openFromParams])

  const handleInsightAction = useCallback(
    (_insight: Insight, action: InsightAction) => {
      if (action.search) openFromParams(new URLSearchParams(action.search))
      else ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [openFromParams],
  )

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

  // ── KPI tiles ─────────────────────────────────────────────────────────────
  const tiles = useMemo(() => {
    const budget = monthlyBudget ?? 0
    const flex = config.scope === 'FLEX'
    const left = budget - summary.budgeted
    const budgetTone = left < 0 ? 'negative' as const : left < budget * 0.2 ? 'warning' as const : 'positive' as const
    const daysCounted = daysElapsedInMonth(selectedMonthKey, today) || daysInMonth(selectedMonthKey)

    const budgetTile: FinanceMetric = {
      label: left >= 0 ? 'Left to spend' : 'Over budget',
      value: inr(Math.abs(left)),
      cents: '',
      change: '',
      tone: 'positive',
      icon: Target,
      subtitle: `${inr(summary.budgeted)} of ${inr(budget)}${flex ? ' · everyday' : ''}`,
      subtitleTone: budgetTone,
      progress: budget > 0 ? summary.budgeted / budget : 0,
      progressTone: budgetTone,
      useRing: true,
    }
    const spentTile: FinanceMetric = {
      label: 'Spent',
      value: inr(summary.spending),
      cents: '',
      change: '',
      tone: 'negative',
      icon: ArrowUpRight,
      subtitle: summary.spendingCount > 0
        ? `${inr(summary.spending / daysCounted)}/day · ${summary.spendingCount} transactions`
        : 'nothing yet',
      // A fact, not a verdict — the budget tile carries the judgement.
      subtitleTone: 'neutral',
    }
    const familyOnly = transfers.familyOut > 0 && transfers.familyOut === summary.transferOut
    const moneyOutTile: FinanceMetric = summary.transferOut > 0
      ? {
          label: transfers.familyOut > 0 ? 'Sent home' : 'Transferred',
          value: inr(transfers.familyOut > 0 ? transfers.familyOut : summary.transferOut),
          cents: '',
          change: '',
          tone: 'positive',
          icon: HeartHandshake,
          subtitle: familyOnly || transfers.familyOut === 0
            ? 'not counted as spending'
            : `+ ${inr(summary.transferOut - transfers.familyOut)} lent or saved`,
          subtitleTone: 'neutral',
          panel: 'heather',
        }
      : {
          label: 'Income',
          value: inr(summary.income),
          cents: '',
          change: '',
          tone: 'positive',
          icon: Landmark,
          subtitle: summary.income > 0 ? `${inr(summary.income - summary.spending)} after spending` : 'none logged this month',
          subtitleTone: summary.income >= summary.spending ? 'positive' : 'neutral',
        }
    return [
      { metric: budgetTile, onEdit: () => setIsEditBudgetOpen(true) },
      { metric: spentTile },
      { metric: moneyOutTile },
    ]
  }, [monthlyBudget, config.scope, summary, transfers, selectedMonthKey, today])

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

  const netNote = summary.count > 0
    ? `${summary.net >= 0 ? '+' : '−'}${inr(Math.abs(summary.net))} in ${monthLabel(selectedMonthKey).split(' ')[0]}`
    : undefined

  return (
    <section className="finance-dashboard route-scroll" aria-label="Finance overview dashboard">
      <FinanceHeader
        onAddClick={() => setTxModal({ tab: 'Transaction', edit: null })}
        logs={logs}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
      />
      {/* Entrance stagger: each grid child declares its own index, so cards can be
          added or reordered without any nth-child bookkeeping in the CSS. */}
      <div className={`finance-dashboard-grid fin-bento${isGuest ? ' finance-dashboard-guest' : ''}`}>
        <div className="finance-stats-row" style={{ '--i': 0 } as CSSProperties}>
          <BalanceSummaryCard
            balance={balance}
            loading={loading && balance === null}
            onEdit={() => setIsEditBalanceOpen(true)}
            note={netNote}
            noteTone={summary.net > 0 ? 'positive' : summary.net < 0 ? 'negative' : 'neutral'}
          />
          {tiles.map(({ metric, onEdit }, index) => (
            <MetricCard key={index} metric={metric} loading={loading} onEdit={onEdit} stagger={index + 1} />
          ))}
        </div>

        <FinanceIntelligence
          logs={logs}
          monthlyBudget={monthlyBudget}
          budgetScope={config.scope}
          fixedCategories={config.fixedCategories}
          selectedMonthKey={selectedMonthKey}
          onMonthChange={changeMonth}
          months={months}
          monthSummary={summary}
          onInsightAction={handleInsightAction}
          loading={loading}
          stagger={1}
        />

        <div className="fin-col fin-col--main">
          <SpendingOverviewCard
            monthEntries={monthEntries}
            config={config}
            selectedCategory={selectedCategory}
            onCategorySelect={(category) => {
              setSelectedCategory(category)
              if (category) setLedgerFilter('spending')
            }}
            months={months}
            selectedMonthKey={selectedMonthKey}
            onMonthSelect={changeMonth}
            loading={loading}
            stagger={2}
          />
          <div ref={ledgerRef} className="fin-scroll-anchor">
            <TransactionsCard
              entries={monthEntries}
              loading={loading}
              onOpen={openEntry}
              categoryFilter={selectedCategory}
              onClearCategory={() => setSelectedCategory(null)}
              filter={ledgerFilter}
              onFilterChange={setLedgerFilter}
              monthLabel={monthLabel(selectedMonthKey)}
              stagger={3}
            />
          </div>
        </div>

        <div className="fin-col fin-col--side">
          <SubscriptionsCard
            entries={entries}
            today={today}
            onLedgerChanged={refreshData}
            onCelebrate={celebrate}
            stagger={2}
          />
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
            stagger={3}
          />
          {!isGuest && showFinanceGrids && (
            <LendingCard
              onEditClick={(record) => setTxModal({ tab: 'Lending', lending: record })}
              onDeleteClick={setDeleteLendingTarget}
              onRefreshTransactions={refreshData}
              onCelebrate={celebrate}
              stagger={4}
            />
          )}
          {!isGuest && showFinanceGrids && (
            <RepaymentScheduleCard transactions={entries} onRefresh={refreshData} onCelebrate={celebrate} stagger={5} />
          )}
        </div>
      </div>

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
