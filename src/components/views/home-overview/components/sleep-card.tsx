import { useEffect, useMemo, useState } from 'react'
import { Moon } from 'lucide-react'
import type { SleepEntry, SleepEntryPayload } from '../../../../lib/api'
import { cn } from '../../../../lib/utils'
import {
  formatMinutes,
  lastNDates,
  SLEEP_TARGET_HOURS,
  SLEEP_TARGET_MINUTES,
  weekdayLetter,
} from '../home-types'

const QUALITY_LABELS = ['Rough', 'Poor', 'Okay', 'Good', 'Great'] as const

type SleepCardProps = {
  loading: boolean
  failed: boolean
  entries: SleepEntry[] | null
  today: string
  openFormNonce?: number
  onLog: (payload: SleepEntryPayload) => Promise<void>
  onRetry: () => void
}

function qualityClass(quality?: number | null): string {
  if (!quality) return 'q-none'
  return `q-${quality}`
}

function SleepCard({ loading, failed, entries, today, openFormNonce, onLog, onRetry }: SleepCardProps) {
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    if (openFormNonce) setFormOpen(true)
  }, [openFormNonce])
  const [bedtime, setBedtime] = useState('23:30')
  const [wakeTime, setWakeTime] = useState('07:00')
  const [quality, setQuality] = useState<number>(3)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const week = useMemo(() => lastNDates(7, today), [today])
  const byDate = useMemo(() => new Map((entries ?? []).map((e) => [e.date, e])), [entries])

  const lastNight = byDate.get(today) ?? null
  const latest = lastNight ?? (entries && entries.length > 0 ? entries[entries.length - 1] : null)

  const loggedThisWeek = week.map((d) => byDate.get(d)).filter((e): e is SleepEntry => Boolean(e))
  const avgMinutes =
    loggedThisWeek.length > 0
      ? Math.round(loggedThisWeek.reduce((sum, e) => sum + e.durationMinutes, 0) / loggedThisWeek.length)
      : null
  const debtMinutes =
    loggedThisWeek.length > 0
      ? loggedThisWeek.reduce((sum, e) => sum + (SLEEP_TARGET_MINUTES - e.durationMinutes), 0)
      : null

  const maxBar = Math.max(SLEEP_TARGET_MINUTES, ...loggedThisWeek.map((e) => e.durationMinutes), 1)

  const submit = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onLog({
        date: today,
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
        <span className="home-card-eyebrow">Sleep</span>
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
            <div className="home-sleep-lastnight">
              <b>{formatMinutes(latest.durationMinutes)}</b>
              <span
                className={cn('home-sleep-quality-dot', qualityClass(latest.quality))}
                title={latest.quality ? `Quality: ${QUALITY_LABELS[latest.quality - 1]}` : 'Quality not set'}
              />
              <small>
                {latest.date === today ? 'last night' : `latest · ${latest.date}`}
                {' · '}
                {latest.bedtime} → {latest.wakeTime}
              </small>
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
                  {saving ? 'Saving…' : lastNight ? 'Update night' : 'Save night'}
                </button>
              </div>
            </div>
          )}

          {(entries?.length ?? 0) > 0 && (
            <>
              <div className="home-sleep-chart" role="img" aria-label="Sleep duration for the last 7 nights">
                <span
                  className="home-sleep-target-line"
                  style={{ bottom: `${(SLEEP_TARGET_MINUTES / maxBar) * 100}%` }}
                  data-label={`${SLEEP_TARGET_HOURS}h`}
                />
                {week.map((date) => {
                  const entry = byDate.get(date)
                  return (
                    <div key={date} className="home-sleep-col">
                      <div
                        className={cn('home-sleep-bar', entry && qualityClass(entry.quality), !entry && 'is-empty')}
                        style={{ height: entry ? `${(entry.durationMinutes / maxBar) * 100}%` : undefined }}
                        title={entry ? `${date}: ${formatMinutes(entry.durationMinutes)}` : `${date}: not logged`}
                      />
                      <small>{weekdayLetter(date)}</small>
                    </div>
                  )
                })}
              </div>
              <footer className="home-sleep-stats">
                <span>
                  <b>{avgMinutes != null ? formatMinutes(avgMinutes) : '—'}</b>
                  <small>avg this week</small>
                </span>
                <span>
                  <b className={cn(debtMinutes != null && debtMinutes > 0 && 'is-watch')}>
                    {debtMinutes == null
                      ? '—'
                      : debtMinutes > 0
                        ? `−${formatMinutes(debtMinutes)}`
                        : `+${formatMinutes(Math.abs(debtMinutes))}`}
                  </b>
                  <small>vs {SLEEP_TARGET_HOURS}h target</small>
                </span>
                <span>
                  <b>{loggedThisWeek.length}/7</b>
                  <small>nights logged</small>
                </span>
              </footer>
            </>
          )}
        </>
      )}
    </section>
  )
}

export { SleepCard }
