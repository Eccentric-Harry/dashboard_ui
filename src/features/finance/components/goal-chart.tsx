// A goal over time: what's been set aside (solid, filled), the plan's straight line from
// start to date (dashed), and where your real pace takes it (dotted). Plain SVG on a
// fixed viewBox, so it stays crisp at every width without a chart library.

import { useMemo } from 'react'
import { inr } from '@/lib/insights/engine'
import type { LedgerEntry } from '@/lib/finance-ledger'
import { daysBetween, monthYear, type GoalPlan } from '@/lib/finance-goals'

interface GoalChartProps {
  plan: GoalPlan
  /** This goal's ledger rows (any order). */
  rows: LedgerEntry[]
  today: string
}

const W = 560
const H = 150
const PAD = { top: 12, right: 10, bottom: 20, left: 10 }

function GoalChart({ plan, rows, today }: GoalChartProps) {
  const chart = useMemo(() => {
    const { goal } = plan
    const sorted = [...rows].filter((r) => r.kind !== 'spending').sort((a, b) => a.day.localeCompare(b.day) || a.at - b.at)
    const loadedNet = sorted.reduce((s, r) => s + (r.kind === 'transfer-out' ? r.amount : -r.amount), 0)
    // Rows older than the loaded window still count: start the line at what they add up to.
    let running = Math.max(0, plan.saved - loadedNet)
    const start = [goal.startDate, sorted[0]?.day, today].filter(Boolean).sort()[0] as string
    const points: { day: string; value: number }[] = [{ day: start, value: running }]
    for (const r of sorted) {
      running += r.kind === 'transfer-out' ? r.amount : -r.amount
      points.push({ day: r.day, value: Math.max(0, running) })
    }
    points.push({ day: today, value: plan.saved })

    const end = [goal.targetDate, plan.projectedDate, today].filter(Boolean).sort().pop() as string
    const span = Math.max(30, daysBetween(start, end) + 10)
    const top = Math.max(plan.target ?? 0, plan.saved, ...points.map((p) => p.value)) * 1.08 || 1
    const x = (day: string) => PAD.left + (daysBetween(start, day) / span) * (W - PAD.left - PAD.right)
    const y = (value: number) => H - PAD.bottom - (value / top) * (H - PAD.top - PAD.bottom)

    // Savings move in steps: hold each value until the next row.
    let line = ''
    points.forEach((p, i) => {
      line += i === 0 ? `M${x(p.day)},${y(p.value)}` : `H${x(p.day)}V${y(p.value)}`
    })
    const area = `${line}V${y(0)}H${x(start)}Z`
    const planLine =
      goal.targetDate && plan.target != null ? { x1: x(start), y1: y(0), x2: x(goal.targetDate), y2: y(plan.target) } : null
    const projection =
      plan.projectedDate && plan.target != null && plan.projectedDate > today && plan.state !== 'ready'
        ? { x1: x(today), y1: y(plan.saved), x2: x(plan.projectedDate), y2: y(plan.target) }
        : null
    return {
      line,
      area,
      planLine,
      projection,
      targetY: plan.target != null ? y(plan.target) : null,
      todayX: x(today),
      start,
      end,
      endX: x(end),
    }
  }, [plan, rows, today])

  return (
    <figure className="fin-goal-chart" aria-label={`${inr(plan.saved)} set aside${plan.target ? ` of ${inr(plan.target)}` : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
        {chart.targetY != null && <line className="fin-goal-chart-target" x1={PAD.left} x2={W - PAD.right} y1={chart.targetY} y2={chart.targetY} />}
        <path className="fin-goal-chart-area" d={chart.area} />
        {chart.planLine && <line className="fin-goal-chart-plan" {...chart.planLine} />}
        {chart.projection && <line className="fin-goal-chart-projection" {...chart.projection} />}
        <path className="fin-goal-chart-line" d={chart.line} vectorEffect="non-scaling-stroke" />
        <line className="fin-goal-chart-today" x1={chart.todayX} x2={chart.todayX} y1={PAD.top} y2={H - PAD.bottom} />
      </svg>
      <figcaption>
        <span>{monthYear(chart.start)}</span>
        <span className="fin-goal-chart-key">
          <i className="is-saved" /> saved
          {chart.planLine && (
            <>
              <i className="is-plan" /> plan
            </>
          )}
          {chart.projection && (
            <>
              <i className="is-pace" /> your pace
            </>
          )}
        </span>
        <span>{monthYear(chart.end)}</span>
      </figcaption>
    </figure>
  )
}

export { GoalChart }
