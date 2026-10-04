import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, SkipForward, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CampSheet } from '../components/camp-sheet'
import { campSound } from '../camp-sound'
import { BUNDLE_TIP, type IntervalKind, type RunSession } from './program-content'
import { nextRun, type ProgramCtx } from './program-engine'
import type { LighthouseApi } from './lighthouse-api'
import { formatClock, say, useStopwatch, useWakeLock } from './lh-utils'

type RunCoachProps = {
  open: boolean
  origin: HTMLElement | null
  ctx: ProgramCtx | null
  api: LighthouseApi
  onClose: () => void
}

const WORD: Record<IntervalKind, string> = { warm: 'Warm-up walk', run: 'Run', walk: 'Walk', cool: 'Cool-down walk' }
const CUE: Record<IntervalKind, string> = { warm: 'Brisk walk to warm up.', run: 'Run now.', walk: 'Walk.', cool: 'Last part. Walk it out.' }

/**
 * The Couch to 5K coach: today's intervals as a big countdown, with a chime, a spoken cue
 * and a buzz at every change so the phone can stay in a pocket, and the screen kept awake.
 * Finishing logs the run (and moves the plan on); stopping early logs what you did as the
 * small version — never "incomplete".
 */
function RunCoach({ open, origin, ctx, api, onClose }: RunCoachProps) {
  const [session, setSession] = useState<RunSession | null>(null)
  const [wasOpen, setWasOpen] = useState(false)
  // Mid-run, a stray tap on the scrim mustn't throw the run away.
  const midRun = useRef(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open && ctx) setSession(nextRun(ctx.logs))
  }
  const requestClose = () => {
    if (midRun.current && !window.confirm('Stop the coach? The run so far isn’t logged until you log it.')) return
    midRun.current = false
    onClose()
  }

  return (
    <CampSheet open={open && !!session} onRequestClose={requestClose} origin={origin} labelledBy="lh-coach-title" width={520} color="tangerine">
      {session && ctx && (
        <CoachBody
          session={session}
          ctx={ctx}
          api={api}
          onActive={(on) => {
            midRun.current = on
          }}
          onClose={() => {
            midRun.current = false
            onClose()
          }}
          onRequestClose={requestClose}
        />
      )}
    </CampSheet>
  )
}

type CoachBodyProps = {
  session: RunSession
  ctx: ProgramCtx
  api: LighthouseApi
  /** True while a run is under way and not yet logged. */
  onActive: (on: boolean) => void
  onClose: () => void
  onRequestClose: () => void
}

function CoachBody({ session, ctx, api, onActive, onClose, onRequestClose }: CoachBodyProps) {
  const watch = useStopwatch()
  const [feel, setFeel] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const total = useMemo(() => session.intervals.reduce((n, i) => n + i.sec, 0), [session])
  const elapsed = Math.min(total, watch.elapsed)
  const finished = elapsed >= total
  useWakeLock(watch.running)
  useEffect(() => onActive(elapsed > 0), [elapsed > 0, onActive]) // eslint-disable-line react-hooks/exhaustive-deps

  let acc = 0
  let idx = session.intervals.length - 1
  for (let i = 0; i < session.intervals.length; i++) {
    if (elapsed < acc + session.intervals[i].sec) {
      idx = i
      break
    }
    acc += session.intervals[i].sec
  }
  const current = session.intervals[idx]
  const intervalStart = session.intervals.slice(0, idx).reduce((n, i) => n + i.sec, 0)
  const intervalLeft = finished ? 0 : intervalStart + current.sec - elapsed
  const intervalPct = finished ? 1 : (elapsed - intervalStart) / current.sec

  // A cue at every change: chime, voice, buzz.
  const lastIdx = useRef(-1)
  useEffect(() => {
    if (!watch.running && elapsed === 0) return
    if (finished) {
      if (lastIdx.current !== -2) {
        lastIdx.current = -2
        watch.pause()
        campSound.play('week-kept')
        say('Done. That’s the run.')
        if (navigator.vibrate) navigator.vibrate([60, 80, 60, 80, 120])
      }
      return
    }
    if (idx !== lastIdx.current) {
      // The first interval's cue comes from the Start button.
      if (lastIdx.current >= 0) {
        campSound.bell(current.kind === 'run' ? 2 : 1)
        say(CUE[current.kind])
        if (navigator.vibrate) navigator.vibrate(current.kind === 'run' ? [40, 60, 40] : [80])
      }
      lastIdx.current = idx
    }
  }, [idx, finished, watch, elapsed, current.kind])

  const skip = () => {
    campSound.play('tap')
    watch.seek(intervalStart + current.sec)
  }

  const log = async (level: 'FULL' | 'MIN') => {
    setSaving(true)
    const minutes = Math.max(1, Math.round(elapsed / 60))
    const saved = await api.addLog(
      { track: 'run', date: ctx.today, level, minutes, feel, session: level === 'FULL' ? session.key : null },
      { anchor: document.querySelector<HTMLElement>('[data-track-card="run"]'), detail: `Week ${session.week} · run ${session.run}` },
    )
    setSaving(false)
    if (saved) onClose()
  }

  const ring = 2 * Math.PI * 92
  const runSoFar = session.intervals.slice(0, idx).filter((i) => i.kind === 'run').reduce((n, i) => n + i.sec, 0) + (current.kind === 'run' ? elapsed - intervalStart : 0)

  return (
    <div className="lh-sheet lh-coach" data-color="tangerine" data-kind={finished ? 'done' : current.kind}>
      <header className="lh-sheet-head">
        <div className="lh-sheet-title">
          <h2 id="lh-coach-title">
            Week {session.week} · run {session.run}
          </h2>
          <p>{session.summary}</p>
        </div>
        <button type="button" className="cs-icon" onClick={onRequestClose} aria-label="Close the coach" data-autofocus>
          <X size={18} strokeWidth={2.6} />
        </button>
      </header>

      <div className="lh-coach-dial">
        <svg viewBox="0 0 220 220" aria-hidden="true">
          <circle className="lh-coach-track" cx="110" cy="110" r="92" />
          <circle
            className="lh-coach-fill"
            cx="110"
            cy="110"
            r="92"
            strokeDasharray={`${ring * intervalPct} ${ring}`}
            transform="rotate(-90 110 110)"
          />
        </svg>
        <div className="lh-coach-read" aria-live="polite">
          <span className="lh-coach-word">{finished ? 'Done' : WORD[current.kind]}</span>
          <strong>{formatClock(intervalLeft)}</strong>
          <small>
            {formatClock(total - elapsed)} left · {Math.floor(runSoFar / 60)} min run so far
          </small>
        </div>
      </div>

      <ol className="lh-coach-strip" aria-label="Today's intervals">
        {session.intervals.map((iv, i) => (
          <li key={i} className={cn(`is-${iv.kind}`, i < idx && 'is-past', i === idx && !finished && 'is-now')} style={{ flexGrow: iv.sec }} />
        ))}
      </ol>

      {finished || (!watch.running && elapsed > 60) ? (
        <div className="lh-coach-end">
          <p className="lh-kicker">{finished ? 'How did it feel?' : 'Stopping here? What you did still counts.'}</p>
          <div className="lh-chips">
            {['Rough', 'Hard', 'Okay', 'Good', 'Great'].map((w, i) => (
              <button key={w} type="button" className={cn('lh-chip', feel === i + 1 && 'is-on')} onClick={() => setFeel(feel === i + 1 ? null : i + 1)}>
                {w}
              </button>
            ))}
          </div>
          <div className="lh-row">
            {finished ? (
              <button type="button" className="lh-btn lh-btn--primary lh-btn--wide" disabled={saving} onClick={() => void log('FULL')}>
                Log the run
              </button>
            ) : (
              <>
                <button type="button" className="lh-btn lh-btn--soft" onClick={watch.start}>
                  <Play size={16} strokeWidth={2.8} aria-hidden="true" /> Keep going
                </button>
                <button type="button" className="lh-btn lh-btn--primary" disabled={saving} onClick={() => void log('MIN')}>
                  Log {Math.max(1, Math.round(elapsed / 60))} min as the small version
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="lh-coach-controls">
          {watch.running ? (
            <button type="button" className="lh-btn lh-btn--soft lh-btn--lg" onClick={watch.pause}>
              <Pause size={18} strokeWidth={2.8} aria-hidden="true" /> Pause
            </button>
          ) : (
            <button
              type="button"
              className="lh-btn lh-btn--candy lh-btn--lg"
              onClick={() => {
                if (elapsed === 0) {
                  say(CUE[current.kind])
                  campSound.bell(1)
                }
                watch.start()
              }}
            >
              <Play size={18} strokeWidth={2.8} aria-hidden="true" /> {elapsed > 0 ? 'Resume' : 'Start'}
            </button>
          )}
          <button type="button" className="lh-btn lh-btn--ghost" onClick={skip} disabled={elapsed === 0}>
            <SkipForward size={16} strokeWidth={2.8} aria-hidden="true" /> Skip
          </button>
        </div>
      )}
      <p className="lh-small lh-center">{BUNDLE_TIP}</p>
    </div>
  )
}

export { RunCoach }
