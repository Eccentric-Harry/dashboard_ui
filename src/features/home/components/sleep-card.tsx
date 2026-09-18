import { useEffect, useMemo, useState } from 'react'
import { Moon, Plus, Sunrise, Trophy, Waves } from 'lucide-react'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import {
  formatMinutes,
  lastNDates,
  shortDayLabel,
  SLEEP_TARGET_HOURS,
  SLEEP_TARGET_MINUTES,
  weekdayLetter,
} from '../home-types'
import type { HomeSleepEntry, SleepSummary } from '../sleep-summary'
import type { ChartTooltipProps } from '@/lib/chart-tooltip'

const QUALITY_LABELS = ['Rough', 'Poor', 'Okay', 'Good', 'Great'] as const

/* Slate-blue bar fills — deeper as the night gets closer to target,
   so the chart itself reads "how good was the week" at a glance. */
const BAR_ON_TARGET = 'var(--home-sleep-bar-on, #6d9cbe)'
const BAR_UNDER = 'var(--home-sleep-bar-under, #a9c6da)'
const BAR_LAST_NIGHT = 'var(--home-sleep-bar-last, #43799e)'
const BAR_MISSING = 'var(--home-sleep-bar-missing, rgba(30, 61, 82, 0.1))'

type SleepCardProps = {
  loading: boolean
  failed: boolean
  /** Shared, date-attributed sleep read — the same one the Day Loop and trends use. */
  summary: SleepSummary
  today: string
  /** Opens the log-sleep modal (components/log-sleep-modal.tsx), owned by the route. */
  onOpenLog: () => void
  onRetry: () => void
}

type SleepPoint = {
  day: string
  date: string
  minutes: number | null
  /** What the bar plots: real minutes, or 0 (+minPointSize stub) when unlogged. */
  plotted: number
  quality: number | null
  bedtime: string | null
  wakeTime: string | null
}

/** Quality as a labelled 5-segment meter — a bare colored dot read as
    decoration and needed a hover to mean anything. Quality is the user's own
    rating, not a score derived from duration, so it says "Rated" and carries a
    short reason when it's low — otherwise "Poor" next to 8h looks like a bug. */
function QualityMeter({ quality, reason }: { quality?: number | null; reason?: string | null }) {
  const label = quality ? QUALITY_LABELS[quality - 1] : 'Not rated'
  return (
    <span
      className={cn('home-sleep-quality', !quality && 'is-unrated')}
      aria-label={`Sleep quality: ${quality ? `you rated it ${label}` : label}${reason ? ` — ${reason}` : ''}`}
      title={quality ? 'Your own rating from when you logged the night' : undefined}
    >
      <span className="home-sleep-quality-meter" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((step) => (
          <i key={step} className={cn(quality != null && step <= quality && 'is-on')} />
        ))}
      </span>
      {quality ? `Rated ${label}` : label}
      {reason && <em className="home-sleep-quality-why">{reason}</em>}
    </span>
  )
}

const clockMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m
}

/** Why a low rating might be low, from what the entry actually carries — never invented. */
function qualityReason(entry: HomeSleepEntry, avgBedtime: string | null): string | null {
  if (!entry.quality || entry.quality > 2) return null
  const note = entry.note?.trim()
  if (note) return note.length > 40 ? `${note.slice(0, 39).trim()}…` : note
  const bed = entry.bedtime ? clockMinutes(entry.bedtime) : null
  const avg = avgBedtime ? clockMinutes(avgBedtime) : null
  if (bed != null && avg != null) {
    const raw = Math.abs(bed - avg)
    if (Math.min(raw, 1440 - raw) >= 60) return 'irregular bedtime'
  }
  if (entry.durationMinutes < SLEEP_TARGET_MINUTES) return 'short of target'
  return 'full length — add a note on why'
}

/** Mean of "HH:MM" clock times around an anchor hour, so 23:50 and 00:20
    average to ~00:05 instead of noon. Anchor 18:00 suits bedtimes; 0:00 wakes. */
function avgClockTime(times: string[], anchorHour: number): string | null {
  const offsets = times
    .map((t) => {
      const [h, m] = t.split(':').map(Number)
      if (Number.isNaN(h) || Number.isNaN(m)) return null
      return (h * 60 + m - anchorHour * 60 + 1440) % 1440
    })
    .filter((v): v is number => v != null)
  if (offsets.length === 0) return null
  const mean = offsets.reduce((sum, v) => sum + v, 0) / offsets.length
  const minutes = (Math.round(mean) + anchorHour * 60) % 1440
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/**
 * The x-axis uses single-letter weekday labels (weekdayLetter), which collide —
 * Thu and Tue both render "T", Sun and Sat both render "S". The tooltip used to
 * echo that same ambiguous letter, so hovering the *Thursday* bar could read as
 * "T: 7h45m · Poor" right next to a "Last night: 8h30m · Great" hero for Tuesday,
 * making two different nights look like a contradiction. Building the tooltip's
 * own label from the full date (via shortDayLabel, three letters — unambiguous
 * within a 7-day window) and calling out "Last night" explicitly fixes that.
 */
function makeSleepTooltip(today: string) {
  return function SleepTooltip({ active, payload }: ChartTooltipProps) {
    if (!active || !payload?.length) return null
    const point = payload[0].payload as SleepPoint
    const label = point.date === today ? 'Last night' : shortDayLabel(point.date)
    if (point.minutes == null) {
      return <div className="home-sleep-tooltip">{label}: not logged</div>
    }
    return (
      <div className="home-sleep-tooltip">
        {label}: {formatMinutes(point.minutes)}
        {point.quality ? ` · ${QUALITY_LABELS[point.quality - 1]}` : ''}
        {point.bedtime && point.wakeTime && (
          <small>
            {point.bedtime} → {point.wakeTime}
          </small>
        )}
      </div>
    )
  }
}

function SleepCard({ loading, failed, summary, today, onOpenLog, onRetry }: SleepCardProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  const week = useMemo(() => lastNDates(7, today), [today])
  const { byDate, lastNight, latest, week: loggedThisWeek, avgMinutes, avgVsTargetMinutes } = summary

  const series = useMemo<SleepPoint[]>(
    () =>
      week.map((date): SleepPoint => {
        const entry = byDate.get(date)
        return {
          day: weekdayLetter(date),
          date,
          minutes: entry?.durationMinutes ?? null,
          plotted: entry?.durationMinutes ?? 0,
          quality: entry?.quality ?? null,
          bedtime: entry?.bedtime ?? null,
          wakeTime: entry?.wakeTime ?? null,
        }
      }),
    [week, byDate],
  )

  // Derived "night facts" — need at least two nights before they say anything.
  const facts = useMemo(() => {
    if (loggedThisWeek.length < 2) return null
    const avgBed = avgClockTime(
      loggedThisWeek.map((e) => e.bedtime).filter((t): t is string => Boolean(t)),
      18,
    )
    const avgWake = avgClockTime(
      loggedThisWeek.map((e) => e.wakeTime).filter((t): t is string => Boolean(t)),
      0,
    )
    const best = loggedThisWeek.reduce((a, b) => (b.durationMinutes > a.durationMinutes ? b : a))
    const mean = loggedThisWeek.reduce((sum, e) => sum + e.durationMinutes, 0) / loggedThisWeek.length
    const variance =
      loggedThisWeek.reduce((sum, e) => sum + (e.durationMinutes - mean) ** 2, 0) / loggedThisWeek.length
    const swing = Math.round(Math.sqrt(variance))
    return { avgBed, avgWake, best, swing }
  }, [loggedThisWeek])

  const qualityWhy = latest ? qualityReason(latest, facts?.avgBed ?? null) : null

  const chartMax =Math.max(SLEEP_TARGET_MINUTES, ...loggedThisWeek.map((e) => e.durationMinutes)) + 60

  const barFill = (point: SleepPoint): string => {
    if (point.minutes == null) return BAR_MISSING
    if (point.date === today) return BAR_LAST_NIGHT
    return point.minutes >= SLEEP_TARGET_MINUTES ? BAR_ON_TARGET : BAR_UNDER
  }

  return (
    <section className="home-card home-card--sleep" aria-label="Sleep">
      <Moon className="home-card-glyph" aria-hidden="true" />
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">Sleep</span>
          <h2 className="home-card-title">{lastNight || !latest ? 'Last night' : 'Latest night'}</h2>
        </div>
        {!loading && !failed && (
          <button type="button" className="home-btn-quiet" onClick={onOpenLog}>
            <Plus size={13} /> {lastNight ? 'Update night' : 'Log night'}
          </button>
        )}
      </header>

      {loading ? (
        <div className="home-card-body">
          <span className="home-skel home-skel--title" />
          <span className="home-skel home-skel--chart" />
        </div>
      ) : failed ? (
        <div className="home-card-empty">
          <p>Couldn't load sleep right now.</p>
          <button type="button" className="home-btn-quiet" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {latest ? (
            <div className="home-sleep-accent">
              <div className="ntr-tap-big">
                <strong>{formatMinutes(latest.durationMinutes)}</strong>
                <small>
                  {latest.date === today ? 'last night' : `latest · ${shortDayLabel(latest.date)}`}
                  {' · '}
                  {latest.bedtime} → {latest.wakeTime}
                </small>
              </div>
              <QualityMeter quality={latest.quality} reason={qualityWhy} />
              <div className="ntr-tap-stats">
                <div className="ntr-tap-stat">
                  <span>avg week</span>
                  <b>{avgMinutes != null ? formatMinutes(avgMinutes) : '—'}</b>
                </div>
                {/* Average night against the nightly target. This used to sum each
                    night's surplus across the week, so +48m/night read as "+4h 45m". */}
                <div className="ntr-tap-stat">
                  <span>vs {SLEEP_TARGET_HOURS}h / night</span>
                  <b className={cn(avgVsTargetMinutes != null && avgVsTargetMinutes < 0 && 'is-watch')}>
                    {avgVsTargetMinutes == null
                      ? '—'
                      : avgVsTargetMinutes === 0
                        ? 'on target'
                        : `${avgVsTargetMinutes > 0 ? '+' : '−'}${formatMinutes(Math.abs(avgVsTargetMinutes))}`}
                  </b>
                </div>
                <div className="ntr-tap-stat">
                  <span>logged</span>
                  <b>{loggedThisWeek.length}/7</b>
                </div>
              </div>
            </div>
          ) : (
            <div className="home-card-empty">
              <p>Log last night to start seeing patterns.</p>
              <button type="button" className="home-btn-quiet" onClick={onOpenLog}>
                Add last night
              </button>
            </div>
          )}

          {summary.entries.length > 0 && (
            <div className="home-sleep-chart" role="img" aria-label="Sleep duration bars for the last 7 nights">
              {isMounted && (
                <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={series} margin={{ top: 16, right: 14, left: 14, bottom: 0 }} barCategoryGap="28%">
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={{ fill: 'var(--home-chart-tick, rgba(23, 27, 21, 0.42))', fontSize: 10, fontWeight: 650 }}
                    />
                    <YAxis hide domain={[0, chartMax]} />
                    <Tooltip content={makeSleepTooltip(today)} cursor={{ fill: 'var(--home-sleep-cursor, rgba(30, 61, 82, 0.05))' }} />
                    <ReferenceLine
                      y={SLEEP_TARGET_MINUTES}
                      stroke="var(--home-sleep-guide, rgba(30, 61, 82, 0.3))"
                      strokeDasharray="5 6"
                      label={{
                        position: 'insideTopRight',
                        value: `TARGET ${SLEEP_TARGET_HOURS}H`,
                        fill: 'var(--home-sleep-guide-label, rgba(30, 61, 82, 0.45))',
                        fontSize: 8.5,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                      }}
                    />
                    <Bar
                      dataKey="plotted"
                      radius={[8, 8, 3, 3]}
                      maxBarSize={30}
                      minPointSize={4}
                      /* Off deliberately: the card flex-grows to its neighbour's
                         height, and a ResponsiveContainer resize mid-animation
                         (recharts 3.8) leaves the bar paths empty — the chart
                         then renders as an axis with no bars at all. */
                      isAnimationActive={false}
                    >
                      {series.map((point) => (
                        <Cell key={point.date} fill={barFill(point)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {facts && (
            <div className="home-sleep-facts">
              <span className="home-sleep-fact">
                <small>
                  <Moon size={11} strokeWidth={2.5} /> avg bedtime
                </small>
                <b>{facts.avgBed ?? '—'}</b>
              </span>
              <span className="home-sleep-fact">
                <small>
                  <Sunrise size={11} strokeWidth={2.5} /> avg wake
                </small>
                <b>{facts.avgWake ?? '—'}</b>
              </span>
              <span className="home-sleep-fact">
                <small>
                  <Trophy size={11} strokeWidth={2.5} /> best night
                </small>
                <b>
                  {shortDayLabel(facts.best.date)} · {formatMinutes(facts.best.durationMinutes)}
                </b>
              </span>
              <span className="home-sleep-fact">
                <small>
                  <Waves size={11} strokeWidth={2.5} /> consistency
                </small>
                <b className={cn(facts.swing > 60 && 'is-watch')}>±{formatMinutes(facts.swing)}</b>
              </span>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export { SleepCard }
