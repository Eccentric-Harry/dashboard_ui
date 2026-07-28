import { useEffect, useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { BalanceSummaryCard } from './components/balance-summary-card'
import { FinanceHeader } from './components/finance-header'
import { MetricCard } from './components/metric-card'
import { SpendingOverviewCard } from './components/spending-overview-card'
import { SubscriptionsCard } from './components/subscriptions-card'
import { RepaymentScheduleCard } from './components/repayment-schedule-card'
import { TransactionsCard } from './components/transactions-card'
import { AddTransactionModal } from './components/add-transaction-modal'
import { EditBalanceModal } from './components/edit-balance-modal'
import { EditBudgetModal } from './components/edit-budget-modal'
import { LendingCard } from './components/lending-card'
import { FinanceIntelligence } from './components/finance-intelligence'
import { ConfirmDialog } from '../../ui/confirm-dialog'
import { financeMetrics as fallbackMetrics } from './data'
import type { FinanceMetric } from './data'
import type { LendingRecord } from '../../../types/finance'
import { financeService } from '../../../services/finance-service'
import { useFinanceStore } from '../../../store/finance-store'
import {
  ArrowUpRight, Gauge, PiggyBank, Target
} from 'lucide-react'
import { getIconForCategory } from './utils'

import './finance-overview.css'


function FinanceOverviewDashboard() {
  const isGuest = localStorage.getItem('isGuest') === 'true'

  // Server state now comes from the finance store (RemoteDataStatus slices).
  // Ephemeral UI state (modals, filters, selected date) stays local below.
  const logsState = useFinanceStore.use.dailyLogs()
  const accountState = useFinanceStore.use.account()
  const budgetState = useFinanceStore.use.budget()
  const financeActions = useFinanceStore.use.actions()

  const logs = logsState.data
  const loading = logsState.loading || (!logsState.loaded && !logsState.hasErrors)
  const balance = accountState.loaded ? (accountState.data?.balance ?? 0) : null
  const monthlyBudget = budgetState.data?.monthlyBudget ?? accountState.data?.monthlyBudget ?? null

  const [isEditBalanceOpen, setIsEditBalanceOpen] = useState(false)
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [isLendingModalOpen, setIsLendingModalOpen] = useState(false)
  const [editingLending, setEditingLending] = useState<LendingRecord | null>(null)
  const [deleteLendingTarget, setDeleteLendingTarget] = useState<LendingRecord | null>(null)
  const [lendingRefreshKey, setLendingRefreshKey] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('date') || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  })
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    const dStr = params.get('date') || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    return dStr.substring(0, 7)
  })

  const [showFinanceGrids, setShowFinanceGrids] = useState(() => {
    const stored = localStorage.getItem('showFinanceGrids');
    return stored ? stored === 'true' : false;
  });

  // Bottom-dock quick-add bubble opens the same "add transaction" modal
  useEffect(() => {
    const handler = () => setIsAddModalOpen(true)
    window.addEventListener('mobile-quick-add', handler)
    return () => window.removeEventListener('mobile-quick-add', handler)
  }, [])

  useEffect(() => {
    const handleVisibilityChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setShowFinanceGrids(customEvent.detail);
    };
    window.addEventListener('financeGridsVisibilityChanged', handleVisibilityChange);
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'showFinanceGrids') {
        setShowFinanceGrids(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('financeGridsVisibilityChanged', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const nextDate = params.get('date') || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      setSelectedDate(nextDate)
      const [year, month] = nextDate.split('-')
      if (year && month) {
        setSelectedMonthKey(`${year}-${month}`)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    const [year, month] = date.split('-')
    if (year && month) {
      setSelectedMonthKey(`${year}-${month}`)
    }
  }


  // Refresh every finance slice; passed to child cards/modals as their onRefresh.
  const refreshData = () => {
    void financeActions.loadAll()
  }

  useEffect(() => {
    void financeActions.loadAll()
  }, [financeActions])

  const metrics = useMemo(() => {
    if (!logs.length) return fallbackMetrics

    let totalIncome = 0
    let totalExpense = 0
    let txCount = 0

    logs.forEach(log => {
      const d = new Date(log.date)
      const logMonthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`

      if (logMonthKey === selectedMonthKey) {
        totalIncome += log.dailyTotals?.totalIncome || 0
        totalExpense += log.dailyTotals?.totalExpense || 0
        Object.values(log.transactions || {}).forEach(txs => { txCount += txs.length })
      }
    })

    const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

    const budget = monthlyBudget ?? 20000
    const budgetRemaining = budget - totalExpense
    const budgetSubtitle = budgetRemaining >= 0
      ? `${inr(budgetRemaining)} left`
      : `${inr(-budgetRemaining)} over`
    const budgetSubtitleTone = budgetRemaining >= 0
      ? (budgetRemaining < budget * 0.2 ? 'warning' as const : 'positive' as const)
      : 'negative' as const

    // Days elapsed in the *selected* month — the current month counts only up to
    // today, a past month counts in full, so the daily average is never diluted
    // by days that haven't happened yet.
    const [yearStr, monthStr] = selectedMonthKey.split('-')
    const year = Number(yearStr)
    const monthIndex = Number(monthStr) - 1
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const now = new Date()
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === monthIndex
    const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth
    const avgPerDay = daysElapsed > 0 ? totalExpense / daysElapsed : 0
    const budgetPerDay = daysInMonth > 0 ? budget / daysInMonth : 0

    // The 4th tile adapts rather than sitting dead: "Monthly Savings" was
    // max(0, income − expense), and with no income ever recorded it displayed a
    // permanent ₹0 while also hiding any net-negative month. Show real savings
    // when there is income to save from, otherwise show the burn rate — which is
    // always meaningful and is what actually predicts overspend.
    const hasIncome = totalIncome > 0
    const netSaved = totalIncome - totalExpense
    const paceTile: FinanceMetric = hasIncome
      ? {
        label: 'Net Saved',
        value: `${netSaved < 0 ? '−' : ''}${inr(Math.abs(netSaved))}`,
        cents: '',
        change: '',
        tone: netSaved >= 0 ? 'positive' as const : 'negative' as const,
        icon: PiggyBank,
        subtitle: `${inr(totalIncome)} in · ${inr(totalExpense)} out`,
        subtitleTone: netSaved >= 0 ? 'positive' as const : 'negative' as const,
      }
      : {
        label: 'Avg / day',
        value: inr(avgPerDay),
        cents: '',
        change: '',
        tone: avgPerDay <= budgetPerDay ? 'positive' as const : 'negative' as const,
        icon: Gauge,
        subtitle: budgetPerDay > 0
          ? `${inr(budgetPerDay)}/day pace`
          : `over ${daysElapsed} days`,
        subtitleTone: avgPerDay <= budgetPerDay ? 'positive' as const : 'warning' as const,
      }

    return [
      paceTile,
      {
        label: 'Monthly Budget',
        value: inr(budget),
        cents: '',
        change: '',
        tone: 'positive' as const,
        icon: Target,
        subtitle: budgetSubtitle,
        subtitleTone: budgetSubtitleTone,
        progress: budget > 0 ? totalExpense / budget : 0,
        progressTone: budgetSubtitleTone,
      },
      {
        label: 'Monthly Expenses',
        value: inr(totalExpense),
        cents: '',
        change: '',
        tone: 'negative' as const,
        icon: ArrowUpRight,
        subtitle: `${txCount} transaction${txCount === 1 ? '' : 's'}`,
        // A count is a fact, not good news — green here read as a value judgment.
        subtitleTone: 'neutral' as const,
      },
    ]
  }, [logs, selectedMonthKey, monthlyBudget])

  const recentTransactions = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allTxs: any[] = []
    logs.forEach(log => {
      const d = new Date(log.date)
      const logMonthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
      
      if (logMonthKey === selectedMonthKey) {
        Object.entries(log.transactions || {}).forEach(([category, txs]) => {
          txs.forEach(tx => {
            // Prefer the stored transaction type; fall back to the category-name
            // heuristic only for legacy records saved before `type` was persisted.
            const isIncome = tx.type
              ? tx.type.toLowerCase() === 'income'
              : category.toLowerCase().includes('income');
            allTxs.push({
              id: tx.id,
              merchant: tx.description,
              detail: new Date(tx.timestamp).toLocaleDateString(),
              category: category,
              amount: `${isIncome ? '+' : '-'}₹${tx.amount.toLocaleString()}`,
              tone: isIncome ? 'income' : 'expense',
              icon: getIconForCategory(category),
              timestamp: new Date(tx.timestamp).getTime(),
              rawAmount: tx.amount,
              rawDate: new Date(tx.timestamp).toISOString().split('T')[0],
              rawType: isIncome ? 'Income' : 'Expense'
            })
          })
        })
      }
    })
    
    if (selectedCategory) {
      allTxs = allTxs.filter(tx => tx.category === selectedCategory)
    }

    // Show the newest added transactions first.
    // By comparing the IDs (MongoDB ObjectIDs encode exact creation time), 
    // we guarantee the exact chronological insertion order even if they share the exact same 'date'.
    return allTxs.sort((a, b) => {
      // Sort primarily by precise timestamp if available/differ
      if (b.timestamp !== a.timestamp && !Number.isNaN(b.timestamp) && !Number.isNaN(a.timestamp)) {
        return b.timestamp - a.timestamp;
      }
      // Guarantee exact insertion order
      if (typeof a.id === 'string' && typeof b.id === 'string') {
        return b.id.localeCompare(a.id);
      }
      return 0;
    })
  }, [logs, selectedCategory, selectedMonthKey])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (tx: any) => {
    setEditingTransaction({
      id: tx.id,
      description: tx.merchant,
      amount: tx.rawAmount,
      category: tx.category,
      type: tx.rawType,
      date: tx.rawDate
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDelete = async (tx: any) => {
    setDeleteTarget(tx)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await financeService.deleteTransaction(deleteTarget.id)
      if (res.error) throw new Error(res.error.message)
      toast.success(`Deleted "${deleteTarget.merchant}"`)
      setDeleteTarget(null)
      refreshData()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete transaction')
      console.error('Failed to delete transaction:', err)
      setDeleteTarget(null)
    }
  }

  const confirmDeleteLending = async () => {
    if (!deleteLendingTarget) return
    try {
      const res = await financeService.deleteLending(deleteLendingTarget.id)
      if (res.error) throw new Error(res.error.message)
      toast.success(`Deleted lending record for ${deleteLendingTarget.borrower}`)
      setDeleteLendingTarget(null)
      setLendingRefreshKey(prev => prev + 1)
      refreshData()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete lending record')
      console.error('Failed to delete lending record:', err)
      setDeleteLendingTarget(null)
    }
  }



  return (
    <section className="finance-dashboard" aria-label="Finance overview dashboard">
      <FinanceHeader 
        onAddClick={() => setIsAddModalOpen(true)} 
        logs={logs}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
      />
      <div className={`finance-dashboard-grid${isGuest ? ' finance-dashboard-guest' : ''}`}>
        <div className="finance-stats-row">
          <BalanceSummaryCard
            balance={balance}
            loading={loading && balance === null}
            onEdit={() => setIsEditBalanceOpen(true)}
          />
          {metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              metric={metric}
              loading={loading}
              onEdit={metric.label === 'Monthly Budget' ? () => setIsEditBudgetOpen(true) : undefined}
            />
          ))}
        </div>
        <FinanceIntelligence
          logs={logs}
          monthlyBudget={monthlyBudget}
          selectedMonthKey={selectedMonthKey}
          onMonthChange={setSelectedMonthKey}
          loading={loading}
          refreshKey={lendingRefreshKey}
        />
        <SpendingOverviewCard
          logs={logs} 
          selectedCategory={selectedCategory} 
          onCategorySelect={setSelectedCategory} 
          selectedMonthKey={selectedMonthKey}
          onMonthSelect={setSelectedMonthKey}
          loading={loading}
        />
        <TransactionsCard 
          transactions={recentTransactions} 
          loading={loading} 
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <SubscriptionsCard transactions={recentTransactions} onRefresh={refreshData} />
        {!isGuest && showFinanceGrids && <RepaymentScheduleCard transactions={recentTransactions} onRefresh={refreshData} />}
        {!isGuest && showFinanceGrids && <LendingCard
          refreshKey={lendingRefreshKey}
          onEditClick={(record) => {
            setEditingLending(record)
            setIsLendingModalOpen(true)
          }}
          onDeleteClick={(record) => {
            setDeleteLendingTarget(record)
          }}
          onRefreshTransactions={refreshData}
        />}
      </div>
      
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete transaction"
        message={deleteTarget ? `Delete transaction "${deleteTarget.merchant}" (${deleteTarget.amount})?` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteLendingTarget}
        title="Delete lending record"
        message={deleteLendingTarget ? `Are you sure you want to delete the lending record for "${deleteLendingTarget.borrower}" (₹${deleteLendingTarget.amount})?` : ''}
        onConfirm={confirmDeleteLending}
        onCancel={() => setDeleteLendingTarget(null)}
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
        onClose={() => setIsEditBudgetOpen(false)}
        onSuccess={(newBudget) => financeActions.applyBudget(newBudget)}
      />

      <AddTransactionModal
        isOpen={isAddModalOpen || isLendingModalOpen || !!editingTransaction || !!editingLending}
        initialTab={isLendingModalOpen || !!editingLending ? 'Lending' : 'Transaction'}
        isEdit={!!editingTransaction || !!editingLending}
        initialTransactionData={editingTransaction}
        initialLendingData={editingLending}
        onClose={() => {
          setIsAddModalOpen(false)
          setIsLendingModalOpen(false)
          setEditingTransaction(null)
          setEditingLending(null)
        }} 
        onSuccess={() => {
          setLendingRefreshKey(prev => prev + 1)
          refreshData()
        }} 
      />
    </section>
  )
}

export { FinanceOverviewDashboard }
