// The month at a glance — the first card on /finance.
//
// Stats first: Balance and the budget verdict lead a hairline-split strip, each figure
// said once, each with a small tinted glyph so the row scans like Apple Health's summary.
// Below, the month's activity: what's been spent and how that compares with last month
// *at the same point* (Copilot's comparison — a mid-month total against a whole previous
// month would always flatter), beside daily bars stacked by category in the Breakdown
// card's colours (Apple Card's activity view).
//
// History: a row of tinted KPI tiles (eight coloured boxes, one number said seven times)
// → one big headline (stats pushed below the fold) → a stats strip over a thin cumulative
// line the user found plain. See PROJECT_CONTEXT §4.6.

import type { CSSProperties, ReactNode } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  HandCoins,
  HeartHandshake,
  Landmark,
  Pencil,
  Repeat,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { BudgetScope } from '@/types/finance'
import type { MoneySummary } from '@/lib/finance-ledger'
import { daysInMonth, inr, monthLabel } from '@/lib/insights/engine'
import type { Burndown, DaySpend, LendingExposure, SpendingComparison, TransferSummary } from '@/lib/insights/finance'
import { cn } from '@/lib/utils'
import { useCountUp } from '@/hooks/use-count-up'
import { DailyBars } from './daily-bars'

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
  days: DaySpend[]
  comparison: SpendingComparison | null
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
  icon: LucideIcon
  /** Glyph hue, in the route's desaturated palette; dark mode lifts it via --chip-hue. */
  hue: string
  value: ReactNode
  note?: ReactNode
  tone?: Tone
  /** Only the budget verdict ever colours its figure. */
  valueTone?: Tone
  /** Leads the strip at a larger size (Balance, the budget verdict). */
  primary?: boolean
  meter?: ReactNode
  onClick?: () => void
  action?: string
}

const MAX_STATS = 6

const HUE = {
  balance: '#4e8a72',
  budget: '#7a8a5a',
  forecast: '#5d87ad',
  bills: '#9a7a9e',
  home: '#8a7fb0',
  income: '#4e8a72',
  owed: '#7a74a8',
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })

const monthShort = (monthKey: string) =>
  new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' })

function MonthHero({
  monthKey,
  months,
  onMonthChange,
  burndown,
  days,
  comparison,
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
  const verdict = useCountUp(Math.round(Math.abs(left)))
  const spentAll = useCountUp(Math.round(summary.spending))
  const pct = hasBudget ? Math.round((spent / (budget ?? 1)) * 100) : 0
  const allowance = hasBudget ? (budget ?? 0) / daysInMonth(monthKey) : null
  const daysCounted = isCurrent && burndown ? burndown.daysElapsed : daysInMonth(monthKey)

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
    icon: Wallet,
    hue: HUE.balance,
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
      label: 'Budget',
      icon: Target,
      hue: HUE.budget,
      primary: true,
      value: 'Not set',
      note: 'Set one to see your pace',
      onClick: onEditBudget,
      action: 'Set a budget',
    })
  } else {
    stats.push({
      key: 'budget',
      label: isCurrent ? (over ? 'Over budget' : 'Left to spend') : over ? 'Finished over' : 'Finished under',
      icon: Target,
      hue: HUE.budget,
      primary: true,
      value: summary.count > 0 ? inr(verdict) : inr(budget ?? 0),
      valueTone: tone,
      meter,
      note:
        summary.count === 0
          ? 'nothing logged yet'
          : isCurrent && !over && burndown
            ? `${inr(burndown.safePerDay)}/day left`
            : `${pct}% of budget`,
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
      icon: TrendingUp,
      hue: HUE.forecast,
      value: `≈ ${inr(burndown.projectedTotal)}`,
      note: close ? 'right on budget' : delta > 0 ? `≈ ${inr(delta)} under` : `≈ ${inr(-delta)} over`,
      tone: close ? undefined : delta > 0 ? 'good' : 'over',
    })
  }
  if (bills.hasBills) {
    stats.push({
      key: 'bills',
      label: bills.dueTotal > 0 ? 'Bills due' : 'Bills',
      icon: Repeat,
      hue: HUE.bills,
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
      icon: HeartHandshake,
      hue: HUE.home,
      value: inr(transfers.familyOut),
      note: transfers.familyAvg != null ? `usual ${inr(transfers.familyAvg)}` : 'not spending',
      onClick: onJumpToTransfers,
      action: 'See transfers',
    })
  }
  if (summary.income > 0) {
    stats.push({
      key: 'income',
      label: 'Income',
      icon: Landmark,
      hue: HUE.income,
      value: inr(summary.income),
      note: `in ${month}`,
      tone: 'good',
    })
  }
  if (exposure && exposure.owedTotal > 0) {
    stats.push({
      key: 'owed',
      label: 'Owed to you',
      icon: HandCoins,
      hue: HUE.owed,
      value: inr(exposure.owedTotal),
      note: `${exposure.owedCount} pending${exposure.overdueCount > 0 ? ` · ${exposure.overdueCount} overdue` : ''}`,
      tone: exposure.overdueCount > 0 ? 'watch' : undefined,
    })
  }
  const visible = stats.slice(0, MAX_STATS)
  // Leading figures get a wider track on wide cards; narrow cards fall back to auto-fit.
  const columns = visible.map((s) => (s.primary ? 'minmax(0, 1.3fr)' : 'minmax(0, 1fr)')).join(' ')

  // ── Month-to-date comparison ────────────────────────────────────────────
  const change = comparison?.changePct ?? null
  const lessThanLast = change != null && change < 0

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
              const Icon = stat.icon
              const content = (
                <>
                  <span className="fin-hero-stat-label">
                    <span className="fin-hero-stat-glyph" style={{ '--chip-hue': stat.hue } as CSSProperties} aria-hidden="true">
                      <Icon size={11} strokeWidth={2.4} />
                    </span>
                    {stat.label}
                  </span>
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

      {!loading && (
        <div className="fin-hero-activity">
          <div className="fin-hero-spent">
            <span className="fin-hero-eyebrow">{isCurrent ? 'Spent so far' : `Spent in ${month}`}</span>
            <strong>{inr(spentAll)}</strong>
            {change != null && change !== 0 && (
              <span className={cn('fin-hero-delta', lessThanLast ? 'is-less' : 'is-more')}>
                {lessThanLast ? <ArrowDownRight size={12} strokeWidth={2.6} /> : <ArrowUpRight size={12} strokeWidth={2.6} />}
                {Math.abs(change)}% {lessThanLast ? 'less' : 'more'} than {monthShort(comparison!.previousMonthKey)}
                {comparison!.throughDay != null && ' by today'}
              </span>
            )}
            {summary.spendingCount > 0 ? (
              <small>
                {inr(summary.spending / Math.max(daysCounted, 1))}/day · {summary.spendingCount} expense
                {summary.spendingCount === 1 ? '' : 's'}
              </small>
            ) : (
              <small>Nothing logged yet — your days fill in as you spend.</small>
            )}
          </div>
          <DailyBars days={days} allowance={allowance} flex={scope === 'FLEX'} />
        </div>
      )}
    </section>
  )
}

export { MonthHero }
