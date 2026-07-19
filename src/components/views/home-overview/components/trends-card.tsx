import { Brain, CheckSquare, Flame, Moon, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import type { DayRecord } from '../insights-engine'
import { formatMinutes } from '../home-types'

type TrendsCardProps = {
  loading: boolean
  /** Shared 14-day cross-domain series, ascending (oldest → newest). */
  records: DayRecord[]
}

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

// The four daily vitals that carry a continuous signal worth a trend line —
// consistency dots ("did you show up") gave way to trajectory ("which way is
// it heading"). All read straight from the records the page already fetched.
const METRICS: MetricDef[] = [
  { id: 'sleep', label: 'Sleep', icon: Moon, pick: (r) => r.sleepMinutes, aggregate: 'avg', format: formatMinutes, sub: 'avg / night' },
  { id: 'focus', label: 'Focus', icon: Flame, pick: (r) => r.focusMinutes, aggregate: 'avg', format: formatMinutes, sub: 'avg / day' },
  { id: 'mood', label: 'Mood', icon: Brain, pick: (r) => r.moodScore, aggregate: 'avg', format: (n) => n.toFixed(1), sub: 'avg mood / 5' },
  { id: 'tasks', label: 'Tasks done', icon: CheckSquare, pick: (r) => r.tasksCompleted, aggregate: 'total', format: (n) => String(Math.round(n)), sub: 'done · 14 days' },
]

type Tone = 'good' | 'watch' | 'flat'
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

/** Dependency-free area sparkline; nulls become gaps so unlogged days don't lie flat. */
function Sparkline({ id, series }: { id: string; series: (number | null)[] }) {
  const points = series
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v != null)
  if (points.length < 2) return null

  const w = 100
  const h = 34
  const pad = 4
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

  return (
    <svg
      className={cn('home-trend-spark', `home-trend--${id}`)}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path className="home-trend-area" d={area} />
      <path className="home-trend-line" d={line} vectorEffect="non-scaling-stroke" />
      <circle className="home-trend-dot" cx={x(last.i)} cy={y(last.v)} r={2.2} />
    </svg>
  )
}

function TrendsCard({ loading, records }: TrendsCardProps) {
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

  const anyData = tiles.some((t) => t.hasData)

  return (
    <section className="home-card home-card--trends" aria-label="Trends">
      <TrendingUp className="home-card-glyph" aria-hidden="true" />
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">Trends</span>
          <h2 className="home-card-title">Where things are heading</h2>
        </div>
      </header>

      {loading ? (
        <div className="home-trend-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="home-skel home-skel--tile" />
          ))}
        </div>
      ) : !anyData ? (
        <div className="home-card-empty">
          <p>Two weeks of logging and your trajectory shows up here — sleep, focus, mood and tasks, each finding its line.</p>
        </div>
      ) : (
        <div className="home-trend-grid">
          {tiles.map((tile) => {
            const Icon = tile.icon
            return (
              <article
                key={tile.id}
                className={cn('home-trend-tile', `home-trend--${tile.id}`, !tile.hasData && 'is-quiet')}
              >
                <header className="home-trend-head">
                  <span className="home-trend-ic" aria-hidden="true">
                    <Icon size={14} strokeWidth={2.4} />
                  </span>
                  <span className="home-trend-label">{tile.label}</span>
                </header>

                {tile.hasData ? (
                  <Sparkline id={tile.id} series={tile.series} />
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
      )}
    </section>
  )
}

export { TrendsCard }
