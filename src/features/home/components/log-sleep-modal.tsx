import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Moon, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SleepEntryPayload } from '@/types/sleep'
import { useConfirmClose } from '@/hooks/use-confirm-close'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { formatMinutes, shortDayLabel, SLEEP_TARGET_HOURS, SLEEP_TARGET_MINUTES } from '../home-types'
import type { SleepSummary } from '../sleep-summary'
import './log-sleep-modal.css'

const QUALITY_LABELS = ['Rough', 'Poor', 'Okay', 'Good', 'Great'] as const

const DEFAULT_BEDTIME = '23:30'
const DEFAULT_WAKE = '07:00'
const DEFAULT_QUALITY = 3

/** Minutes from bedtime to wake, wrapping past midnight; null on an unparsable time. */
function nightMinutes(bedtime: string, wakeTime: string): number | null {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  if ([bh, bm, wh, wm].some(Number.isNaN)) return null
  const diff = (wh * 60 + wm - (bh * 60 + bm) + 1440) % 1440
  // 0 means bedtime == wake time — not a night.
  return diff === 0 ? null : diff
}

type LogSleepModalProps = {
  open: boolean
  today: string
  /** The Home sleep read, so picking a date pre-fills what's already logged for it. */
  summary: SleepSummary
  /** `entryId` is set when saving should move an existing entry rather than create one. */
  onLog: (payload: SleepEntryPayload, entryId?: string) => Promise<void>
  onClose: () => void
}

/**
 * Dedicated night-logging form: which morning, bedtime, wake time, a live
 * duration read against the nightly target, a labelled quality rating and a
 * note. A night is keyed by the date you woke up, so the date field says so
 * — "Night of" read as the bedtime date and filed last night under yesterday.
 */
function LogSleepModal({ open, today, summary, onLog, onClose }: LogSleepModalProps) {
  const [date, setDate] = useState(today)
  const [bedtime, setBedtime] = useState(DEFAULT_BEDTIME)
  const [wakeTime, setWakeTime] = useState(DEFAULT_WAKE)
  const [quality, setQuality] = useState<number>(DEFAULT_QUALITY)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { byDate } = summary
  const existing = byDate.get(date)

  // Every open starts on today; the fields then follow the chosen date, showing
  // whatever is already logged for it so "Update" edits rather than duplicates.
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(today)
    setError('')
  }, [open, today])

  useEffect(() => {
    if (!open) return
    const entry = byDate.get(date)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBedtime(entry?.bedtime ?? DEFAULT_BEDTIME)
    setWakeTime(entry?.wakeTime ?? DEFAULT_WAKE)
    setQuality(entry?.quality ?? DEFAULT_QUALITY)
    setNote(entry?.note ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date])

  const minutes = useMemo(() => nightMinutes(bedtime, wakeTime), [bedtime, wakeTime])

  const isDirty =
    bedtime !== (existing?.bedtime ?? DEFAULT_BEDTIME) ||
    wakeTime !== (existing?.wakeTime ?? DEFAULT_WAKE) ||
    quality !== (existing?.quality ?? DEFAULT_QUALITY) ||
    note.trim() !== (existing?.note ?? '')
  const { requestClose, dialog: confirmCloseDialog } = useConfirmClose(isDirty && !saving, onClose)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, requestClose])

  if (!open) return null

  const delta = minutes == null ? null : minutes - SLEEP_TARGET_MINUTES
  const deltaLabel = (() => {
    if (delta == null) return 'Wake time must differ from bedtime'
    if (delta === 0) return 'on target'
    return `${delta > 0 ? '+' : '−'}${formatMinutes(Math.abs(delta))} vs ${SLEEP_TARGET_HOURS}h`
  })()

  const submit = async () => {
    if (saving || minutes == null) return
    setSaving(true)
    setError('')
    try {
      await onLog(
        {
          date,
          bedtime,
          wakeTime,
          quality,
          note: note.trim() || undefined,
          source: 'manual',
        },
        // An entry re-attributed to this date still sits on another one in
        // storage; update it in place so saving moves it instead of duplicating.
        existing && existing.storedDate !== date ? existing.id : undefined,
      )
      toast.success(existing ? 'Night updated.' : `${formatMinutes(minutes)} logged. Sleep well tonight too.`)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save this night — try again.'))
    } finally {
      setSaving(false)
    }
  }

  const titleId = 'home-sleep-modal-title'

  return createPortal(
    <>
      <div className="home-sleep-modal-backdrop" role="presentation" onClick={requestClose}>
        <form
          className="home-sleep-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <header className="home-sleep-modal-head">
            <div>
              <span className="home-card-eyebrow">
                <Moon size={11} strokeWidth={2.5} /> Sleep
              </span>
              <h2 id={titleId}>
                {existing ? 'Update this night' : date === today ? 'Log last night' : `Log the night before ${shortDayLabel(date)}`}
              </h2>
            </div>
            <button type="button" className="home-sleep-modal-close" onClick={requestClose} aria-label="Close">
              <X size={15} />
            </button>
          </header>

          <div className="home-sleep-modal-body">
            <div className="home-sleep-modal-fields">
              <label>
                <span>Woke up on</span>
                <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} autoFocus />
              </label>
              <label>
                <span>Bedtime</span>
                <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
              </label>
              <label>
                <span>Woke up</span>
                <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
              </label>
            </div>

            <div className="home-sleep-modal-duration" aria-live="polite">
              <div>
                <strong>{minutes == null ? '—' : formatMinutes(minutes)}</strong>
                <small>
                  {bedtime} → {wakeTime}
                  {existing && existing.storedDate === date ? ' · replaces what’s logged' : ''}
                </small>
              </div>
              <span
                className={cn(
                  'home-sleep-modal-delta',
                  minutes == null ? 'is-invalid' : delta != null && delta < 0 && 'is-short',
                )}
              >
                {deltaLabel}
              </span>
            </div>

            <div className="home-sleep-modal-quality" role="radiogroup" aria-label="How did you sleep?">
              <span>How was it?</span>
              <div>
                {QUALITY_LABELS.map((label, index) => {
                  const value = index + 1
                  return (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={quality === value}
                      className={`q-${value}`}
                      onClick={() => setQuality(value)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="home-sleep-modal-note">
              <span>Note <em style={{ fontStyle: 'normal', opacity: 0.6 }}>· optional</em></span>
              <input
                type="text"
                placeholder="Woke up twice, late coffee, new pillow…"
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>

          <footer className="home-sleep-modal-foot">
            {error ? (
              <p className="home-sleep-modal-hint is-error" role="alert">{error}</p>
            ) : (
              <p className="home-sleep-modal-hint">Nights are filed under the morning you woke up.</p>
            )}
            <div className="home-sleep-modal-actions">
              <button type="button" className="home-btn-quiet" onClick={requestClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="home-btn-primary" disabled={saving || minutes == null}>
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? 'Saving…' : existing ? 'Update night' : 'Save night'}
              </button>
            </div>
          </footer>
        </form>
      </div>
      {confirmCloseDialog}
    </>,
    document.body,
  )
}

export { LogSleepModal }
