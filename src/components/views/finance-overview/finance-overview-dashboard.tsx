import { useEffect, useState, useMemo } from 'react'
import { BalanceSummaryCard } from './components/balance-summary-card'
import { CashflowCard } from './components/cashflow-card'
import { FinanceHeader } from './components/finance-header'
import { MetricCard } from './components/metric-card'
import { RecommendationsCard } from './components/recommendations-card'
import { SpendingOverviewCard } from './components/spending-overview-card'
import { SubscriptionsCard } from './components/subscriptions-card'
import { TransactionsCard } from './components/transactions-card'
import { financeMetrics as fallbackMetrics } from './data'
import { fetchDailyFinanceLogs } from '../../../lib/api'
import type { DailyFinancialLog } from '../../../lib/api'
import { ArrowUpRight, ArrowDownLeft, PiggyBank, Coffee, ShoppingBag, Landmark, WalletCards, ReceiptText, CreditCard } from 'lucide-react'

import './finance-overview.css'

function getIconForCategory(category: string) {
  const cat = category.toLowerCase();
  if (cat.includes('food') || cat.includes('dining')) return Coffee;
  if (cat.includes('shopping') || cat.includes('home')) return ShoppingBag;
  if (cat.includes('income') || cat.includes('salary')) return Landmark;
  if (cat.includes('transport')) return WalletCards;
  if (cat.includes('bills') || cat.includes('utilities')) return ReceiptText;
  return CreditCard;
}

function FinanceOverviewDashboard() {
  const [logs, setLogs] = useState<DailyFinancialLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch a full year of data so we get older transactions as well
    fetchDailyFinanceLogs(365).then((res) => {
      setLogs(res.data || [])
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const metrics = useMemo(() => {
    if (!logs.length) return fallbackMetrics
    
    let totalIncome = 0
    let totalExpense = 0
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    logs.forEach(log => {
      const logDate = new Date(log.date);
      // Only sum up for the current month for "Monthly" metrics
      if (logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear) {
        totalIncome += log.dailyTotals?.totalIncome || 0
        totalExpense += log.dailyTotals?.totalExpense || 0
      }
    })
    
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
        value: `₹${(totalIncome - totalExpense).toLocaleString()}`,
        cents: '',
        change: '',
        tone: 'positive' as const,
        icon: PiggyBank,
      },
    ]
  }, [logs])

  const recentTransactions = useMemo(() => {
    const allTxs: any[] = []
    logs.forEach(log => {
      Object.entries(log.transactions || {}).forEach(([category, txs]) => {
        txs.forEach(tx => {
          const isIncome = category.toLowerCase().includes('income');
          allTxs.push({
            merchant: tx.description,
            detail: new Date(tx.timestamp).toLocaleDateString(),
            category: category,
            amount: `${isIncome ? '+' : '-'}₹${tx.amount.toLocaleString()}`,
            tone: isIncome ? 'income' : 'expense',
            icon: getIconForCategory(category),
            timestamp: new Date(tx.timestamp).getTime()
          })
        })
      })
    })
    // Sort all transactions globally and take the 10 most recent
    return allTxs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
  }, [logs])

  return (
    <section className="finance-dashboard" aria-label="Finance overview dashboard">
      <FinanceHeader />
      <div className="finance-dashboard-grid">
        <BalanceSummaryCard />
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
        <SpendingOverviewCard />
        <TransactionsCard transactions={recentTransactions} loading={loading} />
        <SubscriptionsCard />
        <CashflowCard />
        <RecommendationsCard />
      </div>
    </section>
  )
}

export { FinanceOverviewDashboard }
