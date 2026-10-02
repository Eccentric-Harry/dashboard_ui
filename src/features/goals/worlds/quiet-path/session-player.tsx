import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, Copy, Footprints, Loader2, Pause, Play, Volume2, VolumeX, Waves, X } from 'lucide-react'
import type { GoalKit, GoalKitPage } from '@/types/goals'
import { cn } from '@/lib/utils'
import { campSound, useSoundscape } from '../../camp-sound'
import type { PipStage } from '../../pip-growth'
import { CHAPTER_COLORS } from './path-data'
import { sayDuration, type Chapter, type Session, type SessionStep } from './course'
import { EMPTY_PAGE, kitPage } from './kit'
import { KitEditor } from './kit-editor'
import { speakerName, type Speaker } from './residents'
import { Portrait } from './resident-art'
import { BreathBubble } from './breath-bubble'
import { Kiri } from './kiri'
import { speech, useSpeechEnabled } from './speech'
import { SessionIcon } from './session-icon'

type SessionPlayerProps = {
  session: Session | null
  chapter: Chapter | null
  /** `walk`: this is today's stone. `replay`: a session done before, or a quick-help one. */
  mode: 'walk' | 'replay'
  busy: boolean
  /** The kit as it stands, so a kit stone opens with what's already packed. */
  kit?: GoalKit
  /** For Pip's portrait and name in stories. */
  pip?: { stage: PipStage; name: string; wear?: { hat?: string | null; neck?: string | null; face?: string | null } }
  /** Saves it (and the kit page, for a kit stone) — resolves when logged. */
  onFinish: (note: string, kit: GoalKitPage | null) => Promise<void>
  onClose: () => void
}

type Stage = 'intro' | 'steps' | 'end' | 'saved'

const stepText = (s: SessionStep) => {
  if (s.kind === 'fact') return `${s.title}. ${s.text}`
  if (s.kind === 'kit') return ''
  return 'text' in s && s.text ? s.text : ''
}

/** Stories and kit stones read as a conversation; practices one step at a time. */
const isTalk = (s: Session) => s.kind === 'story' || s.kind === 'kit'

/**
 * A guided session, full screen and quiet: an intro that says what it's for, then its steps
 * with a thick progress bar along the top. A practice goes one step at a time — lines that
 * move on by themselves, quiet stretches with a timer ring, the breathing bubble, things to
 * find and tap, a private scratch pad. A story plays like Duolingo's Stories: the place's
 * resident and Pip talk it through line by line, a research card, one gentle question with
 * no wrong answers. A kit stone ends with that chapter's kit page to fill in. Read-aloud
 * and the chapter's soundscape are one tap each. Pause or leave whenever — nothing is lost.
 */
function SessionPlayer({ session, chapter, mode, busy, kit, pip, onFinish, onClose }: SessionPlayerProps) {
  const [stage, setStage] = useState<Stage>('intro')
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [tapped, setTapped] = useState<Set<number>>(new Set())
  const [scratch, setScratch] = useState('')
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')
  const [picked, setPicked] = useState<Record<number, number>>({})
  const [draft, setDraft] = useState<GoalKitPage | null>(null)
  const voiceOn = useSpeechEnabled()
  const scape = useSoundscape()
  const open = session != null
  const stepStart = useRef(0)
  const talkRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStage('intro')
    setI(0)
    setPaused(false)
    setNote('')
    setPicked({})
    setDraft(session?.kit ? (kit?.[session.kit] ?? EMPTY_PAGE) : null)
    // The kit only seeds the draft when a session opens; later saves don't reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.id])

  const step = session?.steps[i]
  const auto =
    step?.kind === 'say' || step?.kind === 'line'
      ? sayDuration(step.text)
      : step?.kind === 'hold'
        ? step.secs
        : step?.kind === 'choice' && picked[i] != null
          ? sayDuration(step.options[picked[i]].reply)
          : null

  // A fresh step: reset its little bits of state, read it aloud (or let the speaker's voice blip).
  useEffect(() => {
    if (stage !== 'steps' || !step) return
    stepStart.current = performance.now()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setElapsed(0)
    setTapped(new Set())
    setScratch('')
    setCopied(false)
    speech.say(stepText(step))
    if (!speech.enabled && (step.kind === 'line' || step.kind === 'choice')) campSound.voice(step.who, step.text)
  }, [stage, i, step])

  // A story's newest line scrolls into view.
  useEffect(() => {
    const el = talkRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [i, picked, stage])

  // Lines and quiet stretches move on by themselves (unless paused).
  useEffect(() => {
    if (stage !== 'steps' || auto == null || paused) return
    const startedAt = performance.now() - elapsed * 1000
    const t = window.setInterval(() => {
      const secs = (performance.now() - startedAt) / 1000
      setElapsed(secs)
      if (secs >= auto) {
        window.clearInterval(t)
        next()
      }
    }, 200)
    return () => window.clearInterval(t)
    // `elapsed` only seeds a resume; including it would restart the timer every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, i, auto, paused])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') leave()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  useEffect(() => () => speech.stop(), [])

  if (!session || !chapter) return null
  const c = CHAPTER_COLORS[chapter.color]
  const total = session.steps.length
  const talk = isTalk(session)
  const host: Speaker = session.host ?? 'kiri'
  const nameOf = (who: Speaker) => (who === 'pip' ? (pip?.name ?? 'Pip') : speakerName(who))

  function next() {
    if (!session) return
    if (i + 1 >= session.steps.length) {
      speech.say(session.closing)
      setStage('end')
      campSound.play('bell')
      return
    }
    setI((n) => n + 1)
  }

  function leave() {
    speech.stop()
    onClose()
  }

  const begin = () => {
    setStage('steps')
    setI(0)
    campSound.play('tap')
  }

  const finish = async () => {
    try {
      await onFinish(note.trim(), draft)
      setStage('saved')
    } catch {
      // The world shows the reason; the button stays so it can be tried again.
    }
  }

  const toggleScape = () => {
    if (scape.kind) campSound.stopScape()
    else campSound.playScape(chapter.scape, 0.5)
  }

  const choose = (k: number, option: number) => {
    if (picked[k] != null) return
    const s = session.steps[k]
    setPicked((p) => ({ ...p, [k]: option }))
    setElapsed(0)
    campSound.play('pop', { step: option })
    if (s.kind === 'choice') {
      speech.say(s.options[option].reply)
      if (!speech.enabled) campSound.voice(s.who, s.options[option].reply)
    }
  }

  const progress = stage === 'intro' ? 0 : stage === 'steps' ? i / total : 1
  const kicker =
    session.kind === 'story'
      ? `Chapter ${chapter.n} · A story with ${nameOf(host)} · ${session.minutes} min`
      : session.kind === 'kit'
        ? `Chapter ${chapter.n} · Pack your kit · ${session.minutes} min`
        : `Chapter ${chapter.n} · ${chapter.theme} · ${session.minutes} min`

  /** One step of a story, as it sits in the conversation. */
  const talkStep = (s: SessionStep, k: number) => {
    const latest = k === i
    if (s.kind === 'line') {
      const right = s.who === 'pip'
      return (
        <div key={k} className={cn('sp-line', right && 'is-right', latest && 'is-latest')}>
          <span className="sp-line-face" aria-hidden="true">
            <Portrait who={s.who} talking={latest && stage === 'steps'} pip={pip} />
          </span>
          <p className="sp-line-bubble">
            <span className="sp-line-name">{nameOf(s.who)}</span>
            {s.text}
          </p>
        </div>
      )
    }
    if (s.kind === 'fact') {
      return (
        <section key={k} className={cn('sp-fact', latest && 'is-latest')} aria-label="What the research says">
          <p className="sp-fact-kicker">
            <BookOpen size={13} strokeWidth={2.8} aria-hidden="true" /> What the research says
          </p>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
          <small>{s.source}</small>
        </section>
      )
    }
    if (s.kind === 'choice') {
      const chosen = picked[k]
      return (
        <div key={k} className={cn('sp-choice', latest && 'is-latest')}>
          <div className="sp-line">
            <span className="sp-line-face" aria-hidden="true">
              <Portrait who={s.who} talking={latest && chosen == null && stage === 'steps'} pip={pip} />
            </span>
            <p className="sp-line-bubble">
              <span className="sp-line-name">{nameOf(s.who)}</span>
              {s.text}
            </p>
          </div>
          {chosen == null ? (
            <div className="sp-choice-options" role="group" aria-label={s.text}>
              {s.options.map((o, oi) => (
                <button key={o.label} type="button" className="sp-option" onClick={() => choose(k, oi)} disabled={!latest}>
                  {o.label}
                </button>
              ))}
            </div>
          ) : (
            <>
              <p className="sp-you">{s.options[chosen].label}</p>
              <div className="sp-line is-reply">
                <span className="sp-line-face" aria-hidden="true">
                  <Portrait who={s.who} talking={latest && stage === 'steps'} pip={pip} />
                </span>
                <p className="sp-line-bubble">
                  <span className="sp-line-name">{nameOf(s.who)}</span>
                  {s.options[chosen].reply}
                </p>
              </div>
            </>
          )}
        </div>
      )
    }
    if (s.kind === 'kit' && draft) {
      const def = kitPage(s.page)
      return (
        <section key={k} className={cn('sp-kit', latest && 'is-latest')} aria-label={def.title}>
          <p className="sp-fact-kicker">Your kit</p>
          <h3>{def.title}</h3>
          <p className="sp-kit-blurb">{def.blurb}</p>
          <KitEditor page={def} value={draft} onChange={setDraft} tone="player" />
          <p className="sp-kit-note">Everything here is optional, and you can change it any time from the notebook.</p>
        </section>
      )
    }
    return null
  }

  return (
    <div
      className={cn('sp', `sp--${stage}`, talk && 'sp--talk', paused && 'is-paused')}
      style={{ ['--ch' as string]: c.fill, ['--ch-lip' as string]: c.lip, ['--ch-soft' as string]: c.soft }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sp-title"
    >
      <div className="sp-sky" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <i key={k} style={{ left: `${12 + k * 15}%`, animationDelay: `${-k * 2.3}s` }} />
        ))}
      </div>

      <header className="sp-top">
        <button type="button" className="sp-x" onClick={leave} aria-label="Leave the session">
          <X size={20} strokeWidth={2.8} />
        </button>
        <span className="sp-bar" aria-hidden="true">
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </span>
        <div className="sp-tools">
          {speech.supported() && (
            <button type="button" className={cn('sp-tool', voiceOn && 'is-on')} onClick={() => speech.setEnabled(!voiceOn)} aria-pressed={voiceOn} title="Read aloud">
              {voiceOn ? <Volume2 size={17} strokeWidth={2.5} /> : <VolumeX size={17} strokeWidth={2.5} />}
              <span>Read aloud</span>
            </button>
          )}
          <button type="button" className={cn('sp-tool', scape.kind && 'is-on')} onClick={toggleScape} aria-pressed={!!scape.kind} title="Sounds">
            <Waves size={17} strokeWidth={2.5} />
            <span>{scape.kind ? 'Sounds on' : 'Sounds'}</span>
          </button>
        </div>
      </header>

      <main className="sp-body">
        {stage === 'intro' && (
          <div className="sp-intro">
            {talk ? (
              <span className="sp-host" aria-hidden="true">
                <Portrait who={host} pip={pip} />
              </span>
            ) : (
              <span className="sp-badge" aria-hidden="true">
                <SessionIcon icon={session.icon} size={40} />
              </span>
            )}
            <p className="sp-kicker">{kicker}</p>
            <h2 id="sp-title">{session.title}</h2>
            <p className="sp-why">{session.why}</p>
            {mode === 'replay' && <p className="sp-note">A replay — it’s logged as practice and doesn’t move you along the path.</p>}
            <button type="button" className="sp-cta" onClick={begin} autoFocus>
              <Play size={18} strokeWidth={2.8} /> Begin
            </button>
            <p className="sp-care">Go at your own pace. Stop whenever you like — nothing is lost.</p>
          </div>
        )}

        {stage === 'steps' && talk && (
          <div className="sp-talk" ref={talkRef}>
            <h2 id="sp-title" className="sr-only">
              {session.title}
            </h2>
            {session.steps.slice(0, i + 1).map((s, k) => talkStep(s, k))}
          </div>
        )}

        {stage === 'steps' && !talk && step && (
          <div className="sp-step" key={i}>
            <h2 id="sp-title" className="sr-only">
              {session.title}
            </h2>
            {step.kind === 'say' && <p className="sp-say">{step.text}</p>}
            {step.kind === 'hold' && (
              <div className="sp-hold">
                <p className="sp-say">{step.text}</p>
                <div className="sp-ringbox">
                  <svg className="sp-ring" viewBox="0 0 120 120" aria-hidden="true">
                    <circle cx="60" cy="60" r="52" className="sp-ring-track" />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      className="sp-ring-fill"
                      style={{ strokeDashoffset: `${326.7 * (1 - Math.min(1, elapsed / step.secs))}` }}
                    />
                  </svg>
                  <span className="sp-ring-time">{Math.max(0, Math.ceil(step.secs - elapsed))}</span>
                </div>
              </div>
            )}
            {step.kind === 'breathe' && (
              <div className="sp-breathe">
                {step.text && <p className="sp-say sp-say--small">{step.text}</p>}
                <BreathBubble pattern={step.pattern} cycles={step.cycles} running={!paused} onDone={next} />
              </div>
            )}
            {step.kind === 'count' && (
              <div className="sp-count">
                <p className="sp-say">{step.text}</p>
                <div className={cn('sp-count-items', step.pick && 'is-pick')}>
                  {step.items.map((label, k) => (
                    <button
                      key={k}
                      type="button"
                      className={cn('sp-count-item', tapped.has(k) && 'is-on')}
                      aria-pressed={tapped.has(k)}
                      onClick={() => {
                        setTapped((prev) => {
                          const n = new Set(prev)
                          if (n.has(k)) n.delete(k)
                          else n.add(k)
                          return n
                        })
                        campSound.play(tapped.has(k) ? 'step-down' : 'pop', { step: k })
                      }}
                    >
                      {tapped.has(k) ? <Check size={18} strokeWidth={3.2} /> : label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step.kind === 'write' && (
              <div className="sp-write">
                <p className="sp-say sp-say--small">{step.text}</p>
                <textarea value={scratch} onChange={(e) => setScratch(e.target.value)} placeholder={step.placeholder} rows={3} maxLength={400} autoFocus />
                <div className="sp-write-row">
                  <span>Stays on this screen — not saved.</span>
                  {scratch.trim() && (
                    <button
                      type="button"
                      className="sp-copy"
                      onClick={() => {
                        void navigator.clipboard?.writeText(scratch).then(() => setCopied(true))
                      }}
                    >
                      {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={2.6} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {stage === 'end' && (
          <div className="sp-end">
            {talk ? (
              <span className="sp-host sp-host--end" aria-hidden="true">
                <Portrait who={host} pip={pip} />
              </span>
            ) : (
              <Kiri className="sp-kiri" resting />
            )}
            <p className="sp-kicker">{session.title}</p>
            <h2 id="sp-title" className="sp-closing">
              {session.closing}
            </h2>
            <label className="sp-stayed">
              <span>What stayed with you? optional — it goes in your notebook</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="a word or a line" />
            </label>
            <button type="button" className="sp-cta" onClick={() => void finish()} disabled={busy}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Footprints size={18} strokeWidth={2.6} />}
              {mode === 'walk' ? 'Walk the stone' : session.kind === 'kit' ? 'Save my kit' : 'Done'}
            </button>
          </div>
        )}

        {stage === 'saved' && (
          <div className="sp-end">
            <span className="sp-badge sp-badge--done" aria-hidden="true">
              <Check size={40} strokeWidth={3} />
            </span>
            <h2 id="sp-title" className="sp-closing">
              {mode === 'walk' ? 'On the path.' : session.kind === 'kit' ? 'Kit saved.' : 'Logged as practice.'}
            </h2>
            <button type="button" className="sp-cta" onClick={leave} autoFocus>
              Back to the path
            </button>
          </div>
        )}
      </main>

      {stage === 'steps' && step && (
        <footer className="sp-foot">
          <button type="button" className="sp-soft" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
            {paused ? <Play size={16} strokeWidth={2.8} /> : <Pause size={16} strokeWidth={2.8} />}
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="sp-cta sp-cta--next" onClick={next}>
            {auto != null && !paused && <i className="sp-auto" style={{ width: `${Math.min(100, (elapsed / auto) * 100)}%` }} aria-hidden="true" />}
            <span>
              {i + 1 >= total ? 'Finish' : step.kind === 'breathe' ? 'Skip ahead' : step.kind === 'choice' && picked[i] == null ? 'Skip' : 'Continue'}
            </span>
          </button>
        </footer>
      )}
    </div>
  )
}

export { SessionPlayer }
