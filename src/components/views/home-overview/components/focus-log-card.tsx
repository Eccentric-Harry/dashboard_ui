import { useMemo, useState } from 'react'
import { CalendarClock, Check, Flame, Plus, X } from 'lucide-react'
import type { FocusSuggestion } from '../../../../types/focus'
import type { FocusLogPayload } from '../../../../types/focus'
import { cn } from '../../../../lib/utils'
import { formatMinutes, shortDayLabel } from '../home-types'

type FocusLogCardProps = {
  today: string
  /** Days in the window carrying focus data, out of the window length. */
  coverage: { logged: number; total: number }
  /** Total focus minutes actually logged across the window. */
  loggedMinutes: number
  suggestions: FocusSuggestion[]
  suggestionsFailed: boolean
  onLog: (payload: FocusLogPayload) => Promise<void>
  onImport: (occurrenceIds: string[]) => Promise<void>
}

const QUICK_MINUTES = [30, 60, 90, 120]

function FocusLogCard({
  today,
  coverage,
  loggedMinutes,
  suggestions,
  suggestionsFailed,
  onLog,
  onImport,
}: FocusLogCardProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [date, setDate] = useState(today)
  const [minutes, setMinutes] = useState<number | ''>(60)
  const [pursuit, setPursuit] = useState('')
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [importing, setImporting] = useState(false)

  const gap = coverage.total - coverage.logged
  const suggestedMinutes = useMemo(
    () => suggestions.reduce((total, s) => total + s.minutes, 0),
    [suggestions],
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submitLog = async () => {
    if (!minutes || minutes <= 0 || saving) return
    setSaving(true)
    try {
      await onLog({
        date,
        minutes: Number(minutes),
        activePursuit: pursuit.trim() || undefined,
      })
      setFormOpen(false)
      setPursuit('')
      setMinutes(60)
      setDate(today)
    } finally {
      setSaving(false)
    }
  }

  const runImport = async (ids: string[]) => {
    if (ids.length === 0 || importing) return
    setImporting(true)
    try {
      await onImport(ids)
      setSelected(new Set())
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="home-card home-card--focuslog" aria-label="Focus log">
      <Flame className="home-card-glyph" aria-hidden="true" />
      <header className="home-card-head">
        <div>
          <span className="home-card-eyebrow">Focus log</span>
          <h2 className="home-card-title">Work the timer missed</h2>
        </div>
        <button type="button" className="home-btn-quiet" onClick={() => setFormOpen((o) => !o)}>
          {formOpen ? <X size={13} /> : <Plus size={13} />}
          {formOpen ? 'Close' : 'Log focus'}
        </button>
      </header>

      {/* Coverage is stated plainly: the insights are only as good as this number. */}
      <div className="home-focus-coverage">
        <div className="home-focus-coverage-bar" aria-hidden="true">
          {Array.from({ length: coverage.total }).map((_, i) => (
            <span key={i} className={cn('home-focus-tick', i < coverage.logged && 'is-logged')} />
          ))}
        </div>
        <p>
          <strong>
            {coverage.logged}/{coverage.total} days
          </strong>{' '}
          logged · {formatMinutes(loggedMinutes)} recorded
          {gap > 0 && (
            <>
              {' '}
              — <em>{gap} day{gap === 1 ? '' : 's'} unknown, not counted as zero.</em>
            </>
          )}
        </p>
      </div>

      {formOpen && (
        <div className="home-focus-form">
          <div className="home-focus-form-row">
            <label>
              <span>Date</span>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              <span>Minutes</span>
              <input
                type="number"
                min={1}
                max={960}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </label>
          </div>
          <div className="home-focus-quick" role="group" aria-label="Quick durations">
            {QUICK_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                className={cn('home-focus-chip', minutes === m && 'is-active')}
                onClick={() => setMinutes(m)}
              >
                {formatMinutes(m)}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="home-focus-pursuit"
            placeholder="What were you working on? (optional)"
            maxLength={120}
            value={pursuit}
            onChange={(e) => setPursuit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submitLog()
            }}
          />
          <button
            type="button"
            className="home-btn-primary"
            disabled={!minutes || saving}
            onClick={() => void submitLog()}
          >
            <Check size={13} />
            {saving ? 'Saving…' : 'Log it'}
          </button>
        </div>
      )}

      <div className="home-focus-suggestions">
        <span className="home-card-eyebrow">
          <CalendarClock size={11} strokeWidth={2.4} aria-hidden="true" /> From your calendar
        </span>

        {suggestionsFailed ? (
          <p className="home-focus-empty">Couldn't read your calendar just now.</p>
        ) : suggestions.length === 0 ? (
          <p className="home-focus-empty">
            No unimported blocks in this window. Timed events on your calendar — native or
            Google-synced — show up here to confirm.
          </p>
        ) : (
          <>
            <p className="home-focus-hint">
              {suggestions.length} block{suggestions.length === 1 ? '' : 's'} ·{' '}
              {formatMinutes(suggestedMinutes)}. Confirm the ones you actually focused in — a booked
              block isn't proof of deep work, so nothing is imported on its own.
            </p>
            <ul className="home-focus-list">
              {suggestions.map((s) => (
                <li key={s.occurrenceId}>
                  <button
                    type="button"
                    className={cn('home-focus-sugg', selected.has(s.occurrenceId) && 'is-selected')}
                    aria-pressed={selected.has(s.occurrenceId)}
                    onClick={() => toggle(s.occurrenceId)}
                  >
                    <span className="home-focus-sugg-check" aria-hidden="true">
                      {selected.has(s.occurrenceId) && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className="home-focus-sugg-text">
                      <b>{s.title}</b>
                      <small>
                        {shortDayLabel(s.date)} · {s.startTime}–{s.endTime}
                        {s.origin === 'GOOGLE' && <em> · Google</em>}
                      </small>
                    </span>
                    <span className="home-focus-sugg-min">{formatMinutes(s.minutes)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="home-focus-actions">
              <button
                type="button"
                className="home-btn-primary"
                disabled={selected.size === 0 || importing}
                onClick={() => void runImport([...selected])}
              >
                <Check size={13} />
                {importing ? 'Importing…' : `Import ${selected.size || ''}`.trim()}
              </button>
              <button
                type="button"
                className="home-btn-quiet"
                disabled={importing}
                onClick={() => void runImport(suggestions.map((s) => s.occurrenceId))}
              >
                Import all
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export { FocusLogCard }
