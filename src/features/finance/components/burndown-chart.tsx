// Cumulative spend vs budget for one month: actual (solid, filled), even pace (thin),
// budget (dashed rule) and — for the current month — a dotted forecast to month end.
// Pure rendering; the series comes from lib/insights/finance `buildBurndown`.

import { useEffect, useMemo, useState } from 'react'
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
import { inr } from '@/lib/insights/engine'
import type { Burndown } from '@/lib/insights/finance'
import type { ChartTooltipProps } from '@/lib/chart-tooltip'

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

const BurndownTooltip = ({ active, payload, label, monthKey }: ChartTooltipProps & { monthKey?: string }) => {
  if (!active || !payload?.length) return null
  const row = payload.filter((p) => p.value != null)
  if (row.length === 0) return null
  const dayDate = monthKey
    ? new Date(`${monthKey}-${String(label).padStart(2, '0')}T00:00:00`).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
      })
    : `Day ${label}`
  return (
    <div className="fin-intel-tooltip">
      <b>{dayDate}</b>
      {row.map((p) => {
        const key = String(p.dataKey)
        return (
          <span key={key} className={`is-${key}`}>
            <i />
            {SERIES_LABEL[key] ?? key}
            <em>{inr(Number(p.value))}</em>
          </span>
        )
      })}
    </div>
  )
}

interface BurndownChartProps {
  burndown: Burndown
  monthKey: string
  /** Colours the forecast: rose when it lands over budget. */
  over: boolean
}

function BurndownChart({ burndown, monthKey, over }: BurndownChartProps) {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    // Recharts measures its parent; render after mount so the first measure is real.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  // Y ticks pinned to 0 and the budget — the one gridline a burn-down has to make
  // readable — plus the peak when it clears the budget label.
  const { yTicks, yMax } = useMemo(() => {
    const peak = burndown.points.reduce(
      (max, pt) => Math.max(max, pt.actual ?? 0, pt.forecast ?? 0, pt.ideal ?? 0),
      0,
    )
    const top = Math.max(peak, burndown.budget) * 1.08
    const ticks = [0, burndown.budget]
    if (top > burndown.budget * 1.35) ticks.push(Math.round(peak))
    return { yTicks: ticks, yMax: top }
  }, [burndown])

  if (!isMounted) return null

  return (
    <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
      <ComposedChart data={burndown.points} margin={{ top: 14, right: 44, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="finHeroFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--fin-chart-fill, #2c4835)" stopOpacity={0.16} />
            <stop offset="100%" stopColor="var(--fin-chart-fill, #2c4835)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--fin-chart-grid, rgba(23, 28, 25, 0.08))" />
        {burndown.isCurrentMonth && burndown.daysElapsed < burndown.points.length && (
          <ReferenceArea
            x1={burndown.daysElapsed}
            x2={burndown.points.length}
            fill="var(--fin-chart-future, rgba(23, 28, 25, 0.035))"
            stroke="none"
          />
        )}
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          ticks={[1, 8, 15, 22, burndown.points.length]}
          tick={{ fill: 'var(--fin-chart-tick, rgba(23, 28, 25, 0.5))', fontSize: 9.5, fontWeight: 650 }}
        />
        <YAxis
          width={40}
          axisLine={false}
          tickLine={false}
          ticks={yTicks}
          domain={[0, yMax]}
          tickFormatter={compactInr}
          tick={{ fill: 'var(--fin-chart-tick, rgba(23, 28, 25, 0.5))', fontSize: 9.5, fontWeight: 650 }}
        />
        <Tooltip
          content={<BurndownTooltip monthKey={monthKey} />}
          cursor={{ stroke: 'var(--fin-chart-cursor, rgba(23, 28, 25, 0.2))', strokeWidth: 1 }}
        />
        <ReferenceLine
          y={burndown.budget}
          stroke="var(--fin-chart-budget, rgba(23, 28, 25, 0.4))"
          strokeDasharray="4 4"
          label={{
            position: 'right',
            value: 'budget',
            fill: 'var(--fin-chart-label, rgba(23, 28, 25, 0.6))',
            fontSize: 9,
            fontWeight: 800,
          }}
        />
        {burndown.isCurrentMonth && (
          <ReferenceLine x={burndown.daysElapsed} stroke="var(--fin-chart-today, rgba(23, 28, 25, 0.25))" strokeWidth={1} />
        )}
        <Line
          type="linear"
          dataKey="ideal"
          stroke="var(--fin-chart-ideal, rgba(23, 28, 25, 0.22))"
          strokeWidth={1.2}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
        {burndown.isCurrentMonth && (
          <Line
            type="linear"
            dataKey="forecast"
            stroke={over ? 'var(--fin-chart-over, #c0483f)' : 'var(--fin-chart-good, #4b7a63)'}
            strokeWidth={1.8}
            strokeDasharray="3 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        )}
        <Area
          type="monotone"
          dataKey="actual"
          stroke="var(--fin-chart-line, #232b26)"
          strokeWidth={2}
          fill="url(#finHeroFill)"
          dot={false}
          activeDot={{ r: 4, fill: 'var(--fin-chart-line, #232b26)', stroke: 'var(--fin-chart-dot-ring, #fff)', strokeWidth: 2 }}
          isAnimationActive={false}
        />
        <ReferenceDot
          x={burndown.daysElapsed}
          y={burndown.spent}
          r={3.5}
          fill="var(--fin-chart-line, #232b26)"
          stroke="var(--fin-chart-dot-ring, #ffffff)"
          strokeWidth={2}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export { BurndownChart }
