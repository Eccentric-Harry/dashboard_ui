// The month at a glance — the first card on /finance.
//
// Stats first. A row of tinted KPI tiles said the month's spend seven times; the next
// version fixed that with one big headline, but pushed Balance and the other figures
// below the fold behind ~330px of headline and chart. Now the figures you scan for sit
// in one dense strip at the top — Balance and the budget verdict lead, each number said
// once — and the cumulative chart runs full width underneath as supporting detail.

import type { CSSProperties, ReactNode } from 'react'
import { ChevronDown, Pencil } from 'lucide-react'
import type { BudgetScope } from '@/types/finance'
import type { MoneySummary } from '@/lib/finance-ledger'
import { daysInMonth, inr, monthLabel } from '@/lib/insights/engine'
import type { Burndown, LendingExposure, TransferSummary } from '@/lib/insights/finance'
import { cn } from '@/lib/utils'
import { useCountUp } from '@/hooks/use-count-up'
import { BurndownChart } from './burndown-chart'

export interface BillsGlance {
  hasBills: boolean
  /** Still due this month (overdue included). */
  dueTotal: number
  dueCount: number
  /** The soonest unpaid bill, or the next renewal when everything is paid. */
  next: { name: string; date: string; overdue: boolean } | null
}

interface MonthHeroProps {
  monthKey: string
  months: [string, string][]
  onMonthChange: (monthKey: string) => void
  burndown: Burndown | null
  summary: MoneySummary
  budget: number | null
  scope: BudgetScope
  balance: number | null
  bills: BillsGlance
  transfers: TransferSummary
  exposure: LendingExposure | null
  loading: boolean
  onEditBalance: () => void
  onEditBudget: () => void
  onJumpToBills: () => void
  onJumpToTransfers: () => void
  stagger?: number
}

type Tone = 'good' | 'watch' | 'over' | 'neutral'

interface Stat {
  key: string
  label: string
  value: ReactNode
  note?: ReactNode
  tone?: Tone
  /** Value tone — only the budget verdict ever colours its figure. */
  valueTone?: Tone
  /** Leads the strip at a larger size (Balance, the budget verdict). */
  primary?: boolean
  meter?: ReactNode
  onClick?: () => void
  action?: string
}

const MAX_STATS = 6

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })

function MonthHero({
  monthKey,
  months,
  onMonthChange,
  burndown,
  summary,
  budget,
  scope,
  balance,
  bills,
  transfers,
  exposure,
  loading,
  onEditBalance,
  onEditBudget,
  onJumpToBills,
  onJumpToTransfers,
  stagger = 0,
}: MonthHeroProps) {
  const month = monthLabel(monthKey).split(' ')[0]
  const hasBudget = (budget ?? 0) > 0
  const spent = burndown?.spent ?? summary.budgeted
  const left = (budget ?? 0) - spent
  const isCurrent = burndown?.isCurrentMonth ?? false
  const over = hasBudget && left < 0
  const watch = !over && hasBudget && isCurrent && burndown != null && burndown.avgPerDay > burndown.safePerDay * 1.05
  const tone: Tone = !hasBudget ? 'neutral' : over ? 'over' : watch ? 'watch' : 'good'
  const verdict = useCountUp(Math.round(hasBudget ? Math.abs(left) : summary.spending))
  const pct = hasBudget ? Math.round((spent / (budget ?? 1)) * 100) : 0

  // ── Budget meter (inside the verdict stat) ───────────────────────────────
  const scale = Math.max(budget ?? 0, spent, 1)
  const withinPct = (Math.min(spent, budget ?? 0) / scale) * 100
  const overPct = over ? ((spent - (budget ?? 0)) / scale) * 100 : 0
  const limitPct = ((budget ?? 0) / scale) * 100
  const paceAmount = isCurrent && burndown ? ((budget ?? 0) * burndown.daysElapsed) / daysInMonth(monthKey) : null
  const pacePct = paceAmount != null ? (paceAmount / scale) * 100 : null
  const meter = hasBudget && summary.count > 0 && (
    <span className="fin-meter" role="img" aria-label={`${pct}% of the ${inr(budget ?? 0)} budget used`}>
      <span className="fin-meter-track">
        <i className="fin-meter-fill" style={{ width: `${withinPct}%` }} />
        {over && <i className="fin-meter-over" style={{ left: `${limitPct}%`, width: `${overPct}%` }} />}
        {over && <span className="fin-meter-limit" style={{ left: `${limitPct}%` }} />}
        {pacePct != null && !over && <span className="fin-meter-pace" style={{ left: `${pacePct}%` }} />}
      </span>
    </span>
  )

  // ── Stats: each says its number once ─────────────────────────────────────
  const stats: Stat[] = []
  const hasOtherFlows = summary.income > 0 || summary.transferOut > 0 || summary.transferIn > 0
  stats.push({
    key: 'balance',
    label: 'Balance',
    primary: true,
    value: balance == null ? '—' : inr(balance),
    // The net only adds something when money other than spending moved.
    note: hasOtherFlows ? `${summary.net >= 0 ? '+' : '−'}${inr(Math.abs(summary.net))} this month` : 'running total',
    tone: hasOtherFlows && summary.net >= 0 ? 'good' : undefined,
    onClick: onEditBalance,
    action: 'Update balance',
  })

  if (!hasBudget) {
    stats.push({
      key: 'budget',
      label: `Spent in ${month}`,
      primary: true,
      value: inr(verdict),
      note: 'Set a budget to see your pace',
      onClick: onEditBudget,
      action: 'Set a budget',
    })
  } else {
    const dailyNote =
      isCurrent && burndown
        ? over
          ? `avg ${inr(burndown.avgPerDay)}/day`
          : `${inr(burndown.safePerDay)}/day · ${pct}% used`
        : `${pct}% of budget`
    stats.push({
      key: 'budget',
      label: isCurrent ? (over ? 'Over budget' : 'Left to spend') : over ? 'Finished over' : 'Finished under',
      primary: true,
      value: summary.count > 0 ? inr(verdict) : inr(budget ?? 0),
      valueTone: tone,
      meter,
      note: summary.count > 0 ? dailyNote : 'nothing logged yet',
      tone: over ? 'over' : watch ? 'watch' : undefined,
      onClick: onEditBudget,
      action: 'Edit budget',
    })
  }

  if (isCurrent && burndown && hasBudget) {
    const delta = (budget ?? 0) - burndown.projectedTotal
    const close = Math.abs(delta) <= (budget ?? 0) * 0.03
    stats.push({
      key: 'forecast',
      label: 'Month-end',
      value: `≈ ${inr(burndown.projectedTotal)}`,
      note: close ? 'right on budget' : delta > 0 ? `≈ ${inr(delta)} under` : `≈ ${inr(-delta)} over`,
      tone: close ? undefined : delta > 0 ? 'good' : 'over',
    })
  } else if (summary.spendingCount > 0) {
    stats.push({
      key: 'spent',
      label: 'Spent',
      value: inr(summary.spending),
      note: `${inr(summary.spending / daysInMonth(monthKey))} a day`,
    })
  }
  if (bills.hasBills) {
    stats.push({
      key: 'bills',
      label: bills.dueTotal > 0 ? 'Bills due' : 'Bills',
      value: bills.dueTotal > 0 ? inr(bills.dueTotal) : 'All paid',
      note: bills.next
        ? bills.next.overdue
          ? `${bills.next.name} · overdue`
          : `${bills.dueTotal > 0 ? '' : 'next '}${bills.next.name} · ${shortDate(bills.next.date)}`
        : undefined,
      tone: bills.next?.overdue ? 'over' : bills.dueTotal > 0 ? 'watch' : 'good',
      onClick: onJumpToBills,
      action: 'See bills',
    })
  }
  if (transfers.familyOut > 0 || transfers.familyAvg != null) {
    stats.push({
      key: 'home',
      label: 'Sent home',
      value: inr(transfers.familyOut),
      note: transfers.familyAvg != null ? `usual ${inr(transfers.familyAvg)}` : 'not spending',
      onClick: onJumpToTransfers,
      action: 'See transfers',
    })
  }
  if (summary.income > 0) {
    stats.push({ key: 'income', label: 'Income', value: inr(summary.income), note: `in ${month}`, tone: 'good' })
  }
  if (exposure && exposure.owedTotal > 0) {
    stats.push({
      key: 'owed',
      label: 'Owed to you',
      value: inr(exposure.owedTotal),
      note: `${exposure.owedCount} pending${exposure.overdueCount > 0 ? ` · ${exposure.overdueCount} overdue` : ''}`,
      tone: exposure.overdueCount > 0 ? 'watch' : undefined,
    })
  }
  const visible = stats.slice(0, MAX_STATS)
  // Leading figures get a wider track on wide cards; narrow cards fall back to auto-fit.
  const columns = visible.map((s) => (s.primary ? 'minmax(0, 1.3fr)' : 'minmax(0, 1fr)')).join(' ')

  const projectedOver = burndown != null && burndown.projectedTotal > (budget ?? 0)

  return (
    <section
      className={cn('finance-card fin-hero', `is-${tone}`)}
      style={{ '--i': stagger } as CSSProperties}
      aria-label={`${month} at a glance`}
    >
      <header className="fin-hero-top">
        <label className="fin-hero-month">
          <select value={monthKey} onChange={(e) => onMonthChange(e.target.value)} aria-label="Month">
            {months.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <span aria-hidden="true">
            {monthLabel(monthKey)}
            <ChevronDown size={12} strokeWidth={2.8} />
          </span>
        </label>
        {isCurrent && burndown && (
          <span className="fin-hero-days">
            {burndown.daysLeft} day{burndown.daysLeft === 1 ? '' : 's'} left
          </span>
        )}
        <button type="button" className="fin-hero-budget" onClick={onEditBudget}>
          {hasBudget ? (
            <>
              Budget {inr(budget ?? 0)}
              {scope === 'FLEX' && <em>everyday</em>}
            </>
          ) : (
            'Set a budget'
          )}
          <Pencil size={11} strokeWidth={2.4} />
        </button>
      </header>

      <div className="fin-hero-stats" style={{ '--hero-cols': columns } as CSSProperties}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cn('fin-hero-stat', i < 2 && 'is-primary')}>
                <span className="skeleton-rect skeleton-shimmer" style={{ width: 60, height: 9 }} />
                <span className="skeleton-rect skeleton-shimmer" style={{ width: i < 2 ? 120 : 84, height: i < 2 ? 24 : 18 }} />
                <span className="skeleton-rect skeleton-shimmer" style={{ width: 90, height: 9 }} />
              </div>
            ))
          : visible.map((stat) => {
              const content = (
                <>
                  <span className="fin-hero-stat-label">{stat.label}</span>
                  <b className={cn(stat.valueTone && `is-${stat.valueTone}`)}>{stat.value}</b>
                  {stat.meter}
                  {stat.note && <small className={cn(stat.tone && `is-${stat.tone}`)}>{stat.note}</small>}
                </>
              )
              const className = cn('fin-hero-stat', stat.primary && 'is-primary', stat.onClick && 'is-action')
              return stat.onClick ? (
                <button key={stat.key} type="button" className={className} onClick={stat.onClick} title={stat.action}>
                  {content}
                </button>
              ) : (
                <div key={stat.key} className={className}>
                  {content}
                </div>
              )
            })}
      </div>

      {!loading && burndown && summary.count > 0 && (
        <div className="fin-hero-pace">
          <div className="fin-hero-pace-head">
            <span className="fin-hero-eyebrow">Spending pace</span>
            <span className="fin-hero-pace-note">
              {inr(spent)} spent
              {paceAmount != null && !over && ` · even pace by today ${inr(paceAmount)}`}
              {burndown.committed > 0 && !over && ` · ${inr(burndown.committed)} of bills set aside`}
            </span>
            <span className="fin-hero-legend" aria-hidden="true">
              <span><i className="is-actual" /> spent</span>
              <span><i className="is-ideal" /> even pace</span>
              {isCurrent && (
                <span><i className={cn('is-forecast', projectedOver && 'is-over')} /> forecast</span>
              )}
            </span>
          </div>
          <div className="fin-hero-plot">
            <BurndownChart burndown={burndown} monthKey={monthKey} over={projectedOver} />
          </div>
        </div>
      )}
      {!loading && summary.count === 0 && (
        <p className="fin-hero-empty">Nothing logged in {month} yet — your pace and forecast start with the first expense.</p>
      )}
    </section>
  )
}

export { MonthHero }
