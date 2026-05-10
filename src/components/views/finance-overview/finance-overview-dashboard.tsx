import { useEffect, useState, useMemo } from 'react'
import { BalanceSummaryCard } from './components/balance-summary-card'
import { CashflowCard } from './components/cashflow-card'
import { FinanceHeader } from './components/finance-header'
import { MetricCard } from './components/metric-card'
import { RecommendationsCard } from './components/recommendations-card'
import { SpendingOverviewCard } from './components/spending-overview-card'
import { SubscriptionsCard } from './components/subscriptions-card'
import { TransactionsCard } from './components/transactions-card'
import { AddTransactionModal } from './components/add-transaction-modal'
import { financeMetrics as fallbackMetrics } from './data'
import { fetchDailyFinanceLogs } from '../../../lib/api'
import type { DailyFinancialLog } from '../../../lib/api'
import { 
  ArrowUpRight, ArrowDownLeft, PiggyBank, Coffee, ShoppingBag, 
  Landmark, WalletCards, ReceiptText,
  Utensils, ShoppingCart, Car, Fuel, Train,
  Film, MonitorPlay, Ticket, Stethoscope, Pill,
  Plane, Home, ShieldCheck, TrendingUp, HandCoins,
  Scissors, Dumbbell, Sparkles, CircleDollarSign
} from 'lucide-react'

import './finance-overview.css'

export function getIconForCategory(category: string) {
  const cat = category.toLowerCase()
  
  // Food & Dining
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('dining')) return Utensils
  if (cat.includes('grocer') || cat.includes('supermarket')) return ShoppingCart
  if (cat.includes('coffee') || cat.includes('cafe')) return Coffee
  
  // Shopping & Personal Care
  if (cat.includes('shopping') || cat.includes('retail') || cat.includes('clothing')) return ShoppingBag
  if (cat.includes('salon') || cat.includes('hair') || cat.includes('care')) return Scissors
  
  // Transport
  if (cat.includes('gas') || cat.includes('fuel')) return Fuel
  if (cat.includes('car') || cat.includes('auto') || cat.includes('uber')) return Car
  if (cat.includes('train') || cat.includes('transit') || cat.includes('subway') || cat.includes('bus')) return Train
  if (cat.includes('flight') || cat.includes('travel')) return Plane
  if (cat.includes('transport')) return Car
  
  // Housing & Bills
  if (cat.includes('home') || cat.includes('rent') || cat.includes('mortgage')) return Home
  if (cat.includes('bill') || cat.includes('utilit')) return ReceiptText
  if (cat.includes('insur')) return ShieldCheck
  
  // Entertainment & Subs
  if (cat.includes('movie') || cat.includes('cinema')) return Film
  if (cat.includes('sub') || cat.includes('streaming') || cat.includes('netflix')) return MonitorPlay
  if (cat.includes('entertain') || cat.includes('ticket') || cat.includes('event')) return Ticket
  
  // Health & Fitness
  if (cat.includes('health') || cat.includes('medical') || cat.includes('doctor')) return Stethoscope
  if (cat.includes('gym') || cat.includes('fitness') || cat.includes('sport')) return Dumbbell
  if (cat.includes('pharmacy') || cat.includes('medicine')) return Pill
  
  // Income & Investments
  if (cat.includes('salary') || cat.includes('income')) return Landmark
  if (cat.includes('invest') || cat.includes('stock')) return TrendingUp
  if (cat.includes('lend') || cat.includes('borrow')) return HandCoins
  
  // Miscellaneous
  if (cat.includes('misc') || cat.includes('other')) return Sparkles
  
  // Fallbacks
  if (cat.includes('card')) return WalletCards
  return CircleDollarSign
}

function FinanceOverviewDashboard() {
  const [logs, setLogs] = useState<DailyFinancialLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any>(null)
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
        const availableMonthKeys = Array.from(new Set(fetchedLogs.map(log => {
          const d = new Date(log.date)
          return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
        }))).sort().reverse()
        
        const currentMonthKey = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`
        if (!availableMonthKeys.includes(currentMonthKey)) {
          setSelectedMonthKey(availableMonthKeys[0])
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

  return (
    <section className="finance-dashboard" aria-label="Finance overview dashboard">
      <FinanceHeader onAddClick={() => setIsAddModalOpen(true)} />
      <div className="finance-dashboard-grid">
        <BalanceSummaryCard />
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
        <SpendingOverviewCard 
          logs={logs} 
          selectedCategory={selectedCategory} 
          onCategorySelect={setSelectedCategory} 
          selectedMonthKey={selectedMonthKey}
          onMonthSelect={setSelectedMonthKey}
        />
        <TransactionsCard 
          transactions={recentTransactions} 
          loading={loading} 
          onEdit={handleEdit}
        />
        <SubscriptionsCard />
        <CashflowCard />
        <RecommendationsCard />
      </div>
      
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
