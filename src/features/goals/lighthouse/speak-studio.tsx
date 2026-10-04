import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Mic, Pause, Play, Square, Trash2 } from 'lucide-react'
import { useProgramStore } from '@/store/program-store'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'
import { campSound } from '../camp-sound'
import { MEETING_LADDER, PREP, SHADOW_HOW, SPEAK_PROMPTS } from './program-content'
import { dayNumber, logsOn, weekDates, weekStartOf, type ProgramCtx } from './program-engine'
import type { LighthouseApi } from './lighthouse-api'
import { Stepper } from './lh-ui'
import { blobToDataUrl, dayMonth, formatClock, useMediaUrl, useStopwatch, useWakeLock } from './lh-utils'

type SpeakStudioProps = {
  ctx: ProgramCtx
  api: LighthouseApi
  busy: boolean
}

const TIMERS = [
  { key: 'shadow', label: 'Shadow', minutes: 10 },
  { key: 'speak', label: 'Speak freely', minutes: 5 },
] as const
type TimerKey = (typeof TIMERS)[number]['key']

const RECORD_SEC = 120

/**
 * The speaking studio: today's prompt in PREP shape, two timers (10 minutes shadowing, 5
 * minutes speaking freely — each logs its minutes when it ends), the weekly 2-minute
 * recording you can compare with week one, and this week's rung on the meeting ladder.
 * Minutes spoken out loud are what count, never minutes listened.
 */
function SpeakStudio({ ctx, api, busy }: SpeakStudioProps) {
  const day = Math.max(1, dayNumber(ctx.program, ctx.today))
  const prompt = SPEAK_PROMPTS[(day - 1) % SPEAK_PROMPTS.length]
  const todayMinutes = logsOn(ctx.logs, 'english', ctx.today).reduce((n, l) => n + (l.minutes ?? 0), 0)
  const [timer, setTimer] = useState<TimerKey>('shadow')
  const watch = useStopwatch()
  const total = (TIMERS.find((t) => t.key === timer)?.minutes ?? 10) * 60
  const remaining = total - watch.elapsed
  const [manual, setManual] = useState(15)
  const loggedRef = useRef(false)
  useWakeLock(watch.running)

  const logMinutes = async (minutes: number, session: string) => {
    if (minutes < 1) return
    await api.addLog({ track: 'english', date: ctx.today, minutes, session }, { detail: `${minutes} minutes out loud` })
  }

  // A timer that runs out logs itself, once.
  useEffect(() => {
    if (!watch.running || remaining > 0 || loggedRef.current) return
    loggedRef.current = true
    watch.pause()
    campSound.bell(2)
    if (navigator.vibrate) navigator.vibrate([30, 60, 30])
    void logMinutes(Math.round(total / 60), timer).then(() => watch.reset())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, watch.running])

  const startTimer = () => {
    loggedRef.current = false
    campSound.play('tap')
    watch.start()
  }

  const stopAndLog = async () => {
    const minutes = Math.floor(watch.elapsed / 60)
    loggedRef.current = true
    watch.reset()
    if (minutes >= 1) await logMinutes(minutes, timer)
    else toast('Under a minute — not logged. Every minute counts once it’s a minute.')
  }

  // This week's rung on the meeting ladder.
  const stretches = ctx.logs.filter((l) => l.track === 'english' && l.stretch)
  const thisWeek = weekDates(weekStartOf(ctx.today))
  const stretchedThisWeek = stretches.some((l) => thisWeek.includes(l.date))
  const rung = Math.min(MEETING_LADDER.length - 1, stretches.length - (stretchedThisWeek ? 1 : 0))

  return (
    <div className="lh-studio">
      <section className="lh-prompt" aria-label="Today's prompt">
        <p className="lh-kicker">Today’s prompt · day {day}</p>
        <p className="lh-prompt-text">{prompt}</p>
        <ol className="lh-prep" aria-label="PREP: point, reason, example, point">
          {PREP.map((s, i) => (
            <li key={i} title={s.line}>
              <b>{s.letter}</b>
              {s.word}
            </li>
          ))}
        </ol>
      </section>

      <section className="lh-timer-box" aria-label="Speaking timers">
        <div className="lh-timer-tabs">
          {TIMERS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={cn('lh-chip', timer === t.key && 'is-on')}
              disabled={watch.running || watch.elapsed > 0}
              onClick={() => setTimer(t.key)}
            >
              {t.label} · {t.minutes} min
            </button>
          ))}
        </div>
        <div className="lh-timer-row">
          <span className={cn('lh-timer-clock', watch.running && 'is-running')}>{formatClock(remaining)}</span>
          {watch.running ? (
            <button type="button" className="lh-btn lh-btn--soft" onClick={watch.pause}>
              <Pause size={16} strokeWidth={2.8} aria-hidden="true" /> Pause
            </button>
          ) : (
            <button type="button" className="lh-btn lh-btn--candy" onClick={startTimer} disabled={busy}>
              <Play size={16} strokeWidth={2.8} aria-hidden="true" /> {watch.elapsed > 0 ? 'Resume' : 'Start'}
            </button>
          )}
          {watch.elapsed >= 1 && (
            <button type="button" className="lh-btn lh-btn--ghost" onClick={() => void stopAndLog()}>
              <Square size={14} strokeWidth={2.8} aria-hidden="true" /> Stop & log
            </button>
          )}
        </div>
        {timer === 'shadow' ? (
          <details className="lh-how">
            <summary>How to shadow</summary>
            <ol>
              {SHADOW_HOW.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </details>
        ) : (
          <p className="lh-small">Talk through the prompt above, out loud, in PREP shape. Stumbling is the practice.</p>
        )}
        <p className="lh-small">
          Today: <b>{todayMinutes} min</b> spoken
        </p>
      </section>

      <section className="lh-studio-log" aria-label="Log minutes by hand">
        <Stepper value={manual} onChange={setManual} step={5} min={1} max={120} unit="min" label="minutes spoken" />
        <button type="button" className="lh-btn lh-btn--soft" disabled={busy} onClick={() => void logMinutes(manual, 'free')}>
          Log minutes
        </button>
        <button
          type="button"
          className="lh-btn lh-btn--ghost"
          disabled={busy}
          onClick={() => void api.addLog({ track: 'english', date: ctx.today, level: 'MIN', minutes: 5, session: 'read-aloud' })}
        >
          Small version: read aloud 5 min
        </button>
      </section>

      <Recorder ctx={ctx} api={api} />

      <section className="lh-ladder" aria-label="The meeting ladder">
        <p className="lh-kicker">This week’s stretch · rung {rung + 1} of {MEETING_LADDER.length}</p>
        <p className="lh-ladder-rung">{MEETING_LADDER[rung]}</p>
        {stretchedThisWeek ? (
          <p className="lh-done-line">
            <Check size={15} strokeWidth={3} aria-hidden="true" /> Done this week — next week, the next rung.
          </p>
        ) : (
          <button
            type="button"
            className="lh-btn lh-btn--candy"
            disabled={busy}
            onClick={() => void api.addLog({ track: 'english', date: ctx.today, stretch: true, note: MEETING_LADDER[rung] })}
          >
            I did it in a meeting
          </button>
        )}
      </section>
    </div>
  )
}

/** The weekly two-minute recording: record, listen, keep — and hear week one beside it. */
function Recorder({ ctx, api }: { ctx: ProgramCtx; api: LighthouseApi }) {
  const recordings = useRecordings()
  const [state, setState] = useState<'idle' | 'recording' | 'review' | 'saving'>('idle')
  const [clip, setClip] = useState<{ url: string; blob: Blob; sec: number } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const started = useRef(0)
  const tick = useRef<number | null>(null)
  const supported = typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia
  const thisWeek = weekDates(weekStartOf(ctx.today))
  const recordedThisWeek = recordings.some((m) => thisWeek.includes(m.date))
  useWakeLock(state === 'recording')

  useEffect(
    () => () => {
      if (tick.current != null) window.clearInterval(tick.current)
      recorder.current?.stream.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  const stop = () => {
    if (tick.current != null) window.clearInterval(tick.current)
    tick.current = null
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported(m))
      const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 48_000 })
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' })
        const sec = Math.round((performance.now() - started.current) / 1000)
        setClip({ url: URL.createObjectURL(blob), blob, sec })
        setState('review')
      }
      recorder.current = rec
      started.current = performance.now()
      setElapsed(0)
      rec.start()
      setState('recording')
      campSound.play('tap')
      tick.current = window.setInterval(() => {
        const s = (performance.now() - started.current) / 1000
        setElapsed(s)
        if (s >= RECORD_SEC) stop()
      }, 250)
    } catch (err) {
      toast.error(getErrorMessage(err, 'The microphone isn’t available — check the browser’s permission.'))
    }
  }

  const save = async () => {
    if (!clip) return
    setState('saving')
    try {
      const dataUrl = await blobToDataUrl(clip.blob)
      const saved = await api.addMedia({ kind: 'AUDIO', label: 'speech', date: ctx.today, dataUrl, durationSec: clip.sec })
      if (saved) {
        URL.revokeObjectURL(clip.url)
        setClip(null)
        setState('idle')
        return
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Couldn’t save that recording.'))
    }
    setState('review')
  }

  const discard = () => {
    if (clip) URL.revokeObjectURL(clip.url)
    setClip(null)
    setState('idle')
  }

  const first = recordings[0]
  const latest = recordings.length > 1 ? recordings[recordings.length - 1] : null

  return (
    <section className="lh-recorder" aria-label="Weekly recording">
      <p className="lh-kicker">Weekly recording · 2 minutes {recordedThisWeek && '· done this week'}</p>
      {!supported ? (
        <p className="lh-small">This browser can’t record audio. Use your phone’s voice memos and log it as minutes.</p>
      ) : state === 'recording' ? (
        <div className="lh-rec-row">
          <span className="lh-rec-dot" aria-hidden="true" />
          <span className="lh-timer-clock is-running">{formatClock(RECORD_SEC - elapsed)}</span>
          <button type="button" className="lh-btn lh-btn--soft" onClick={stop}>
            <Square size={14} strokeWidth={2.8} aria-hidden="true" /> Stop
          </button>
        </div>
      ) : clip ? (
        <div className="lh-rec-row">
          <audio src={clip.url} controls preload="metadata" />
          <button type="button" className="lh-btn lh-btn--candy" onClick={() => void save()} disabled={state === 'saving'}>
            {state === 'saving' ? 'Saving…' : 'Keep it'}
          </button>
          <button type="button" className="lh-icon-btn" onClick={discard} aria-label="Discard this recording">
            <Trash2 size={15} strokeWidth={2.6} />
          </button>
        </div>
      ) : (
        <div className="lh-rec-row">
          <button type="button" className="lh-btn lh-btn--candy" onClick={() => void start()}>
            <Mic size={16} strokeWidth={2.8} aria-hidden="true" /> {recordedThisWeek ? 'Record another' : 'Record this week’s'}
          </button>
          <span className="lh-small">Talk through today’s prompt. You’ll hear the change by week 6.</span>
        </div>
      )}
      {first && (
        <div className="lh-rec-compare">
          <RecordingPlayer programId={ctx.program.id} mediaId={first.id} label={`First · ${dayMonth(first.date)}`} />
          {latest && <RecordingPlayer programId={ctx.program.id} mediaId={latest.id} label={`Latest · ${dayMonth(latest.date)}`} />}
        </div>
      )}
    </section>
  )
}

/** The program's recordings, oldest first, straight from the store. */
function useRecordings() {
  const media = useProgramStore.use.state().data?.media
  return (media ?? []).filter((m) => m.kind === 'AUDIO')
}

function RecordingPlayer({ programId, mediaId, label }: { programId: string; mediaId: string; label: string }) {
  const { url, failed } = useMediaUrl(programId, mediaId)
  return (
    <figure className="lh-rec-clip">
      <figcaption>{label}</figcaption>
      {url ? <audio src={url} controls preload="none" /> : <span className="lh-small">{failed ? 'Couldn’t load' : 'Loading…'}</span>}
    </figure>
  )
}

export { SpeakStudio, RecordingPlayer }
