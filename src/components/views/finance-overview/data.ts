import type { LucideIcon } from 'lucide-react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coffee,
  CreditCard,
  Landmark,
  Lightbulb,
  PiggyBank,
  ReceiptText,
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

export interface Transaction {
  merchant: string
  detail: string
  category: string
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
    value: '₹5,53,600',
    cents: '',
    change: '+7.1%',
    tone: 'positive',
    icon: ArrowUpRight,
  },
  {
    label: 'Monthly Expenses',
    value: '₹8,50,000',
    cents: '',
    change: '+3.6%',
    tone: 'negative',
    icon: ArrowDownLeft,
  },
  {
    label: 'Monthly Savings',
    value: '₹7,21,480',
    cents: '',
    change: '+8.3%',
    tone: 'positive',
    icon: PiggyBank,
  },
]

export const spendingCategories: SpendingCategory[] = [
  { label: 'Food & Dining', value: '₹6,500', share: '32%', tone: '#10201a', icon: Coffee },
  { label: 'Transport', value: '₹4,000', share: '20%', tone: '#748277', icon: WalletCards },
  { label: 'Shopping', value: '₹3,500', share: '18%', tone: '#35b64b', icon: ShoppingBag },
  { label: 'Bills & Utilities', value: '₹3,000', share: '14%', tone: '#9df7a5', icon: ReceiptText },
  { label: 'Others', value: '₹2,500', share: '10%', tone: '#dfe4df', icon: CreditCard },
]

export const recentTransactions: Transaction[] = [
  {
    merchant: 'Starbucks Reserve',
    detail: 'Today, 9:42 AM',
    category: 'Dining',
    amount: '-₹460',
    tone: 'expense',
    icon: Coffee,
  },
  {
    merchant: 'Salary Deposit',
    detail: 'Today, 7:10 AM',
    category: 'Income',
    amount: '+₹6,85,000',
    tone: 'income',
    icon: Landmark,
  },
  {
    merchant: 'Whole Foods Market',
    detail: 'Yesterday, 6:28 PM',
    category: 'Groceries',
    amount: '-₹4,216',
    tone: 'expense',
    icon: ShoppingBag,
  },
  {
    merchant: 'Metro Tap Card',
    detail: 'Yesterday, 8:05 AM',
    category: 'Transport',
    amount: '-₹350',
    tone: 'expense',
    icon: WalletCards,
  },
  {
    merchant: 'Electric Utility',
    detail: 'Mar 19, 2:14 PM',
    category: 'Bills',
    amount: '-₹2,147',
    tone: 'expense',
    icon: ReceiptText,
  },
  {
    merchant: 'Client Transfer',
    detail: 'Mar 18, 11:32 AM',
    category: 'Income',
    amount: '+₹2,40,000',
    tone: 'income',
    icon: ArrowUpRight,
  },
  {
    merchant: 'Apple Store',
    detail: 'Mar 17, 4:48 PM',
    category: 'Shopping',
    amount: '-₹32,900',
    tone: 'expense',
    icon: CreditCard,
  },
  {
    merchant: 'Savings Sweep',
    detail: 'Mar 16, 9:00 AM',
    category: 'Transfer',
    amount: '+₹95,000',
    tone: 'income',
    icon: PiggyBank,
  },
]

export const subscriptions: Subscription[] = [
  { service: 'Youtube Premium', detail: 'Renews on 14th', amount: '₹89', status: 'Upcoming' },
  { service: 'Netflix', detail: 'Renews on 28th', amount: '₹199', status: 'Upcoming' },
  { service: 'Jio Prepaid', detail: 'Renews on 30th', amount: '₹349', status: 'Upcoming' },
]

export const recommendations: Recommendation[] = [
  {
    title: 'Save ₹5,000',
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
  value: '₹24,50,800',
  cents: '',
  change: '+5.2%',
}

export const subscriptionSummary = {
  total: '₹637',
  label: 'Monthly subscriptions',
  change: '3 active renewals',
}

export const spendingOverview = {
  total: '₹2,15,800',
  cents: '',
  topCategory: 'Food & Dining',
}

export const cashflowBars = [36, 58, 44, 73, 52, 89, 61, 70, 42, 66, 80, 57]

export const savingsGoal = {
  label: 'Emergency Fund',
  value: '₹18,400',
  target: '₹25,000',
  progress: 74,
}

export const financeTrendPoints = [34, 48, 42, 62, 58, 79, 67, 86, 72, 92]

export const balanceSparkBars = [12, 18, 28, 20, 34, 46, 38, 56, 48, 68, 58, 78]
