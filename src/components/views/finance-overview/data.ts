import type { LucideIcon } from 'lucide-react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Coffee,
  CreditCard,
  Landmark,
  Lightbulb,
  PiggyBank,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  ShoppingBag,
  WalletCards,
} from 'lucide-react'

export interface FinanceMetric {
  label: string
  value: string
  cents: string
  change: string
  tone: 'positive' | 'negative'
  icon: LucideIcon
}

export interface SpendingCategory {
  label: string
  value: string
  share: string
  tone: string
  icon: LucideIcon
}

export interface QuickAction {
  label: string
  icon: LucideIcon
}

export interface Transaction {
  merchant: string
  detail: string
  amount: string
  tone: 'income' | 'expense'
  icon: LucideIcon
}

export interface Subscription {
  service: string
  detail: string
  amount: string
  status: string
}

export interface Recommendation {
  title: string
  detail: string
  icon: LucideIcon
}

export const financeMetrics: FinanceMetric[] = [
  {
    label: 'Monthly Income',
    value: '$553,600',
    cents: '.07',
    change: '+7.1%',
    tone: 'positive',
    icon: ArrowUpRight,
  },
  {
    label: 'Monthly Expenses',
    value: '$850,000',
    cents: '.12',
    change: '+3.6%',
    tone: 'negative',
    icon: ArrowDownLeft,
  },
  {
    label: 'Monthly Savings',
    value: '$721,480',
    cents: '.13',
    change: '+8.3%',
    tone: 'positive',
    icon: PiggyBank,
  },
]

export const spendingCategories: SpendingCategory[] = [
  { label: 'Food & Dining', value: '$650', share: '32%', tone: '#10201a', icon: Coffee },
  { label: 'Transport', value: '$400', share: '20%', tone: '#748277', icon: WalletCards },
  { label: 'Shopping', value: '$350', share: '18%', tone: '#35b64b', icon: ShoppingBag },
  { label: 'Bills & Utilities', value: '$300', share: '14%', tone: '#9df7a5', icon: ReceiptText },
  { label: 'Others', value: '$250', share: '10%', tone: '#dfe4df', icon: CreditCard },
]

export const quickActions: QuickAction[] = [
  { label: 'Send Money', icon: Send },
  { label: 'Add Funds', icon: Plus },
  { label: 'Pay Bills', icon: ReceiptText },
  { label: 'Schedule', icon: CalendarClock },
]

export const recentTransactions: Transaction[] = [
  {
    merchant: 'Starbucks Coffee',
    detail: 'March 21, 9:42am',
    amount: '-$2,300',
    tone: 'expense',
    icon: Coffee,
  },
  {
    merchant: 'Salary Deposit',
    detail: 'March 16, 1:18pm',
    amount: '+$350,00',
    tone: 'income',
    icon: Landmark,
  },
  {
    merchant: 'Grocery Run',
    detail: 'March 15, 10:01pm',
    amount: '-$4,200',
    tone: 'expense',
    icon: ShoppingBag,
  },
]

export const subscriptions: Subscription[] = [
  { service: 'Netflix', detail: 'Renews Apr 28', amount: '$100', status: 'Today' },
  { service: 'Spotify', detail: 'Renews May 03', amount: '$18', status: '5 days' },
  { service: 'iCloud', detail: 'Renews May 12', amount: '$9', status: '14 days' },
]

export const recommendations: Recommendation[] = [
  {
    title: 'Save $5,000',
    detail: 'Shift extra cash to the laptop goal',
    icon: PiggyBank,
  },
  {
    title: 'Reduce Food Spending',
    detail: 'Try a weekly food budget',
    icon: Lightbulb,
  },
  {
    title: 'Protect Cards',
    detail: 'Review recurring payments',
    icon: ShieldCheck,
  },
]

export const totalBalance = {
  label: 'Total Balance',
  value: '$2,450,800',
  cents: '.50',
  change: '+5.2%',
}

export const subscriptionSummary = {
  total: '$127',
  label: 'Monthly subscriptions',
  change: '3 active renewals',
}

export const spendingOverview = {
  total: '$215,800',
  cents: '.19',
  topCategory: 'Food & Dining',
}

export const insight = {
  title: 'AI Smart Insight',
  body: 'You spent 32% more on food this week. Want tips to reduce it?',
  action: 'View Suggestions',
}

export const cashflowBars = [36, 58, 44, 73, 52, 89, 61, 70, 42, 66, 80, 57]

export const savingsGoal = {
  label: 'Emergency Fund',
  value: '$18,400',
  target: '$25,000',
  progress: 74,
}

export const financeTrendPoints = [34, 48, 42, 62, 58, 79, 67, 86, 72, 92]

export const balanceSparkBars = [12, 18, 28, 20, 34, 46, 38, 56, 48, 68, 58, 78]
