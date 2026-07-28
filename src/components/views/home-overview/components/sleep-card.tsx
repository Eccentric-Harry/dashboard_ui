import { useEffect, useMemo, useState } from 'react'
import { Moon, Plus, Sunrise, Trophy, Waves } from 'lucide-react'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SleepEntry, SleepEntryPayload } from '../../../../lib/api'
import { cn } from '../../../../lib/utils'
import {
  formatMinutes,
  lastNDates,
  shortDayLabel,
  SLEEP_TARGET_HOURS,
  SLEEP_TARGET_MINUTES,
  weekdayLetter,
} from '../home-types'

const QUALITY_LABELS = ['Rough', 'Poor', 'Okay', 'Good', 'Great'] as const

/* Slate-blue bar fills — deeper as the night gets closer to target,
   so the chart itself reads "how good was the week" at a glance. */
const BAR_ON_TARGET = '#6d9cbe'
const BAR_UNDER = '#a9c6da'
const BAR_LAST_NIGHT = '#43799e'
const BAR_MISSING = 'rgba(30, 61, 82, 0.1)'

type SleepCardProps = {
  loading: boolean
  failed: boolean
  entries: SleepEntry[] | null
  today: string
  openFormNonce?: number
  onLog: (payload: SleepEntryPayload) => Promise<void>
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
    decoration and needed a hover to mean anything. */
function QualityMeter({ quality }: { quality?: number | null }) {
  const label = quality ? QUALITY_LABELS[quality - 1] : 'Not rated'
  return (
    <span
      className={cn('home-sleep-quality', !quality && 'is-unrated')}
      aria-label={`Sleep quality: ${label}`}
    >
      <span className="home-sleep-quality-meter" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((step) => (
          <i key={step} className={cn(quality != null && step <= quality && 'is-on')} />
        ))}
      </span>
      {label}
    </span>
  )
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function SleepTooltip({ active, payload }: any) {
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

function SleepCard({ loading, failed, entries, today, openFormNonce, onLog, onRetry }: SleepCardProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (openFormNonce) setFormOpen(true)
  }, [openFormNonce])
  const [date, setDate] = useState(today)
  const [bedtime, setBedtime] = useState('23:30')
  const [wakeTime, setWakeTime] = useState('07:00')
  const [quality, setQuality] = useState<number>(3)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const week = useMemo(() => lastNDates(7, today), [today])
  const byDate = useMemo(() => new Map((entries ?? []).map((e) => [e.date, e])), [entries])

  // Fresh open always starts on today; picking a different date re-syncs
  // the fields below to whatever (if anything) is already logged for it.
  useEffect(() => {
    if (formOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDate(today)
    }
  }, [formOpen, today])

  useEffect(() => {
    if (!formOpen) return
    const existing = byDate.get(date)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBedtime(existing?.bedtime ?? '23:30')
    setWakeTime(existing?.wakeTime ?? '07:00')
    setQuality(existing?.quality ?? 3)
    setNote(existing?.note ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOpen, date])

  const lastNight = byDate.get(today) ?? null
  const latest = lastNight ?? (entries && entries.length > 0 ? entries[entries.length - 1] : null)

  const loggedThisWeek = useMemo(
    () => week.map((d) => byDate.get(d)).filter((e): e is SleepEntry => Boolean(e)),
    [week, byDate],
  )
  const avgMinutes =
    loggedThisWeek.length > 0
      ? Math.round(loggedThisWeek.reduce((sum, e) => sum + e.durationMinutes, 0) / loggedThisWeek.length)
      : null
  const debtMinutes =
    loggedThisWeek.length > 0
      ? loggedThisWeek.reduce((sum, e) => sum + (SLEEP_TARGET_MINUTES - e.durationMinutes), 0)
      : null

  const series = useMemo<SleepPoint[]>(
    () =>
      week.map((date) => {
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

  const chartMax = Math.max(SLEEP_TARGET_MINUTES, ...loggedThisWeek.map((e) => e.durationMinutes)) + 60

  const barFill = (point: SleepPoint): string => {
    if (point.minutes == null) return BAR_MISSING
    if (point.date === today) return BAR_LAST_NIGHT
    return point.minutes >= SLEEP_TARGET_MINUTES ? BAR_ON_TARGET : BAR_UNDER
  }

  const submit = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onLog({
        date,
        bedtime,
        wakeTime,
        quality,
        note: note.trim() || undefined,
        source: 'manual',
      })
      setFormOpen(false)
      setNote('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="home-card home-card--sleep" aria-label="Sleep">
      <Moon className="home-card-glyph" aria-hidden="true" />
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">Sleep</span>
          <h2 className="home-card-title">Last night</h2>
        </div>
        {!loading && !failed && (
          <button
            type="button"
            className="home-btn-quiet"
            onClick={() => setFormOpen((open) => !open)}
            aria-expanded={formOpen}
          >
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
                  {latest.date === today ? 'last night' : `latest · ${latest.date}`}
                  {' · '}
                  {latest.bedtime} → {latest.wakeTime}
                </small>
              </div>
              <QualityMeter quality={latest.quality} />
              <div className="ntr-tap-stats">
                <div className="ntr-tap-stat">
                  <span>avg week</span>
                  <b>{avgMinutes != null ? formatMinutes(avgMinutes) : '—'}</b>
                </div>
                <div className="ntr-tap-stat">
                  <span>vs {SLEEP_TARGET_HOURS}h</span>
                  <b className={cn(debtMinutes != null && debtMinutes > 0 && 'is-watch')}>
                    {debtMinutes == null
                      ? '—'
                      : debtMinutes > 0
                        ? `−${formatMinutes(debtMinutes)}`
                        : `+${formatMinutes(Math.abs(debtMinutes))}`}
                  </b>
                </div>
                <div className="ntr-tap-stat">
                  <span>logged</span>
                  <b>{loggedThisWeek.length}/7</b>
                </div>
              </div>
            </div>
          ) : (
            !formOpen && (
              <div className="home-card-empty">
                <p>Log last night to start seeing patterns.</p>
                <button type="button" className="home-btn-quiet" onClick={() => setFormOpen(true)}>
                  Add last night
                </button>
              </div>
            )
          )}

          {formOpen && (
            <div className="home-sleep-form">
              <div className="home-sleep-form-row">
                <label>
                  <span>Night of</span>
                  <input
                    type="date"
                    value={date}
                    max={today}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label>
                  <span>Bedtime</span>
                  <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
                </label>
                <label>
                  <span>Woke up</span>
                  <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
                </label>
                <div className="home-sleep-quality-picker" role="radiogroup" aria-label="Sleep quality">
                  <span>Quality</span>
                  <div>
                    {QUALITY_LABELS.map((label, index) => {
                      const value = index + 1
                      return (
                        <button
                          key={label}
                          type="button"
                          role="radio"
                          aria-checked={quality === value}
                          title={label}
                          className={cn('home-quality-btn', `q-${value}`, quality === value && 'is-active')}
                          onClick={() => setQuality(value)}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
              <input
                type="text"
                className="home-sleep-note"
                placeholder="Optional note — woke up twice, late coffee…"
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="home-sleep-form-actions">
                <button type="button" className="home-btn-quiet" onClick={() => setFormOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="home-btn-primary" disabled={saving} onClick={() => void submit()}>
                  {saving ? 'Saving…' : byDate.get(date) ? 'Update night' : 'Save night'}
                </button>
              </div>
            </div>
          )}

          {(entries?.length ?? 0) > 0 && (
            <div className="home-sleep-chart" role="img" aria-label="Sleep duration bars for the last 7 nights">
              {isMounted && (
                <ResponsiveContainer width="99%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={series} margin={{ top: 16, right: 14, left: 14, bottom: 0 }} barCategoryGap="28%">
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={{ fill: 'rgba(23, 27, 21, 0.42)', fontSize: 10, fontWeight: 650 }}
                    />
                    <YAxis hide domain={[0, chartMax]} />
                    <Tooltip content={makeSleepTooltip(today)} cursor={{ fill: 'rgba(30, 61, 82, 0.05)' }} />
                    <ReferenceLine
                      y={SLEEP_TARGET_MINUTES}
                      stroke="rgba(30, 61, 82, 0.3)"
                      strokeDasharray="5 6"
                      label={{
                        position: 'insideTopRight',
                        value: `TARGET ${SLEEP_TARGET_HOURS}H`,
                        fill: 'rgba(30, 61, 82, 0.45)',
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
