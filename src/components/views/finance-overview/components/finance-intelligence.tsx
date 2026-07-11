// Finance Intelligence — renders the shared engine's finance insights:
// safe-to-spend hero with the budget burn-down chart (actual vs ideal pace
// + dotted forecast), month-end projection, category MoM trends, subscription
// radar, lending exposure, and the Patterns-style insight rows.
// All math lives in lib/insights; this file only fetches and renders.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Wallet } from 'lucide-react'
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  fetchLendingRecords,
  fetchSliceRepayments,
  fetchSubscriptions,
} from '../../../../lib/api'
import type { DailyFinancialLog, SubscriptionDTO } from '../../../../lib/api'
import { inr, isoDate, monthLabel } from '../../../../lib/insights/engine'
import {
  buildBurndown,
  categoryTrends,
  financeInsights,
  lendingExposure,
  subscriptionRadar,
} from '../../../../lib/insights/finance'
import type {
  FinanceEngineInput,
  LendingLike,
  RepaymentLike,
} from '../../../../lib/insights/finance'
import { useCountUp } from '../../../../hooks/use-count-up'
import { InsightList } from '../../../ui/insight-list'
import './finance-intelligence.css'

type FinanceIntelligenceProps = {
  logs: DailyFinancialLog[]
  monthlyBudget: number | null
  selectedMonthKey: string
  onMonthChange: (monthKey: string) => void
  loading: boolean
  /** Bumped by the parent whenever transactions/lending change. */
  refreshKey?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BurndownTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const row = payload.filter((p: { value: number | null }) => p.value != null)
  if (row.length === 0) return null
  return (
    <div className="fin-intel-tooltip">
      <b>Day {label}</b>
      {row.map((p: { dataKey: string; value: number }) => (
        <span key={p.dataKey}>
          {p.dataKey === 'actual' ? 'spent' : p.dataKey === 'ideal' ? 'even pace' : 'forecast'}:{' '}
          {inr(p.value)}
        </span>
      ))}
    </div>
  )
}

function FinanceIntelligence({
  logs,
  monthlyBudget,
  selectedMonthKey,
  onMonthChange,
  loading,
  refreshKey = 0,
}: FinanceIntelligenceProps) {
  const today = isoDate()
  const [subscriptions, setSubscriptions] = useState<SubscriptionDTO[] | null>(null)
  const [lending, setLending] = useState<LendingLike[] | null>(null)
  const [repayments, setRepayments] = useState<RepaymentLike[] | null>(null)
  const [sideLoading, setSideLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  const loadSide = useCallback(async () => {
    setSideLoading(true)
    // Each side source settles independently — a failing one just gates
    // its own insights instead of blanking the section.
    const [subsRes, lendRes, repayRes] = await Promise.allSettled([
      fetchSubscriptions(),
      fetchLendingRecords(),
      fetchSliceRepayments(),
    ])
    setSubscriptions(
      subsRes.status === 'fulfilled' ? ((subsRes.value as { data?: SubscriptionDTO[] })?.data ?? []) : null,
    )
    setLending(lendRes.status === 'fulfilled' ? (lendRes.value.data ?? []) : null)
    setRepayments(
      repayRes.status === 'fulfilled' ? ((repayRes.value as { data?: RepaymentLike[] })?.data ?? []) : null,
    )
    setSideLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSide()
  }, [loadSide, refreshKey])

  const input = useMemo<FinanceEngineInput>(
    () => ({
      today,
      monthKey: selectedMonthKey,
      logs,
      monthlyBudget,
      subscriptions,
      lending,
      repayments,
    }),
    [today, selectedMonthKey, logs, monthlyBudget, subscriptions, lending, repayments],
  )

  // Memoized on the data window — recomputes only when data changes or on ↻.
  const derived = useMemo(
    () => ({
      insights: financeInsights(input),
      burndown: buildBurndown(input),
      trends: categoryTrends(input, 4),
      subs: subscriptionRadar(input),
      exposure: lendingExposure(input),
    }),
    [input],
  )

  const { burndown, trends, subs, exposure, insights } = derived
  const safeToSpend = insights.find((i) => i.id === 'fin-safe-to-spend')
  const forecast = insights.find((i) => i.id === 'fin-forecast')
  const listInsights = insights.filter(
    (i) => i.id !== 'fin-safe-to-spend' && i.id !== 'fin-forecast',
  )
  const heroValue = useCountUp(burndown ? Math.round(burndown.safePerDay) : 0)

  const monthName = monthLabel(selectedMonthKey)

  // Same month list the Spending Overview select offers, so the two stay in step.
  const availableMonths = useMemo(() => {
    const months = new Map<string, string>()
    const label = (key: string) =>
      new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    months.set(today.slice(0, 7), label(today.slice(0, 7)))
    months.set(selectedMonthKey, label(selectedMonthKey))
    logs.forEach((log) => {
      const key = log.date.slice(0, 7)
      if (!months.has(key)) months.set(key, label(key))
    })
    return [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [logs, selectedMonthKey, today])

  const monthTxCount = useMemo(
    () =>
      logs.reduce((count, log) => {
        if (log.date.slice(0, 7) !== selectedMonthKey) return count
        return (
          count +
          Object.values(log.transactions ?? {}).reduce((c, txs) => c + (txs?.length ?? 0), 0)
        )
      }, 0),
    [logs, selectedMonthKey],
  )

  if (loading || sideLoading) {
    return (
      <section className="finance-card fin-intel" aria-label="Finance intelligence loading">
        <SectionHead months={availableMonths} selectedMonthKey={selectedMonthKey} onMonthChange={onMonthChange} onRefresh={loadSide} />
        <div className="fin-intel-grid">
          <div className="fin-intel-hero">
            <span className="skeleton-rect skeleton-shimmer" style={{ width: 150, height: 36, borderRadius: 8 }} />
            <span className="skeleton-rect skeleton-shimmer" style={{ width: '75%', height: 13, marginTop: 10 }} />
            <span className="skeleton-rect skeleton-shimmer" style={{ height: 150, marginTop: 16, borderRadius: 14 }} />
          </div>
          <div className="fin-intel-side">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className="skeleton-rect skeleton-shimmer" style={{ height: 64, borderRadius: 14 }} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Low-data state: no budget or nothing logged this month yet.
  if (!burndown && monthTxCount === 0) {
    return (
      <section className="finance-card fin-intel" aria-label="Finance intelligence">
        <SectionHead months={availableMonths} selectedMonthKey={selectedMonthKey} onMonthChange={onMonthChange} onRefresh={loadSide} />
        <div className="fin-intel-empty">
          <p>
            No transactions logged in {monthName} yet — log a few and I'll start tracking your
            pace, forecasts, and category trends here.
          </p>
        </div>
      </section>
    )
  }

  const projectedDelta = burndown ? burndown.budget - burndown.projectedTotal : 0
  const projectedTone = !burndown
    ? 'neutral'
    : Math.abs(projectedDelta) <= burndown.budget * 0.03
      ? 'neutral'
      : projectedDelta > 0
        ? 'good'
        : 'over'

  return (
    <section className="finance-card fin-intel" aria-label="Finance intelligence">
      <Wallet className="fin-intel-glyph" aria-hidden="true" />
      <SectionHead months={availableMonths} selectedMonthKey={selectedMonthKey} onMonthChange={onMonthChange} onRefresh={loadSide} />

      <div className="fin-intel-grid">
        {/* ── Flagship: safe to spend + burn-down ── */}
        {burndown && (
          <div className="fin-intel-hero">
            {burndown.isCurrentMonth ? (
              <>
                <p className="fin-intel-eyebrow">Safe to spend today</p>
                <div className="fin-intel-big">
                  <strong>{inr(heroValue)}</strong>
                  <span className="fin-intel-big-unit">/ day · {burndown.daysLeft} days left</span>
                </div>
                <p className="fin-intel-subline">
                  {inr(burndown.spent)} of {inr(burndown.budget)} spent · you're averaging{' '}
                  <b className={burndown.avgPerDay > burndown.safePerDay ? 'is-watch' : 'is-good'}>
                    {inr(burndown.avgPerDay)}/day
                  </b>
                </p>
              </>
            ) : (
              <>
                <p className="fin-intel-eyebrow">{monthName} recap</p>
                <div className="fin-intel-big">
                  <strong>{inr(burndown.spent)}</strong>
                  <span className="fin-intel-big-unit">
                    of {inr(burndown.budget)} budget ·{' '}
                    {burndown.spent <= burndown.budget ? 'stayed under' : 'went over'}
                  </span>
                </div>
              </>
            )}

            <div className="fin-intel-chart">
              {isMounted && (
                <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
                  <ComposedChart data={burndown.points} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="finActualFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2f3a33" stopOpacity={0.16} />
                        <stop offset="95%" stopColor="#2f3a33" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      ticks={[1, 5, 10, 15, 20, 25, burndown.points.length]}
                      tick={{ fill: 'rgba(23, 28, 25, 0.45)', fontSize: 9, fontWeight: 650 }}
                    />
                    <YAxis hide domain={[0, (dataMax: number) => Math.max(dataMax, burndown.budget) * 1.05]} />
                    <Tooltip content={<BurndownTooltip />} />
                    <ReferenceLine
                      y={burndown.budget}
                      stroke="rgba(23, 28, 25, 0.28)"
                      strokeDasharray="3 5"
                      label={{
                        position: 'insideTopLeft',
                        value: `BUDGET ${inr(burndown.budget)}`,
                        fill: 'rgba(23, 28, 25, 0.5)',
                        fontSize: 8.5,
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                      }}
                    />
                    <Line
                      type="linear"
                      dataKey="ideal"
                      stroke="rgba(23, 28, 25, 0.22)"
                      strokeWidth={1.4}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                    {burndown.isCurrentMonth && (
                      <Line
                        type="linear"
                        dataKey="forecast"
                        stroke={projectedTone === 'over' ? '#d83542' : '#4b7a63'}
                        strokeWidth={1.8}
                        strokeDasharray="4 5"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="#232b26"
                      strokeWidth={2.4}
                      fill="url(#finActualFill)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#232b26', stroke: '#fff', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="fin-intel-chart-legend">
              <span><i className="actual" /> actual</span>
              <span><i className="ideal" /> even pace</span>
              {burndown.isCurrentMonth && (
                <span><i className={`forecast ${projectedTone === 'over' ? 'over' : ''}`} /> forecast</span>
              )}
            </div>
            {safeToSpend?.sentiment === 'urgent' && (
              <p className="fin-intel-alert">{safeToSpend.title}</p>
            )}
          </div>
        )}

        {/* ── Side column: projection, subscriptions, lending ── */}
        <div className="fin-intel-side">
          {burndown && burndown.isCurrentMonth && forecast && (
            <article className={`fin-intel-tile tone-${projectedTone}`}>
              <p className="fin-intel-eyebrow">Month-end forecast</p>
              <div className="fin-intel-tile-main">
                <b>{inr(burndown.projectedTotal)}</b>
                <span className="fin-intel-delta">
                  {projectedTone === 'neutral'
                    ? 'right on budget'
                    : projectedTone === 'good'
                      ? `${inr(projectedDelta)} under budget`
                      : `${inr(-projectedDelta)} over budget`}
                </span>
              </div>
              <small>{forecast.sampleWindow}</small>
            </article>
          )}

          {subs && (
            <article className="fin-intel-tile">
              <p className="fin-intel-eyebrow">Subscription radar</p>
              <div className="fin-intel-tile-main">
                <b>{inr(subs.monthlyTotal)}</b>
                <span>/mo · {subs.count} active</span>
              </div>
              {subs.dueThisWeek.length > 0 ? (
                <ul className="fin-intel-renewals">
                  {subs.dueThisWeek.map((s) => (
                    <li key={s.name}>
                      <span>{s.name}</span>
                      <b>{inr(s.cost)}</b>
                    </li>
                  ))}
                  <li className="total">
                    <span>renews this week</span>
                    <b>{inr(subs.dueThisWeekTotal)}</b>
                  </li>
                </ul>
              ) : (
                <small>nothing renews in the next 7 days</small>
              )}
            </article>
          )}

          {exposure && (
            <article className="fin-intel-tile">
              <p className="fin-intel-eyebrow">Lending exposure</p>
              <div className="fin-intel-lending">
                <div>
                  <small>owed to you</small>
                  <b>{inr(exposure.owedTotal)}</b>
                  <small>
                    {exposure.owedCount} pending
                    {exposure.overdueCount > 0 ? ` · ${exposure.overdueCount} overdue` : ''}
                  </small>
                </div>
                <div>
                  <small>you owe</small>
                  <b>{inr(exposure.owingTotal)}</b>
                  <small>repayments pending</small>
                </div>
              </div>
            </article>
          )}
        </div>

        {/* ── Category trends (MoM) ── */}
        {trends.length > 0 && (
          <div className="fin-intel-trends">
            <p className="fin-intel-eyebrow">Category trends · {monthName} vs last month</p>
            <div className="fin-intel-trend-bars">
              {trends.map((t) => (
                <div key={t.category} className="fin-intel-trend-row">
                  <span className="fin-intel-trend-name">{t.category}</span>
                  <div className="fin-intel-trend-track">
                    <i style={{ width: `${Math.max(t.share, 3)}%` }} />
                  </div>
                  <b className="fin-intel-trend-amount">{inr(t.total)}</b>
                  <span
                    className={`fin-intel-trend-delta ${
                      t.changePct == null ? 'na' : t.changePct > 0 ? 'up' : 'down'
                    }`}
                  >
                    {t.changePct == null
                      ? 'new'
                      : `${t.changePct > 0 ? '▲' : '▼'} ${Math.abs(t.changePct)}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Everything else the engine found ── */}
        {listInsights.length > 0 && (
          <div className="fin-intel-list">
            <p className="fin-intel-eyebrow">Patterns</p>
            <InsightList insights={listInsights} className="ins-list--columns" onAction={() => undefined} />
          </div>
        )}
      </div>
    </section>
  )
}

function SectionHead({
  months,
  selectedMonthKey,
  onMonthChange,
  onRefresh,
}: {
  months: [string, string][]
  selectedMonthKey: string
  onMonthChange: (monthKey: string) => void
  onRefresh: () => void | Promise<void>
}) {
  return (
    <div className="finance-section-head fin-intel-head">
      <div>
        <p className="fin-intel-eyebrow">Intelligence</p>
        <h2>Where your money is heading</h2>
      </div>
      <div className="fin-intel-head-right">
        <select
          className="fin-intel-month-select"
          value={selectedMonthKey}
          onChange={(e) => onMonthChange(e.target.value)}
          aria-label="Insights month"
        >
          {months.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="fin-intel-refresh"
          onClick={() => void onRefresh()}
          aria-label="Refresh insights"
        >
          <RefreshCw size={13} />
        </button>
      </div>
    </div>
  )
}

export { FinanceIntelligence }
