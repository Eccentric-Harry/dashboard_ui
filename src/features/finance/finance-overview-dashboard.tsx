import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { FinanceHeader } from './components/finance-header'
import { MonthHero } from './components/month-hero'
import { WalletCard, type BillsGlance, type GoalsGlance } from './components/wallet-card'
import { SpendingOverviewCard } from './components/spending-overview-card'
import { SubscriptionsCard } from './components/subscriptions-card'
import { RepaymentScheduleCard } from './components/repayment-schedule-card'
import { TransactionsCard, type LedgerFilter } from './components/transactions-card'
import { TransfersCard, type LegacyBucket } from './components/transfers-card'
import { AddTransactionModal, type TransactionFormData } from './components/add-transaction-modal'
import { EditBalanceModal } from './components/edit-balance-modal'
import { EditBudgetModal } from './components/edit-budget-modal'
import { LendingCard } from './components/lending-card'
import { SavingForCard, type GoalNudge } from './components/saving-for-card'
import { GoalModal } from './components/goal-modal'
import { GoalMoneyModal, type GoalMoneyMode } from './components/goal-money-modal'
import { GoalWorkspace } from './components/goal-workspace'
import { IncomeModal } from './components/income-modal'
import { iconKeyOf } from './goal-icons'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FloatingAdd } from '@/components/ui/floating-add'
import { getErrorMessage } from '@/lib/errors'
import type { LendingRecord, SavingsGoal, SavingsGoalRequest, ShowcaseUpdateRequest } from '@/types/finance'
import type { AppPath } from '@/app/routes'
import { financeService } from '@/services/finance-service'
import { isGuestSession } from '@/services/http/session'
import { isStandalone } from '@/lib/utils'
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
import { billStatus, monthlyCostOf, stillDueInMonth } from '@/lib/finance-recurring'
import {
  DAYS_PER_MONTH,
  DEFAULT_PAYDAY,
  GOAL_COLORS,
  colorOf,
  goalDays,
  inPaydayWindow,
  isSaving,
  leadGoal,
  leftoverOffer,
  monthCapacity,
  owedToYou,
  paydayPlan,
  planGoals,
  roomFor,
  type GoalColor,
  type GoalPlan,
} from '@/lib/finance-goals'
import { celebrationActions } from '@/store/celebration-store'

import './finance-overview.css'
// Redesign layer — must load after the base sheet so its refinements win.
import './finance-playful.css'
// Transfers, bills, ledger and bento layout.
import './finance-refresh.css'
// Savings goals: the Saving-for card, the goal workspace and their modals — loads last.
import './finance-goals.css'

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

/** Desktop scrolls inside the dashboard's own box; phones scroll the page. */
const ownsScroll = (el: HTMLElement | null): el is HTMLElement =>
  el !== null && getComputedStyle(el).overflowY !== 'visible'

/** The full plan for a goal, as PUT expects it — a purchase sends its price, not its target. */
const requestFrom = (goal: SavingsGoal): SavingsGoalRequest => ({
  name: goal.name,
  kind: goal.kind,
  icon: goal.icon,
  color: goal.color,
  targetAmount: goal.kind === 'PURCHASE' && goal.listPrice ? null : goal.targetAmount,
  listPrice: goal.listPrice,
  exchangeValue: goal.exchangeValue,
  cardOffer: goal.cardOffer,
  targetDate: goal.targetDate,
  plannedMonthly: goal.plannedMonthly,
  keptAt: goal.keptAt,
})

const MILESTONES = [0.25, 0.5, 0.75, 1]

interface FinanceOverviewDashboardProps {
  /** `?goal=<id>` swaps the dashboard for that goal's workspace. */
  searchParams?: URLSearchParams
  onNavigate?: (pathname: AppPath, search?: string) => void
}

function FinanceOverviewDashboard({ searchParams, onNavigate }: FinanceOverviewDashboardProps = {}) {
  const isGuest = isGuestSession()
  const goalParam = searchParams?.get('goal') ?? null

  // Server state from the finance store; ephemeral UI state stays local below.
  const logsState = useFinanceStore.use.dailyLogs()
  const accountState = useFinanceStore.use.account()
  const budgetState = useFinanceStore.use.budget()
  const subscriptionsState = useFinanceStore.use.subscriptions()
  const lendingState = useFinanceStore.use.lending()
  const repaymentsState = useFinanceStore.use.repayments()
  const goalsState = useFinanceStore.use.goals()
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
  const [goalModal, setGoalModal] = useState<{ goal: SavingsGoal | null } | null>(null)
  const [moneyModal, setMoneyModal] = useState<{ mode: GoalMoneyMode; goalId: string; amount?: number; note?: string } | null>(null)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<SavingsGoal | null>(null)
  const ledgerRef = useRef<HTMLDivElement>(null)
  const billsRef = useRef<HTMLDivElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const dashboardScrollRef = useRef(0)
  const enteredFromDashboardRef = useRef(false)

  const [showFinanceGrids, setShowFinanceGrids] = useState(() => localStorage.getItem('showFinanceGrids') === 'true')

  // Any child that lands a "money went right" moment — a loan recovered, a bill cleared.
  const celebrate = useCallback(() => celebrationActions.celebrate({ palette: 'finance' }), [])
  const refreshData = useCallback(() => void financeActions.loadAll(), [financeActions])

  useEffect(() => {
    void financeActions.loadAll()
    void financeActions.loadCommitments()
    void financeActions.loadGoals()
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

  // ── Savings goals: one plan per goal, the month's capacity, the payday plan ──
  const goals = goalsState.data
  const goalsLoading = !goalsState.loaded && !goalsState.hasErrors
  const payday = settings?.payday ?? DEFAULT_PAYDAY
  const paydayKnown = settings?.payday != null
  const plans = useMemo(() => planGoals(goals, { entries, today, payday }), [goals, entries, today, payday])
  const planById = useMemo(() => new Map(plans.map((p) => [p.goal.id, p])), [plans])
  const goalColors = useMemo(() => {
    const ordered = [...goals].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
    return Object.fromEntries(ordered.map((g, i) => [g.id, colorOf(g, i)])) as Record<string, GoalColor>
  }, [goals])
  const goalLabels = useMemo(
    () => Object.fromEntries(goals.map((g) => [g.id, { name: g.name, icon: iconKeyOf(g), color: goalColors[g.id] }])),
    [goals, goalColors],
  )
  const billsMonthly = useMemo(() => (subscriptions ?? []).reduce((s, b) => s + monthlyCostOf(b), 0), [subscriptions])
  const capacity = useMemo(
    () => monthCapacity({ account: settings ?? null, entries, config, plans, today, billsMonthly }),
    [settings, entries, config, plans, today, billsMonthly],
  )
  const payLines = useMemo(() => paydayPlan(plans), [plans])
  const lead = useMemo(() => leadGoal(plans), [plans])
  const leftover = useMemo(
    () => leftoverOffer({ entries, config, budget: monthlyBudget, today }),
    [entries, config, monthlyBudget, today],
  )
  const goalNudge = useMemo<GoalNudge | null>(() => {
    const saving = plans.filter(isSaving)
    const target = lead ?? saving[0]
    if (leftover && target) return { kind: 'leftover', offer: leftover, plan: target }
    const b = engine.burndown
    if (lead && b && b.isCurrentMonth && b.spent > b.budget) {
      const days = goalDays(b.spent - b.budget, lead)
      if (days != null && days >= 1) return { kind: 'overspend', over: b.spent - b.budget, days, plan: lead }
    }
    if (saving.length > 0 && capacity.takeHome == null) return { kind: 'income' }
    return null
  }, [plans, lead, leftover, engine.burndown, capacity.takeHome])
  const goalsGlance = useMemo<GoalsGlance>(() => {
    const live = plans.filter((p) => p.state !== 'bought')
    const first = payLines[0]
    return {
      setAside: live.reduce((s, p) => s + p.saved, 0),
      count: live.length,
      payday:
        first && inPaydayWindow(today, payday)
          ? {
              total: payLines.reduce((s, l) => s + l.amount, 0),
              count: payLines.length,
              first: { name: first.plan.goal.name, amount: first.amount, keptAt: first.plan.goal.keptAt },
            }
          : null,
    }
  }, [plans, payLines, today, payday])
  const savingGoalOptions = useMemo(
    () =>
      plans
        .filter((p) => p.state !== 'bought')
        .map((p) => ({ id: p.goal.id, name: p.goal.name, icon: iconKeyOf(p.goal), color: goalColors[p.goal.id] })),
    [plans, goalColors],
  )
  const goalLens = useMemo(() => {
    const monthly = lead ? (lead.monthlyNeed ?? lead.pace ?? 0) : 0
    return lead && monthly > 0 ? { name: lead.goal.name, perDay: monthly / DAYS_PER_MONTH } : null
  }, [lead])
  const keptAtOptions = useMemo(() => [...new Set(goals.map((g) => g.keptAt).filter((k): k is string => Boolean(k)))], [goals])
  const owed = useMemo(() => owedToYou(lending), [lending])

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


  // `?plan=payday` (Home's payday insight) opens the first set-aside once goals are in.
  const paydayLinkHandled = useRef(false)
  useEffect(() => {
    if (paydayLinkHandled.current || !goalsState.loaded || !logsState.loaded) return
    paydayLinkHandled.current = true
    const params = new URLSearchParams(window.location.search)
    if (params.get('plan') !== 'payday') return
    const first = payLines[0]
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (first) setMoneyModal({ mode: 'set-aside', goalId: first.plan.goal.id, amount: first.amount })
    params.delete('plan')
    const rest = params.toString()
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`)
  }, [goalsState.loaded, logsState.loaded, payLines])

  // Each view opens at its top; coming back to the dashboard restores where it was.
  useLayoutEffect(() => {
    const el = sectionRef.current
    const y = goalParam ? 0 : dashboardScrollRef.current
    if (ownsScroll(el)) el.scrollTop = y
    else window.scrollTo(0, y)
    if (!goalParam) {
      dashboardScrollRef.current = 0
      enteredFromDashboardRef.current = false
    }
    if (y === 0) return
    const frame = requestAnimationFrame(() => {
      if (ownsScroll(el)) el.scrollTop = y
      else window.scrollTo(0, y)
    })
    return () => cancelAnimationFrame(frame)
  }, [goalParam])

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
        goalId: entry.goalId,
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

  // ── Savings goals ─────────────────────────────────────────────────────────
  const searchWith = (goalId?: string) => {
    const params = new URLSearchParams()
    const date = searchParams?.get('date')
    if (date) params.set('date', date)
    if (goalId) params.set('goal', goalId)
    const query = params.toString()
    return query ? `?${query}` : ''
  }

  const openGoal = (goalId: string) => {
    if (!onNavigate) return
    if (!goalParam) {
      const el = sectionRef.current
      dashboardScrollRef.current = ownsScroll(el) ? el.scrollTop : window.scrollY
      enteredFromDashboardRef.current = true
    }
    onNavigate('/finance', searchWith(goalId))
  }

  const closeGoal = () => {
    // Straight back from the dashboard in a browser tab: pop history so Back/Forward stay
    // in step. Deep links and the installed PWA navigate instead.
    if (enteredFromDashboardRef.current && !isStandalone()) {
      window.history.back()
      return
    }
    onNavigate?.('/finance', searchWith())
  }

  const reloadGoals = () => void financeActions.loadGoalsAndLedger()

  /** After money moved: refresh, and mark a milestone crossed with the app's celebration. */
  const afterGoalMoney = (updated: SavingsGoal, mode: GoalMoneyMode) => {
    const before = planById.get(updated.id)
    reloadGoals()
    if (mode === 'buy') {
      celebrationActions.celebrate({ palette: 'finance', label: `Bought ${updated.name}`, detail: 'saved for, paid in full' })
      return
    }
    const target = updated.targetAmount
    if (mode !== 'set-aside' || !target || !before) return
    const was = before.saved / target
    const now = updated.saved / target
    const crossed = MILESTONES.filter((m) => was < m && now >= m).pop()
    if (crossed != null) {
      celebrationActions.celebrate({
        palette: 'finance',
        label: crossed >= 1 ? `${updated.name} fully saved` : `${updated.name} ${Math.round(crossed * 100)}% saved`,
        once: { key: `goal-${updated.id}-${crossed}`, scope: 'finance' },
      })
    }
  }

  const savePace = async (goal: SavingsGoal, patch: { targetDate?: string; plannedMonthly?: number }) => {
    try {
      const res = await financeService.updateSavingsGoal(goal.id, { ...requestFrom(goal), ...patch })
      if (res.error) throw new Error(res.error.message)
      toast.success(patch.targetDate ? `New date for ${goal.name}` : `New monthly plan for ${goal.name}`)
      void financeActions.loadGoals()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update the plan'))
    }
  }

  /** The goal's photos: from a pasted link, or by its name with none. Returns the updated goal, or null. */
  const findShowcase = async (goal: SavingsGoal, url?: string): Promise<SavingsGoal | null> => {
    const res = await financeService.findGoalShowcase(goal.id, url)
    if (res.error || !res.data) {
      toast.error(getErrorMessage(res.error, 'Couldn’t fetch photos'))
      return null
    }
    void financeActions.loadGoals()
    return res.data
  }

  const updateShowcase = async (goal: SavingsGoal, dto: ShowcaseUpdateRequest): Promise<SavingsGoal | null> => {
    const res = await financeService.updateGoalShowcase(goal.id, dto)
    if (res.error || !res.data) {
      toast.error(getErrorMessage(res.error, 'Couldn’t save that'))
      return null
    }
    void financeActions.loadGoals()
    return res.data
  }

  /** Funding order: this goal moves ahead of every other one. */
  const fundFirst = async (goal: SavingsGoal) => {
    const first = Math.min(...goals.map((g) => g.priority))
    try {
      const res = await financeService.updateSavingsGoal(goal.id, { ...requestFrom(goal), priority: first - 1 })
      if (res.error) throw new Error(res.error.message)
      toast.success(`${goal.name} is funded first now`)
      void financeActions.loadGoals()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to change the order'))
    }
  }

  const confirmArchive = async () => {
    const goal = archiveTarget
    if (!goal) return
    setArchiveTarget(null)
    setGoalModal(null)
    try {
      const res = await financeService.archiveGoal(goal.id, true)
      if (res.error) throw new Error(res.error.message)
      toast.success(goal.saved > 0 ? `Archived ${goal.name} — ${inr(goal.saved)} is back in your balance` : `Archived ${goal.name}`)
      if (goalParam === goal.id) closeGoal()
      reloadGoals()
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to archive ${goal.name}`))
    }
  }

  const moneyPlan = moneyModal ? planById.get(moneyModal.goalId) ?? null : null
  const workspacePlan = goalParam ? planById.get(goalParam) ?? null : null
  const workspaceRows = useMemo(() => (goalParam ? entries.filter((e) => e.goalId === goalParam) : []), [entries, goalParam])
  const workspaceRoom = workspacePlan ? roomFor(workspacePlan, capacity) : null
  const fundedBefore = workspacePlan && workspaceRoom != null && capacity.spare != null ? capacity.spare - workspaceRoom : 0
  const editingGoal = goalModal?.goal ?? null
  // Room for the goal being created / edited: what's free after every *other* goal.
  const modalRoom =
    capacity.free == null
      ? null
      : capacity.free + (editingGoal ? capacity.goals.find((g) => g.plan.goal.id === editingGoal.id)?.need ?? 0 : 0)

  const jumpTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <section
      ref={sectionRef}
      className="finance-dashboard route-scroll"
      aria-label={goalParam ? 'Savings goal' : 'Finance overview dashboard'}
    >
      {goalParam ? (
        <GoalWorkspace
          plan={workspacePlan}
          color={workspacePlan ? goalColors[workspacePlan.goal.id] ?? GOAL_COLORS[0] : GOAL_COLORS[0]}
          rows={workspaceRows}
          capacity={capacity}
          room={workspaceRoom}
          fundedBefore={fundedBefore}
          owed={owed}
          today={today}
          payday={payday}
          paydayKnown={paydayKnown}
          loading={goalsLoading}
          onBack={closeGoal}
          onEdit={() => workspacePlan && setGoalModal({ goal: workspacePlan.goal })}
          onSetAside={() => workspacePlan && setMoneyModal({ mode: 'set-aside', goalId: workspacePlan.goal.id })}
          onTakeOut={() => workspacePlan && setMoneyModal({ mode: 'take-out', goalId: workspacePlan.goal.id })}
          onBuy={() => workspacePlan && setMoneyModal({ mode: 'buy', goalId: workspacePlan.goal.id })}
          onOpenEntry={openEntry}
          onAddIncome={() => setIncomeOpen(true)}
          onSavePace={(patch) => workspacePlan && void savePace(workspacePlan.goal, patch)}
          onNewGoal={() => setGoalModal({ goal: null })}
          onFundFirst={() => workspacePlan && void fundFirst(workspacePlan.goal)}
          onFindShowcase={(url) => (workspacePlan ? findShowcase(workspacePlan.goal, url) : Promise.resolve(null))}
          onUpdateShowcase={(dto) => (workspacePlan ? updateShowcase(workspacePlan.goal, dto) : Promise.resolve(null))}
          // Guests can't reach the web.
          canFindByName={!isGuest}
        />
      ) : (
      <>
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
          goals={goalsGlance}
          loading={loading}
          onEditBalance={() => setIsEditBalanceOpen(true)}
          onJumpToBills={() => jumpTo(billsRef)}
          onPaydayPlan={() => {
            const first = payLines[0]
            if (first) setMoneyModal({ mode: 'set-aside', goalId: first.plan.goal.id, amount: first.amount })
          }}
          stagger={1}
        />

        {/* Rows are balanced rather than two free-running columns: a tall ledger in one
            column used to hang beside empty space. Nutrition's 7 + 5 rhythm: spending |
            wallet, then the breakdown, then Bills | Saving for (money already spoken for),
            each pair stretched to one height; Sent home and the ledger take the full width. */}
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

        <div className="fin-slot fin-slot--goals">
          <SavingForCard
            plans={plans}
            colors={goalColors}
            loading={goalsLoading}
            dueTotal={payLines.reduce((s, l) => s + l.amount, 0)}
            nudge={goalNudge}
            onOpen={openGoal}
            onAdd={() => setGoalModal({ goal: null })}
            onSetAside={(plan: GoalPlan, amount?: number, note?: string) =>
              setMoneyModal({ mode: 'set-aside', goalId: plan.goal.id, amount, note })
            }
            onBuy={(plan: GoalPlan) => setMoneyModal({ mode: 'buy', goalId: plan.goal.id })}
            onAddIncome={() => setIncomeOpen(true)}
            stagger={4}
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
            stagger={5}
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
            goalLabels={goalLabels}
            stagger={6}
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
      </>
      )}

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
        goals={savingGoalOptions}
        goalLens={goalLens}
        onClose={() => setTxModal(null)}
        onSuccess={() => {
          void financeActions.loadLending()
          // A row can belong to a savings goal, so the goals' money moves too.
          reloadGoals()
        }}
      />

      <GoalModal
        isOpen={goalModal != null}
        goal={editingGoal}
        defaultColor={GOAL_COLORS[goals.filter((g) => g.status !== 'ARCHIVED').length % GOAL_COLORS.length]}
        today={today}
        payday={payday}
        room={modalRoom}
        essentials={capacity.spending + capacity.sentHome}
        keptAtOptions={keptAtOptions}
        onClose={() => setGoalModal(null)}
        onSaved={(saved) => {
          void financeActions.loadGoals()
          if (!editingGoal) openGoal(saved.id)
        }}
        onArchive={setArchiveTarget}
      />

      <GoalMoneyModal
        isOpen={moneyModal != null && moneyPlan != null}
        mode={moneyModal?.mode ?? 'set-aside'}
        plan={moneyPlan}
        color={moneyPlan ? goalColors[moneyPlan.goal.id] ?? GOAL_COLORS[0] : GOAL_COLORS[0]}
        initialAmount={moneyModal?.amount}
        initialNote={moneyModal?.note}
        onClose={() => setMoneyModal(null)}
        onDone={afterGoalMoney}
      />

      <IncomeModal
        isOpen={incomeOpen}
        takeHome={settings?.takeHomeMonthly ?? null}
        payday={settings?.payday ?? null}
        onClose={() => setIncomeOpen(false)}
        onSaved={(plan) => financeActions.applyIncomePlan(plan)}
      />

      <ConfirmDialog
        open={archiveTarget != null}
        title="Archive goal"
        confirmLabel="Archive"
        message={
          archiveTarget
            ? archiveTarget.saved > 0
              ? `Archive ${archiveTarget.name}? The ${inr(archiveTarget.saved)} set aside goes back to your balance. Its history stays in your ledger.`
              : `Archive ${archiveTarget.name}? Its history stays in your ledger.`
            : ''
        }
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </section>
  )
}

export { FinanceOverviewDashboard }
