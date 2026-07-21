import { useState } from 'react'
import { Bean, Brain, CheckSquare, Dumbbell, Flame, Lightbulb, Moon, TrendingUp, Utensils, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { DayRecord } from '../insights-engine'
import type { NutritionSummary, SpendingSummary } from '../home-types'
import { formatMinutes, shortDayLabel } from '../home-types'

/* Momentum — the single "how am I trending" card. Absorbs what used to be two
   separate cards (14-day Trends + This-week rollup): the four vitals that carry
   a continuous signal get sparkline tiles up top, and every other weekly total
   rides a compact chip rail underneath. One card, half the scroll, no metric
   printed twice. */

type MomentumCardProps = {
  loading: boolean
  /** Shared 14-day cross-domain series, ascending (oldest → newest). */
  records: DayRecord[]
  /** Last 7 days of that window. */
  weekRecords: DayRecord[]
  /** The 7 days before those — powers the week-over-week deltas. */
  prevWeekRecords: DayRecord[]
  nutrition: NutritionSummary | null
  spending: SpendingSummary | null
}

type Tone = 'good' | 'watch' | 'flat'

type MetricDef = {
  id: 'sleep' | 'focus' | 'mood' | 'tasks'
  label: string
  icon: LucideIcon
  /** Per-day value; null = not logged, excluded from the average + the line. */
  pick: (r: DayRecord) => number | null
  aggregate: 'avg' | 'total'
  format: (n: number) => string
  sub: string
}

const METRICS: MetricDef[] = [
  { id: 'sleep', label: 'Sleep', icon: Moon, pick: (r) => r.sleepMinutes, aggregate: 'avg', format: formatMinutes, sub: 'avg / night' },
  { id: 'focus', label: 'Focus', icon: Flame, pick: (r) => r.focusMinutes, aggregate: 'avg', format: formatMinutes, sub: 'avg / day' },
  { id: 'mood', label: 'Mood', icon: Brain, pick: (r) => r.moodScore, aggregate: 'avg', format: (n) => n.toFixed(1), sub: 'avg mood / 5' },
  { id: 'tasks', label: 'Tasks done', icon: CheckSquare, pick: (r) => r.tasksCompleted, aggregate: 'total', format: (n) => String(Math.round(n)), sub: 'done · 14 days' },
]

type Trend = { arrow: string; text: string; tone: Tone }

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

/** Recent half vs earlier half of the window — the direction the metric is moving. */
function halfTrend(series: (number | null)[]): Trend | null {
  const mid = Math.floor(series.length / 2)
  const first = series.slice(0, mid).filter((v): v is number => v != null)
  const second = series.slice(mid).filter((v): v is number => v != null)
  if (first.length === 0 || second.length === 0) return null

  const a = mean(first)
  const b = mean(second)
  const denom = Math.max(Math.abs(a), Math.abs(b))
  if (denom === 0) return null

  const relDiff = (b - a) / denom
  if (Math.abs(relDiff) < 0.05) return { arrow: '', text: 'steady', tone: 'flat' }
  const pct = Math.min(999, Math.round(Math.abs(relDiff) * 100))
  return b > a
    ? { arrow: '▲', text: `${pct}%`, tone: 'good' } // more sleep/focus/mood/tasks is always the good direction here
    : { arrow: '▼', text: `${pct}%`, tone: 'watch' }
}

/** "▲ +2" — tone follows whether more of this metric is good. */
function weekDelta(
  current: number,
  previous: number,
  format: (n: number) => string,
  goodWhen: 'up' | 'down' = 'up',
): { text: string; tone: Tone } | null {
  if (current === 0 && previous === 0) return null
  if (previous === 0) return { text: 'new', tone: 'good' }
  const diff = current - previous
  if (diff === 0) return null
  const arrow = diff > 0 ? '▲' : '▼'
  const improved = goodWhen === 'up' ? diff > 0 : diff < 0
  return { text: `${arrow} ${format(Math.abs(diff))}`, tone: improved ? 'good' : 'watch' }
}

/** Dependency-free area sparkline; nulls become gaps so unlogged days don't lie flat.
    Hovering snaps a guide + readout to the nearest logged day. */
function Sparkline({
  series,
  dates,
  format,
}: {
  series: (number | null)[]
  /** Parallel to `series` — supplies the tooltip's day label. */
  dates: string[]
  format: (n: number) => string
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const points = series
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v != null)
  if (points.length < 2) return null

  const w = 100
  const h = 38
  const pad = 5
  const lastX = series.length - 1
  const vals = points.map((p) => p.v)
  const min = Math.min(...vals)
  const span = Math.max(...vals) - min || 1
  const x = (i: number) => (i / lastX) * w
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - 2 * pad)

  const line = points.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
  const first = points[0]
  const last = points[points.length - 1]
  const area = `${line} L${x(last.i).toFixed(1)} ${h} L${x(first.i).toFixed(1)} ${h} Z`

  // Snap to the nearest *logged* day, so a gap never yields an empty readout.
  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width === 0) return
    const target = ((event.clientX - rect.left) / rect.width) * lastX
    const nearest = points.reduce((a, b) => (Math.abs(b.i - target) < Math.abs(a.i - target) ? b : a))
    setHoverIndex(nearest.i)
  }

  const hovered = hoverIndex != null ? points.find((p) => p.i === hoverIndex) : undefined

  return (
    <div
      className="home-trend-spark-wrap"
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg
        className="home-trend-spark"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="home-trend-area" d={area} />
        <path className="home-trend-line" d={line} vectorEffect="non-scaling-stroke" />
        {hovered && (
          <line
            className="home-trend-guide"
            x1={x(hovered.i)}
            x2={x(hovered.i)}
            y1={0}
            y2={h}
            vectorEffect="non-scaling-stroke"
          />
        )}
        <circle
          className="home-trend-dot"
          cx={x(hovered ? hovered.i : last.i)}
          cy={y(hovered ? hovered.v : last.v)}
          r={hovered ? 3 : 2.4}
        />
      </svg>
      {hovered && (
        <span
          className="home-trend-tip"
          style={{ left: `${Math.min(Math.max(x(hovered.i), 16), 84)}%` }}
          role="status"
        >
          <b>{format(hovered.v)}</b>
          <small>{shortDayLabel(dates[hovered.i])}</small>
        </span>
      )}
    </div>
  )
}

type WeekChip = {
  id: string
  icon: React.ReactNode
  value: string
  label: string
  isZero: boolean
  watch?: boolean
  delta: { text: string; tone: Tone } | null
}

function MomentumCard({
  loading,
  records,
  weekRecords,
  prevWeekRecords,
  nutrition,
  spending,
}: MomentumCardProps) {
  const dates = records.map((r) => r.date)
  const tiles = METRICS.map((metric) => {
    const series = records.map(metric.pick)
    const present = series.filter((v): v is number => v != null)
    const hasData = present.some((v) => v > 0)
    const value = metric.aggregate === 'total' ? present.reduce((a, b) => a + b, 0) : mean(present.length ? present : [0])
    return {
      ...metric,
      series,
      hasData,
      headline: hasData ? metric.format(value) : '—',
      trend: hasData ? halfTrend(series) : null,
    }
  })

  const sum = (rows: DayRecord[], pick: (r: DayRecord) => number) => rows.reduce((total, r) => total + pick(r), 0)
  const avgSleep = (rows: DayRecord[]) => {
    const nights = rows.filter((r) => r.sleepMinutes != null)
    if (nights.length === 0) return null
    return Math.round(nights.reduce((total, r) => total + (r.sleepMinutes as number), 0) / nights.length)
  }

  const focus = sum(weekRecords, (r) => r.focusMinutes)
  const tasks = sum(weekRecords, (r) => r.tasksCompleted)
  const workouts = sum(weekRecords, (r) => r.workouts)
  const learnings = sum(weekRecords, (r) => r.learnings)
  const sleep = avgSleep(weekRecords)
  const prevSleep = avgSleep(prevWeekRecords)

  const mealsLoggedDays = nutrition
    ? Object.values(nutrition.dailyCalories).filter((kcal) => kcal > 0).length
    : 0

  // Guarded because guest mode's fetch fallback can hand back a shape-less payload.
  const budgetUtilization =
    spending && Number.isFinite(spending.budgetUtilization) ? spending.budgetUtilization : null

  const count = (n: number) => String(n)
  const pctFormat = (n: number) => `${n}%`

  const proteinGoal = nutrition?.proteinGoal ?? 0
  const weeklyProteinGoal = proteinGoal * 7
  const proteinGrams = sum(weekRecords, (r) => r.proteinGrams ?? 0)
  const prevProteinGrams = sum(prevWeekRecords, (r) => r.proteinGrams ?? 0)
  const proteinPct = weeklyProteinGoal > 0 ? Math.round((proteinGrams / weeklyProteinGoal) * 100) : null
  const prevProteinPct = weeklyProteinGoal > 0 ? Math.round((prevProteinGrams / weeklyProteinGoal) * 100) : null

  const chips: WeekChip[] = [
    {
      id: 'focus',
      icon: <Flame size={12} strokeWidth={2.5} />,
      value: focus > 0 ? formatMinutes(focus) : '—',
      label: 'focused',
      isZero: focus === 0,
      delta: weekDelta(focus, sum(prevWeekRecords, (r) => r.focusMinutes), formatMinutes),
    },
    {
      id: 'tasks',
      icon: <CheckSquare size={12} strokeWidth={2.5} />,
      value: tasks > 0 ? String(tasks) : '—',
      label: 'tasks',
      isZero: tasks === 0,
      delta: weekDelta(tasks, sum(prevWeekRecords, (r) => r.tasksCompleted), count),
    },
    {
      id: 'workouts',
      icon: <Dumbbell size={12} strokeWidth={2.5} />,
      value: workouts > 0 ? String(workouts) : '—',
      label: 'workouts',
      isZero: workouts === 0,
      delta: weekDelta(workouts, sum(prevWeekRecords, (r) => r.workouts), count),
    },
    {
      id: 'learnings',
      icon: <Lightbulb size={12} strokeWidth={2.5} />,
      value: learnings > 0 ? String(learnings) : '—',
      label: 'learnings',
      isZero: learnings === 0,
      delta: weekDelta(learnings, sum(prevWeekRecords, (r) => r.learnings), count),
    },
    {
      id: 'meals',
      icon: <Utensils size={12} strokeWidth={2.5} />,
      value: mealsLoggedDays > 0 ? `${mealsLoggedDays}d` : '—',
      label: 'meals logged',
      isZero: mealsLoggedDays === 0,
      delta: null,
    },
    {
      id: 'sleep',
      icon: <Moon size={12} strokeWidth={2.5} />,
      value: sleep != null ? formatMinutes(sleep) : '—',
      label: 'avg sleep',
      isZero: sleep == null,
      delta: sleep != null && prevSleep != null ? weekDelta(sleep, prevSleep, formatMinutes) : null,
    },
    {
      id: 'protein',
      icon: <Bean size={12} strokeWidth={2.5} />,
      value: proteinPct != null ? `${proteinPct}%` : '—',
      label: 'protein goal',
      isZero: proteinPct == null || proteinPct === 0,
      delta: proteinPct != null && prevProteinPct != null ? weekDelta(proteinPct, prevProteinPct, pctFormat) : null,
    },
    {
      id: 'spend',
      icon: <Wallet size={12} strokeWidth={2.5} />,
      value: budgetUtilization != null ? `${Math.round(budgetUtilization)}%` : '—',
      label: 'budget used',
      isZero: budgetUtilization == null,
      watch: budgetUtilization != null && budgetUtilization > 100,
      delta: null,
    },
  ]

  const anyTrend = tiles.some((t) => t.hasData)
  const anyChip = chips.some((c) => !c.isZero)

  return (
    <section className="home-card home-card--momentum" aria-label="Momentum">
      <header className="home-card-head">
        <div className="home-card-heading">
          <span className="home-card-ic" aria-hidden="true">
            <TrendingUp size={14} strokeWidth={2.4} />
          </span>
          <div>
            <span className="home-card-eyebrow">Momentum · 14 days</span>
            <h2 className="home-card-title">Where things are heading</h2>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="home-trend-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="home-skel home-skel--tile" />
          ))}
        </div>
      ) : !anyTrend && !anyChip ? (
        <div className="home-card-empty">
          <p>Two weeks of logging and your trajectory shows up here — sleep, focus, mood and tasks, each finding its line.</p>
        </div>
      ) : (
        <>
          <div className="home-trend-grid">
            {tiles.map((tile) => {
              const Icon = tile.icon
              return (
                <article
                  key={tile.id}
                  className={cn('home-trend-tile', `home-trend--${tile.id}`, !tile.hasData && 'is-quiet')}
                >
                  {/* Label owns the header alone — sharing it with the
                      direction pill truncated it to "Sl…" on phone tiles. */}
                  <header className="home-trend-head">
                    <span className="home-trend-ic" aria-hidden="true">
                      <Icon size={13} strokeWidth={2.5} />
                    </span>
                    <span className="home-trend-label">{tile.label}</span>
                  </header>

                  {tile.hasData ? (
                    <Sparkline series={tile.series} dates={dates} format={tile.format} />
                  ) : (
                    <div className="home-trend-spark-empty" aria-hidden="true" />
                  )}

                  <footer className="home-trend-foot">
                    <div className="home-trend-value-row">
                      <b className="home-trend-value">{tile.headline}</b>
                      {tile.trend && (
                        <span className={cn('home-trend-pill', `tone-${tile.trend.tone}`)}>
                          {tile.trend.arrow && <b aria-hidden="true">{tile.trend.arrow}</b>}
                          {tile.trend.text}
                        </span>
                      )}
                    </div>
                    <small className="home-trend-sub">{tile.sub}</small>
                  </footer>
                </article>
              )
            })}
          </div>

          <div className="home-week-rail">
            <span className="home-card-eyebrow">This week</span>
            <ul>
              {chips.map((chip) => (
                <li
                  key={chip.id}
                  className={cn(
                    'home-week-chip',
                    `home-rollup--${chip.id}`,
                    chip.isZero && 'is-quiet',
                    chip.watch && 'is-watch',
                  )}
                >
                  <span className="home-week-chip-ic" aria-hidden="true">
                    {chip.icon}
                  </span>
                  <span className="home-week-chip-text">
                    <b>
                      {chip.value}
                      {chip.delta && (
                        <em className={`tone-${chip.delta.tone}`}>{chip.delta.text}</em>
                      )}
                    </b>
                    <small>{chip.label}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}

export { MomentumCard }
