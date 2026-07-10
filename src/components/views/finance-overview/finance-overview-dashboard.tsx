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
import { ConfirmDialog } from '../../ui/confirm-dialog'
import { financeMetrics as fallbackMetrics } from './data'
import { fetchDailyFinanceLogs, fetchFinanceAccount, deleteTransaction, deleteLendingRecord, type LendingRecord } from '../../../lib/api'
import { fetchFinanceBudget } from '../../../lib/api'
import type { DailyFinancialLog } from '../../../lib/api'
import {
  ArrowUpRight, PiggyBank, Target
} from 'lucide-react'
import { getIconForCategory } from './utils'

import './finance-overview.css'


function FinanceOverviewDashboard() {
  const isGuest = localStorage.getItem('isGuest') === 'true'
  const [logs, setLogs] = useState<DailyFinancialLog[]>([])
  const [balance, setBalance] = useState<number | null>(null)
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null)
  const [isEditBalanceOpen, setIsEditBalanceOpen] = useState(false)
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false)
  const [loading, setLoading] = useState(true)
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


  const refreshData = () => {
    setLoading(true)
    fetchDailyFinanceLogs(365).then((res) => {
      const fetchedLogs = res.data || []
      setLogs(fetchedLogs)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
    fetchFinanceAccount()
      .then((res) => {
        setBalance(res.data?.balance ?? 0)
        setMonthlyBudget(res.data?.monthlyBudget ?? 20000)
      })
      .catch(err => console.error('Failed to fetch balance:', err))
    fetchFinanceBudget()
      .then((res) => setMonthlyBudget(res.data?.monthlyBudget ?? 20000))
      .catch(() => { /* non-critical */ })
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData()
  }, [])

  const metrics = useMemo(() => {
    if (!logs.length) return fallbackMetrics
    
    let totalIncome = 0
    let totalExpense = 0
    
    logs.forEach(log => {
      const d = new Date(log.date)
      const logMonthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
      
      if (logMonthKey === selectedMonthKey) {
        totalIncome += log.dailyTotals?.totalIncome || 0
        totalExpense += log.dailyTotals?.totalExpense || 0
      }
    })
    
    const monthlySavings = Math.max(0, totalIncome - totalExpense)
    const budget = monthlyBudget ?? 20000
    const budgetRemaining = budget - totalExpense
    const budgetSubtitle = budgetRemaining >= 0
      ? `₹${Math.round(budgetRemaining).toLocaleString('en-IN')} left`
      : `₹${Math.round(-budgetRemaining).toLocaleString('en-IN')} over`
    const budgetSubtitleTone = budgetRemaining >= 0
      ? (budgetRemaining < budget * 0.2 ? 'warning' as const : 'positive' as const)
      : 'negative' as const

    return [
      {
        label: 'Monthly Savings',
        value: `₹${monthlySavings.toLocaleString()}`,
        cents: '',
        change: '',
        tone: 'positive' as const,
        icon: PiggyBank,
      },
      {
        label: 'Monthly Budget',
        value: `₹${budget.toLocaleString()}`,
        cents: '',
        change: '',
        tone: 'positive' as const,
        icon: Target,
        subtitle: budgetSubtitle,
        subtitleTone: budgetSubtitleTone,
      },
      {
        label: 'Monthly Expenses',
        value: `₹${totalExpense.toLocaleString()}`,
        cents: '',
        change: '',
        tone: 'negative' as const,
        icon: ArrowUpRight,
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
      await deleteTransaction(deleteTarget.id)
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
      await deleteLendingRecord(deleteLendingTarget.id)
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
        onSuccess={(newBalance) => setBalance(newBalance)}
      />

      <EditBudgetModal
        isOpen={isEditBudgetOpen}
        currentBudget={monthlyBudget ?? 20000}
        onClose={() => setIsEditBudgetOpen(false)}
        onSuccess={(newBudget) => setMonthlyBudget(newBudget)}
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
