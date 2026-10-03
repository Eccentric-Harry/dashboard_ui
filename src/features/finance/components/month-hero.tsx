// The month's spending — the first card on /finance, beside the Wallet card.
//
// Nutrition's grammar, which the user loves: an eyebrow, one serif line that states the
// finding ("₹9,709 over budget"), then one hero figure and its visual. Here the figure is
// what's been spent (the ₹ set small beside it), a capsule meter against the budget with
// an even-pace tick, and the month drawn day by day as bars stacked by category (Apple
// Card's activity view) in the same colours as the breakdown and the ledger's day prints.
// The verdict colours only the amount in the headline and the meter's overflow.
//
// History: tinted KPI tiles → one big headline (stats pushed below the fold) → a stats
// strip over a thin cumulative line → a six-stat hairline strip ("like a spreadsheet",
// and ₹39,709 said three times) → this, with balance and cash flow moved to the Wallet
// card so both sit on the first screen. See PROJECT_CONTEXT §4.6.

import type { CSSProperties, ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, ChevronDown, Pencil } from 'lucide-react'
import type { BudgetScope } from '@/types/finance'
import type { MoneySummary } from '@/lib/finance-ledger'
import { daysInMonth, inr, monthLabel } from '@/lib/insights/engine'
import type { Burndown, DaySpend, SpendingComparison } from '@/lib/insights/finance'
import { cn } from '@/lib/utils'
import { useCountUp } from '@/hooks/use-count-up'
import { DailyBars } from './daily-bars'
import { Money } from './money'

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
  loading: boolean
  onEditBudget: () => void
  stagger?: number
}

type Tone = 'good' | 'watch' | 'over' | 'neutral'

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
  loading,
  onEditBudget,
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
  // Under an everyday (FLEX) budget the figure beside the meter must be what the meter
  // measures — rent and bills are named separately in the line below it.
  const flexFigure = hasBudget && scope === 'FLEX'
  // A purchase paid for from a savings goal is named in the meta line, never in the figure:
  // the phone you saved for for six months is not this month's spending story.
  const figure = flexFigure ? spent : summary.spending - summary.fromSavings
  const spentShown = useCountUp(Math.round(figure))
  const pct = hasBudget ? Math.round((spent / (budget ?? 1)) * 100) : 0
  const allowance = hasBudget ? (budget ?? 0) / daysInMonth(monthKey) : null
  const daysCounted = isCurrent && burndown ? burndown.daysElapsed : daysInMonth(monthKey)
  const perDay = figure / Math.max(daysCounted, 1)
  const logged = summary.count > 0

  // ── The one sentence: what the month amounts to ─────────────────────────
  const amount = (n: number) => <span className={cn('fin-hero-amount', `is-${tone}`)}>{inr(Math.abs(n))}</span>
  let headline: ReactNode
  if (!hasBudget) headline = summary.spendingCount > 0 ? <>{amount(perDay)} a day on average</> : 'Nothing spent yet'
  else if (!logged) headline = <>{amount(budget ?? 0)} to spend this month</>
  else if (isCurrent) headline = over ? <>{amount(left)} over budget</> : <>{amount(left)} left to spend</>
  else headline = over ? <>Finished {amount(left)} over budget</> : <>Finished {amount(left)} under budget</>

  // ── Budget meter ─────────────────────────────────────────────────────────
  const scale = Math.max(budget ?? 0, spent, 1)
  const withinPct = (Math.min(spent, budget ?? 0) / scale) * 100
  const overPct = over ? ((spent - (budget ?? 0)) / scale) * 100 : 0
  const limitPct = ((budget ?? 0) / scale) * 100
  const paceAmount = isCurrent && burndown ? ((budget ?? 0) * burndown.daysElapsed) / daysInMonth(monthKey) : null
  const pacePct = paceAmount != null ? (paceAmount / scale) * 100 : null

  // Month-end only earns a mention when it adds a number: on the last day it equals
  // what's already spent.
  const forecast =
    isCurrent && burndown && burndown.projectedTotal - spent >= Math.max((budget ?? 0) * 0.01, 1)
      ? burndown.projectedTotal
      : null
  const meta: { text: string; tone?: Tone }[] = []
  if (hasBudget && logged) {
    meta.push({ text: `${pct}% of ${inr(budget ?? 0)}`, tone: over ? 'over' : watch ? 'watch' : undefined })
    if (isCurrent && !over && burndown) meta.push({ text: `${inr(burndown.safePerDay)}/day left` })
    else meta.push({ text: `${inr(perDay)}/day` })
    if (forecast != null) meta.push({ text: `≈ ${inr(forecast)} by month-end` })
    if (flexFigure && summary.fixed > 0) meta.push({ text: `+ ${inr(summary.fixed)} rent & bills` })
    if (summary.fromSavings > 0) meta.push({ text: `+ ${inr(summary.fromSavings)} from savings` })
  } else if (summary.spendingCount > 0) {
    meta.push({ text: `${summary.spendingCount} expense${summary.spendingCount === 1 ? '' : 's'}` })
    if (summary.fromSavings > 0) meta.push({ text: `+ ${inr(summary.fromSavings)} from savings` })
  }

  // ── Month-to-date comparison ────────────────────────────────────────────
  const change = comparison?.changePct ?? null
  const lessThanLast = change != null && change < 0

  return (
    <section
      className={cn('finance-card fin-hero', `is-${tone}`)}
      style={{ '--i': stagger } as CSSProperties}
      aria-label={`${month} spending`}
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

      {loading ? (
        <div className="fin-hero-body">
          <span className="skeleton-rect skeleton-shimmer" style={{ width: 220, height: 24, marginTop: 10 }} />
          <span className="skeleton-rect skeleton-shimmer" style={{ width: 150, height: 38, marginTop: 22 }} />
          <span className="skeleton-rect skeleton-shimmer" style={{ width: '100%', height: 10, marginTop: 14, borderRadius: 999 }} />
          <span className="skeleton-rect skeleton-shimmer" style={{ width: '100%', height: 96, marginTop: 'auto', borderRadius: 14 }} />
        </div>
      ) : (
        <div className="fin-hero-body">
          <h2 className="fin-hero-title">{headline}</h2>

          <div className="fin-hero-figure">
            <div>
              <span className="fin-hero-label">
                {flexFigure ? 'Everyday spending' : isCurrent ? 'Spent so far' : `Spent in ${month}`}
              </span>
              <strong>
                <Money value={spentShown} />
              </strong>
            </div>
            {change != null && change !== 0 && (
              <span className={cn('fin-hero-delta', lessThanLast ? 'is-less' : 'is-more')}>
                {lessThanLast ? <ArrowDownRight size={12} strokeWidth={2.6} /> : <ArrowUpRight size={12} strokeWidth={2.6} />}
                {Math.abs(change)}% {lessThanLast ? 'less' : 'more'} than {monthShort(comparison!.previousMonthKey)}
                {comparison!.throughDay != null && ' by today'}
              </span>
            )}
          </div>

          {hasBudget && logged && (
            <span className="fin-meter" role="img" aria-label={`${pct}% of the ${inr(budget ?? 0)} budget used`}>
              <span className="fin-meter-track">
                <i className="fin-meter-fill" style={{ width: `${withinPct}%` }} />
                {over && <i className="fin-meter-over" style={{ left: `${limitPct}%`, width: `${overPct}%` }} />}
                {over && <span className="fin-meter-limit" style={{ left: `${limitPct}%` }} />}
                {pacePct != null && !over && <span className="fin-meter-pace" style={{ left: `${pacePct}%` }} />}
              </span>
            </span>
          )}
          {meta.length > 0 && (
            <p className="fin-hero-meta">
              {meta.map((m) => (
                <span key={m.text} className={cn(m.tone && `is-${m.tone}`)}>{m.text}</span>
              ))}
            </p>
          )}
          {!logged && <p className="fin-hero-meta"><span>Nothing logged yet — your days fill in as you spend.</span></p>}

          <div className="fin-hero-chart">
            <DailyBars days={days} allowance={allowance} flex={scope === 'FLEX'} />
          </div>
        </div>
      )}
    </section>
  )
}

export { MonthHero }
