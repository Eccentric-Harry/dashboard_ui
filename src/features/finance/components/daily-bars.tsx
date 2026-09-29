// A month of spending, one bar per day, each bar stacked by category in the same colours
// as the Breakdown card below it (Apple Card's activity view). Plain flex columns rather
// than a chart library: they stay crisp at every width and the rounded caps don't distort.
//
// One outlier (rent on the 3rd) would flatten every other day into a sliver, so the scale
// is set by the typical day and anything far above it is clipped with its value on top.

import type { CSSProperties } from 'react'
import { inr } from '@/lib/insights/engine'
import type { DaySpend } from '@/lib/insights/finance'
import { cn } from '@/lib/utils'
import { getConsistentColor } from '../utils'

interface DailyBarsProps {
  days: DaySpend[]
  /** Budget ÷ days in month — drawn as the daily line. Null without a budget. */
  allowance: number | null
  /** Under an everyday (FLEX) budget, fixed costs are shown faded: tracked, not counted. */
  flex: boolean
}

const compact = (n: number) =>
  n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${Math.round(n)}`

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })

function scaleFor(days: DaySpend[], allowance: number | null): number {
  const totals = days.filter((d) => !d.isFuture && d.total > 0).map((d) => d.total).sort((a, b) => a - b)
  const floor = (allowance ?? 0) * 1.6
  if (totals.length === 0) return Math.max(floor, 1)
  const max = totals[totals.length - 1]
  const p80 = totals[Math.min(totals.length - 1, Math.floor(totals.length * 0.8))]
  const soft = Math.max(p80 * 1.8, floor)
  // Only clip when the outlier is well beyond the typical day; otherwise show it true.
  return max <= soft * 1.15 ? Math.max(max, floor, 1) : soft
}

function DailyBars({ days, allowance, flex }: DailyBarsProps) {
  const yMax = scaleFor(days, allowance)
  const allowancePct = allowance ? (allowance / yMax) * 100 : null
  const last = days.length
  const todayDay = days.find((d) => d.isToday)?.day ?? null

  return (
    <div className="fin-days" role="img" aria-label="Spending per day this month, by category">
      <div className="fin-days-plot" style={{ '--days': last } as CSSProperties}>
        {allowancePct != null && allowancePct < 98 && (
          <span className="fin-days-allowance" style={{ bottom: `${allowancePct}%` }}>
            <em>{inr(allowance ?? 0)}/day</em>
          </span>
        )}
        {days.map((d) => {
          const clipped = d.total > yMax
          const height = d.isFuture
            ? allowancePct != null ? Math.min(allowancePct, 100) : 0
            : Math.min(d.total / yMax, 1) * 100
          const edge = d.day <= 4 ? 'is-start' : d.day > last - 4 ? 'is-end' : ''
          return (
            <div
              key={d.date}
              className={cn(
                'fin-day',
                d.isToday && 'is-today',
                d.isFuture && 'is-future',
                !d.isFuture && d.total === 0 && 'is-empty',
                clipped && 'is-clipped',
                edge,
              )}
              tabIndex={d.isFuture ? -1 : 0}
              aria-label={`${shortDate(d.date)}: ${d.total > 0 ? inr(d.total) : 'no spending'}`}
            >
              {clipped && <b className="fin-day-cap">{compact(d.total)}</b>}
              <span className="fin-day-bar" style={d.isFuture || d.total > 0 ? { height: `${height}%` } : undefined}>
                {!d.isFuture &&
                  d.segments.map((s) => (
                    <i
                      key={`${s.category}-${s.fixed}`}
                      className={cn(flex && s.fixed && 'is-fixed')}
                      style={{ flexGrow: s.amount, '--seg': getConsistentColor(s.category) } as CSSProperties}
                    />
                  ))}
              </span>
              {!d.isFuture && (
                <span className="fin-day-tip" role="tooltip">
                  <b>{shortDate(d.date)}</b>
                  <strong>{d.total > 0 ? inr(d.total) : 'No spending'}</strong>
                  {d.segments.slice(0, 3).map((s) => (
                    <span key={`${s.category}-${s.fixed}`} style={{ '--seg': getConsistentColor(s.category) } as CSSProperties}>
                      <i />
                      {s.category}
                      {flex && s.fixed && ' (fixed)'}
                      <em>{inr(s.amount)}</em>
                    </span>
                  ))}
                  {d.segments.length > 3 && <small>+{d.segments.length - 3} more</small>}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="fin-days-axis" style={{ '--days': last } as CSSProperties} aria-hidden="true">
        {days.map((d) => (
          <span key={d.date} className={cn(d.isToday && 'is-today')}>
            {d.isToday
              ? 'Today'
              : (d.day === 1 || d.day % 7 === 1) && (todayDay == null || Math.abs(d.day - todayDay) > 2)
                ? d.day
                : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

export { DailyBars }
