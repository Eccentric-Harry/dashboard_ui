import { BalanceSummaryCard } from './components/balance-summary-card'
import { CashflowCard } from './components/cashflow-card'
import { FinanceHeader } from './components/finance-header'
import { MetricCard } from './components/metric-card'
import { QuickActionsCard } from './components/quick-actions-card'
import { RecommendationsCard } from './components/recommendations-card'
import { SmartInsightCard } from './components/smart-insight-card'
import { SpendingOverviewCard } from './components/spending-overview-card'
import { SubscriptionsCard } from './components/subscriptions-card'
import { TransactionsCard } from './components/transactions-card'
import { financeMetrics } from './data'

import './finance-overview.css'

function FinanceOverviewDashboard() {
  return (
    <section className="finance-dashboard" aria-label="Finance overview dashboard">
      <FinanceHeader />
      <div className="finance-dashboard-grid">
        <BalanceSummaryCard />
        {financeMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
        <SpendingOverviewCard />
        <SmartInsightCard />
        <QuickActionsCard />
        <SubscriptionsCard />
        <CashflowCard />
        <RecommendationsCard />
        <TransactionsCard />
      </div>
    </section>
  )
}

export { FinanceOverviewDashboard }
