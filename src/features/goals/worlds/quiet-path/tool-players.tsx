import { useEffect, useRef, useState } from 'react'
import { Check, Footprints, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { campSound } from '../../camp-sound'
import { breathPattern, cycleSecs, type BreathPatternKey } from './course'
import { BreathBubble } from './breath-bubble'
import { Kiri } from './kiri'

type CountIt = {
  busy: boolean
  /** Logs it as practice for today. */
  onLog: (minutes: number) => Promise<void>
  onClose: () => void
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
}

function Done({ minutes, busy, onLog, onClose, line }: CountIt & { minutes: number; line: string }) {
  const [logged, setLogged] = useState(false)
  return (
    <div className="sp-end">
      <Kiri className="sp-kiri" resting />
      <h2 id="tool-title" className="sp-closing">
        {line}
      </h2>
      {logged ? (
        <p className="sp-logged">
          <Check size={16} strokeWidth={3} /> In your notebook.
        </p>
      ) : (
        <button
          type="button"
          className="sp-cta"
          disabled={busy}
          onClick={() =>
            void onLog(minutes)
              .then(() => setLogged(true))
              .catch(() => undefined)
          }
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Footprints size={18} strokeWidth={2.6} />} Count it for today
        </button>
      )}
      <button type="button" className="sp-soft" onClick={onClose}>
        {logged ? 'Back to the path' : 'Not now'}
      </button>
    </div>
  )
}

/** Anytime → Breathe: one pattern, for as long as you like. */
function BreatheTool({ pattern, busy, onLog, onClose }: CountIt & { pattern: BreathPatternKey | null }) {
  const [minutes, setMinutes] = useState(3)
  const [stage, setStage] = useState<'choose' | 'go' | 'done'>('choose')
  const startedAt = useRef(0)
  const open = pattern != null
  useEscape(open, onClose)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStage('choose')
  }, [open, pattern])

  if (!pattern) return null
  const p = breathPattern(pattern)
  const cycles = Math.max(1, Math.round((minutes * 60) / cycleSecs(p)))
  const spent = () => Math.max(1, Math.round((performance.now() - startedAt.current) / 60_000))

  return (
    <div className={cn('sp sp--tool', `sp--${stage === 'go' ? 'steps' : stage === 'done' ? 'end' : 'intro'}`)} style={{ ['--ch' as string]: '#52b4ff', ['--ch-lip' as string]: '#2a8edd', ['--ch-soft' as string]: '#dbeeff' }} role="dialog" aria-modal="true" aria-labelledby="tool-title">
      <div className="sp-sky" aria-hidden="true" />
      <header className="sp-top">
        <button type="button" className="sp-x" onClick={onClose} aria-label="Close">
          <X size={20} strokeWidth={2.8} />
        </button>
      </header>
      <main className="sp-body">
        {stage === 'choose' && (
          <div className="sp-intro">
            <p className="sp-kicker">Breathe</p>
            <h2 id="tool-title">{p.name}</h2>
            <p className="sp-why">{p.blurb}</p>
            <div className="qa-chips qa-chips--dark" role="radiogroup" aria-label="How long">
              {[1, 3, 5, 10].map((m) => (
                <button key={m} type="button" role="radio" aria-checked={minutes === m} className={cn(minutes === m && 'is-on')} onClick={() => setMinutes(m)}>
                  {m} min
                </button>
              ))}
            </div>
            <button
              type="button"
              className="sp-cta"
              onClick={() => {
                startedAt.current = performance.now()
                setStage('go')
              }}
              autoFocus
            >
              Begin
            </button>
            <p className="sp-care">Breathe gently. If you feel light-headed, let your breath go back to normal.</p>
          </div>
        )}
        {stage === 'go' && (
          <div className="sp-breathe">
            <h2 id="tool-title" className="sr-only">
              {p.name}
            </h2>
            <BreathBubble
              pattern={pattern}
              cycles={cycles}
              running
              onDone={() => {
                campSound.play('bell')
                setStage('done')
              }}
            />
            <button type="button" className="sp-soft" onClick={() => setStage('done')}>
              I’m done
            </button>
          </div>
        )}
        {stage === 'done' && <Done minutes={spent()} busy={busy} onLog={onLog} onClose={onClose} line="Well breathed. That counts." />}
      </main>
    </div>
  )
}

/** Anytime → Sit quietly: a timer with a bell to start, optional interval bells, and three to end. */
function SitTimer({ sit, busy, onLog, onClose }: CountIt & { sit: { minutes: number; interval: number } | null }) {
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const open = sit != null
  useEscape(open, onClose)

  useEffect(() => {
    if (!sit) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDone(false)
    setElapsed(0)
    campSound.bell(1)
    const start = performance.now()
    const total = sit.minutes * 60
    let lastBell = 0
    const t = window.setInterval(() => {
      const secs = (performance.now() - start) / 1000
      setElapsed(secs)
      if (sit.interval > 0 && secs < total - 5) {
        const n = Math.floor(secs / (sit.interval * 60))
        if (n > lastBell) {
          lastBell = n
          campSound.bell(1)
        }
      }
      if (secs >= total) {
        window.clearInterval(t)
        campSound.bell(3)
        setDone(true)
      }
    }, 250)
    return () => window.clearInterval(t)
  }, [sit])

  if (!sit) return null
  const total = sit.minutes * 60
  const left = Math.max(0, total - elapsed)
  const mm = Math.floor(left / 60)
  const ss = Math.floor(left % 60)

  return (
    <div className={cn('sp sp--tool', done ? 'sp--end' : 'sp--steps')} style={{ ['--ch' as string]: '#2fc4be', ['--ch-lip' as string]: '#179f99', ['--ch-soft' as string]: '#d3f4f2' }} role="dialog" aria-modal="true" aria-labelledby="tool-title">
      <div className="sp-sky" aria-hidden="true" />
      <header className="sp-top">
        <button type="button" className="sp-x" onClick={onClose} aria-label="Close">
          <X size={20} strokeWidth={2.8} />
        </button>
      </header>
      <main className="sp-body">
        {done ? (
          <Done minutes={Math.max(1, Math.round(elapsed / 60))} busy={busy} onLog={onLog} onClose={onClose} line={`${sit.minutes} quiet minutes. Well sat.`} />
        ) : (
          <div className="sp-hold sp-hold--sit">
            <h2 id="tool-title" className="sp-say">
              Sit quietly. Let the breath do what it does.
            </h2>
            <div className="sp-ringbox">
              <svg className="sp-ring sp-ring--big" viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="52" className="sp-ring-track" />
                <circle cx="60" cy="60" r="52" className="sp-ring-fill" style={{ strokeDashoffset: `${326.7 * (1 - Math.min(1, elapsed / total))}` }} />
              </svg>
              <span className="sp-ring-time sp-ring-time--big">
                {mm}:{String(ss).padStart(2, '0')}
              </span>
            </div>
            <button
              type="button"
              className="sp-soft"
              onClick={() => {
                campSound.bell(1)
                setDone(true)
              }}
            >
              End early
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export { BreatheTool, SitTimer }
