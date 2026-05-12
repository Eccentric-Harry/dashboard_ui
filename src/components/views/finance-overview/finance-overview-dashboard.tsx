import { useEffect, useState, useMemo } from 'react'
import { BalanceSummaryCard } from './components/balance-summary-card'
import { FinanceHeader } from './components/finance-header'
import { MetricCard } from './components/metric-card'
import { SpendingOverviewCard } from './components/spending-overview-card'
import { SubscriptionsCard } from './components/subscriptions-card'
import { TransactionsCard } from './components/transactions-card'
import { AddTransactionModal } from './components/add-transaction-modal'
import { ConfirmDialog } from './components/confirm-dialog'
import { financeMetrics as fallbackMetrics } from './data'
import { fetchDailyFinanceLogs, deleteTransaction } from '../../../lib/api'
import type { DailyFinancialLog } from '../../../lib/api'
import { 
  ArrowUpRight, ArrowDownLeft, PiggyBank
} from 'lucide-react'
import { getIconForCategory } from './utils'

import './finance-overview.css'


function FinanceOverviewDashboard() {
  const [logs, setLogs] = useState<DailyFinancialLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
  })

  const refreshData = () => {
    setLoading(true)
    fetchDailyFinanceLogs(365).then((res) => {
      const fetchedLogs = res.data || []
      setLogs(fetchedLogs)
      
      // If current month has no data, default to most recent month with data
      if (fetchedLogs.length > 0) {
        const availableMonthKeys = Array.from(new Set(fetchedLogs.map((log: DailyFinancialLog) => {
          const d = new Date(log.date)
          return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
        }))).sort().reverse()
        
        const currentMonthKey = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`
        if (!availableMonthKeys.includes(currentMonthKey)) {
          setSelectedMonthKey(availableMonthKeys[0] as string)
        }
      }
      
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }

  useEffect(() => {
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

    return [
      {
        label: 'Monthly Income',
        value: `₹${totalIncome.toLocaleString()}`,
        cents: '',
        change: '', 
        tone: 'positive' as const,
        icon: ArrowUpRight,
      },
      {
        label: 'Monthly Expenses',
        value: `₹${totalExpense.toLocaleString()}`,
        cents: '',
        change: '',
        tone: 'negative' as const,
        icon: ArrowDownLeft,
      },
      {
        label: 'Monthly Savings',
        value: `₹${monthlySavings.toLocaleString()}`,
        cents: '',
        change: '',
        tone: 'positive' as const,
        icon: PiggyBank,
      },
    ]
  }, [logs, selectedMonthKey])

  const recentTransactions = useMemo(() => {
    let allTxs: any[] = []
    logs.forEach(log => {
      const d = new Date(log.date)
      const logMonthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
      
      if (logMonthKey === selectedMonthKey) {
        Object.entries(log.transactions || {}).forEach(([category, txs]) => {
          txs.forEach(tx => {
            const isIncome = category.toLowerCase().includes('income');
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

    // Sort all transactions globally and pass the full array
    return allTxs.sort((a, b) => b.timestamp - a.timestamp)
  }, [logs, selectedCategory, selectedMonthKey])

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

  const handleDelete = async (tx: any) => {
    setDeleteTarget(tx)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteTransaction(deleteTarget.id)
      setDeleteTarget(null)
      refreshData()
    } catch (err) {
      console.error('Failed to delete transaction:', err)
      setDeleteTarget(null)
    }
  }

  return (
    <section className="finance-dashboard" aria-label="Finance overview dashboard">
      <FinanceHeader onAddClick={() => setIsAddModalOpen(true)} />
      <div className="finance-dashboard-grid">
        <BalanceSummaryCard />
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
        <TransactionsCard 
          transactions={recentTransactions} 
          loading={loading} 
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <SubscriptionsCard onRefresh={refreshData} />
        <SpendingOverviewCard 
          logs={logs} 
          selectedCategory={selectedCategory} 
          onCategorySelect={setSelectedCategory} 
          selectedMonthKey={selectedMonthKey}
          onMonthSelect={setSelectedMonthKey}
        />
      </div>
      
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete transaction"
        message={deleteTarget ? `Delete transaction "${deleteTarget.merchant}" (${deleteTarget.amount})?` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <AddTransactionModal 
        isOpen={isAddModalOpen || !!editingTransaction} 
        isEdit={!!editingTransaction}
        initialData={editingTransaction}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingTransaction(null)
        }} 
        onSuccess={refreshData} 
      />
    </section>
  )
}

export { FinanceOverviewDashboard }
