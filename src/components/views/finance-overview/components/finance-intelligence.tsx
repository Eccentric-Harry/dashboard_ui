// Finance Intelligence — renders the shared engine's finance insights:
// safe-to-spend hero with the budget burn-down chart (actual vs ideal pace
// + dotted forecast), month-end projection, category MoM trends, subscription
// radar, lending exposure, and the Patterns-style insight rows.
// All math lives in lib/insights; this file only fetches and renders.

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { RefreshCw, Wallet } from 'lucide-react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getConsistentColor } from '../utils'
import { financeService } from '../../../../services/finance-service'
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
  /** Entrance-stagger index; drives the `--i` animation delay. */
  stagger?: number
}

/** ₹20,000 → "₹20k". Axis ticks have ~40px; the full en-IN grouping does not fit. */
const compactInr = (n: number): string => {
  const abs = Math.abs(n)
  if (abs >= 10000000) return `₹${(n / 10000000).toFixed(abs >= 100000000 ? 0 : 1)}Cr`
  if (abs >= 100000) return `₹${(n / 100000).toFixed(abs >= 1000000 ? 0 : 1)}L`
  if (abs >= 1000) return `₹${Math.round(n / 1000)}k`
  return `₹${Math.round(n)}`
}

const SERIES_LABEL: Record<string, string> = {
  actual: 'spent so far',
  ideal: 'even pace',
  forecast: 'projected',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BurndownTooltip = ({ active, payload, label, monthKey }: any) => {
  if (!active || !payload?.length) return null
  const row = payload.filter((p: { value: number | null }) => p.value != null)
  if (row.length === 0) return null

  // "Day 14" is an index; "14 Sep" is a date. The axis already carries the
  // number, so the tooltip is the one place worth spending the extra glyphs.
  const dayDate = monthKey
    ? new Date(`${monthKey}-${String(label).padStart(2, '0')}T00:00:00`).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
      })
    : `Day ${label}`

  return (
    <div className="fin-intel-tooltip">
      <b>{dayDate}</b>
      {row.map((p: { dataKey: string; value: number }) => (
        <span key={p.dataKey} className={`is-${p.dataKey}`}>
          <i />
          {SERIES_LABEL[p.dataKey] ?? p.dataKey}
          <em>{inr(p.value)}</em>
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
  stagger = 0,
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
      financeService.getSubscriptions(),
      financeService.getLending(),
      financeService.getSliceRepayments(),
    ])
    setSubscriptions(
      subsRes.status === 'fulfilled' && !subsRes.value.error ? (subsRes.value.data ?? []) : null,
    )
    setLending(lendRes.status === 'fulfilled' && !lendRes.value.error ? (lendRes.value.data ?? []) : null)
    setRepayments(
      repayRes.status === 'fulfilled' && !repayRes.value.error
        ? ((repayRes.value.data as RepaymentLike[] | undefined) ?? [])
        : null,
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
      trends: categoryTrends(input, 6),
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

  // Y scale is pinned to the two numbers that matter — 0 and the budget — plus
  // headroom for whatever the series actually reaches. Recharts' automatic ticks
  // land on arbitrary round numbers that never coincide with the budget line,
  // which is the one gridline a burn-down chart has to make readable.
  const { yTicks, yMax } = useMemo(() => {
    if (!burndown) return { yTicks: [] as number[], yMax: 0 }
    const peak = burndown.points.reduce(
      (max, pt) => Math.max(max, pt.actual ?? 0, pt.forecast ?? 0, pt.ideal ?? 0),
      0,
    )
    const top = Math.max(peak, burndown.budget) * 1.08
    const ticks = [0, burndown.budget]
    // Only add a top tick when it clears the budget label by enough to not
    // collide with it.
    if (top > burndown.budget * 1.35) ticks.push(Math.round(peak))
    return { yTicks: ticks, yMax: top }
  }, [burndown])

  if (loading || sideLoading) {
    return (
      <section className="finance-card fin-intel" aria-label="Finance intelligence loading" style={{ '--i': stagger } as CSSProperties}>
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
      <section className="finance-card fin-intel" aria-label="Finance intelligence" style={{ '--i': stagger } as CSSProperties}>
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
    <section className="finance-card fin-intel" aria-label="Finance intelligence" style={{ '--i': stagger } as CSSProperties}>
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

            <div className="fin-intel-chart-head">
              <span className="fin-intel-chart-title">Cumulative spend vs budget</span>
              <div className="fin-intel-chart-legend">
                <span><i className="actual" /> actual</span>
                <span><i className="ideal" /> even pace</span>
                {burndown.isCurrentMonth && (
                  <span><i className={`forecast ${projectedTone === 'over' ? 'over' : ''}`} /> forecast</span>
                )}
              </div>
            </div>

            <div className="fin-intel-chart">
              {isMounted && (
                <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
                  <ComposedChart
                    data={burndown.points}
                    margin={{ top: 18, right: 48, left: 0, bottom: 0 }}
                  >
                    <defs>
                      {/* Sage rather than neutral grey: a grey wash over the warm
                          hero panel greys the whole chart down, where the green
                          reads as part of the route's palette and gives the
                          curve some body instead of a bare line. */}
                      <linearGradient id="finActualFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5d8a70" stopOpacity={0.26} />
                        <stop offset="60%" stopColor="#5d8a70" stopOpacity={0.09} />
                        <stop offset="100%" stopColor="#5d8a70" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    {/* Horizontal rules only, pinned to the same ticks the Y axis
                        labels. Without them the curve floated in an unscaled void:
                        you could see it rising but not read *how much* off it. */}
                    <CartesianGrid
                      vertical={false}
                      stroke="rgba(23, 28, 25, 0.07)"
                      strokeDasharray="0"
                    />

                    {/* The part of the month that hasn't happened yet, washed back
                        so "measured" and "projected" are distinguishable at a glance
                        rather than only by the dash pattern of a thin line. */}
                    {burndown.isCurrentMonth && burndown.daysElapsed < burndown.points.length && (
                      <ReferenceArea
                        x1={burndown.daysElapsed}
                        x2={burndown.points.length}
                        fill="rgba(23, 28, 25, 0.035)"
                        stroke="none"
                      />
                    )}

                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      ticks={[1, 5, 10, 15, 20, 25, burndown.points.length]}
                      tick={{ fill: 'rgba(23, 28, 25, 0.42)', fontSize: 9.5, fontWeight: 650 }}
                    />
                    <YAxis
                      width={46}
                      axisLine={false}
                      tickLine={false}
                      ticks={yTicks}
                      domain={[0, yMax]}
                      tickFormatter={compactInr}
                      tick={{ fill: 'rgba(23, 28, 25, 0.42)', fontSize: 9.5, fontWeight: 650 }}
                    />
                    <Tooltip
                      content={<BurndownTooltip monthKey={selectedMonthKey} />}
                      cursor={{ stroke: 'rgba(23, 28, 25, 0.22)', strokeWidth: 1 }}
                    />

                    {/* Budget line, labelled on the right where it terminates. The
                        label used to be crammed into the top-left *inside* the
                        plot, where it collided with the curve on any month that
                        started fast. */}
                    <ReferenceLine
                      y={burndown.budget}
                      stroke="rgba(23, 28, 25, 0.34)"
                      strokeDasharray="4 4"
                      label={{
                        position: 'right',
                        value: 'budget',
                        fill: 'rgba(23, 28, 25, 0.5)',
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                      }}
                    />

                    {/* "Today" is the single most useful annotation on this chart:
                        it is what explains where the solid line stops and the
                        dashes begin. */}
                    {burndown.isCurrentMonth && (
                      <ReferenceLine
                        x={burndown.daysElapsed}
                        stroke="rgba(23, 28, 25, 0.28)"
                        strokeWidth={1}
                        label={{
                          position: 'top',
                          value: 'today',
                          fill: 'rgba(23, 28, 25, 0.5)',
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                        }}
                      />
                    )}

                    <Line
                      type="linear"
                      dataKey="ideal"
                      stroke="rgba(23, 28, 25, 0.24)"
                      strokeWidth={1.4}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                    {burndown.isCurrentMonth && (
                      <Line
                        type="linear"
                        dataKey="forecast"
                        stroke={projectedTone === 'over' ? '#c0323d' : '#4b7a63'}
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
                      strokeWidth={2.2}
                      fill="url(#finActualFill)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#232b26', stroke: '#fff', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                    {/* Where you actually stand right now. */}
                    <ReferenceDot
                      x={burndown.daysElapsed}
                      y={burndown.spent}
                      r={3.5}
                      fill="#232b26"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
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
            <article className={`fin-intel-tile fin-intel-tile--forecast tone-${projectedTone}`}>
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
            <article className="fin-intel-tile fin-intel-tile--subs">
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
            <article className="fin-intel-tile fin-intel-tile--lending">
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
            <div className="fin-intel-trends-head">
              <p className="fin-intel-eyebrow">Category trends</p>
              <span className="fin-intel-trends-key">
                bar = {monthName} · <i /> marker = last month
              </span>
            </div>
            <div className="fin-intel-trend-bars">
              {/* A bullet chart, not a share bar.
                  Previously the track drew `share` (a share-of-total) while the
                  label beside it showed the absolute rupee total, and the change
                  was relegated to a "▼63%" badge — three different quantities in
                  one row, none of them comparable to the next row. Now the bar is
                  this month's spend and the tick behind it is last month's, both
                  on one scale set by the largest of either. The comparison the
                  section is named for becomes something you can see. */}
              {trends.map((t) => {
                const scale = Math.max(
                  ...trends.map((x) => Math.max(x.total, x.previous ?? 0)),
                  1,
                )
                return (
                  <div
                    key={t.category}
                    className="fin-intel-trend-row"
                    /* Each category carries its own hue so the stack reads as a
                       palette rather than one repeated green bar. The CSS mixes
                       this toward the sage ground, so even a vivid source colour
                       lands inside the route's desaturated range. */
                    style={{ '--cat': getConsistentColor(t.category) } as React.CSSProperties}
                  >
                    <span className="fin-intel-trend-name">{t.category}</span>
                    <div className="fin-intel-trend-track">
                      <i style={{ width: `${Math.max((t.total / scale) * 100, 1.5)}%` }} />
                      {t.previous != null && t.previous > 0 && (
                        <u
                          style={{ left: `${Math.min((t.previous / scale) * 100, 100)}%` }}
                          title={`last month: ${inr(t.previous)}`}
                        />
                      )}
                    </div>
                    <b className="fin-intel-trend-amount">{inr(t.total)}</b>
                    <span
                      className={`fin-intel-trend-delta ${
                        t.changePct == null ? 'na' : t.changePct > 0 ? 'up' : 'down'
                      }`}
                    >
                      {t.changePct == null
                        ? 'new'
                        : `${t.changePct > 0 ? '+' : '−'}${Math.abs(t.changePct)}%`}
                    </span>
                  </div>
                )
              })}
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
