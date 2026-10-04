import { useEffect, useState } from 'react'
import { Backpack, CloudRain, Droplets, Flame, LifeBuoy, Moon, PenLine, Phone, Square, Timer, Waves, Wind, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { GoalKit } from '@/types/goals'
import { HELPLINES } from '@/lib/helplines'
import { spiralActions } from '@/store/spiral-store'
import { cn } from '@/lib/utils'
import { campSound, useSoundscape } from '../../camp-sound'
import { CampSheet } from '../../components/camp-sheet'
import { BREATHS, QUICK_HELP, sessionById, type BreathPatternKey, type Session, type SoundscapeKey } from './course'
import { SessionIcon } from './session-icon'
import { hasContent, kitPage, picksIn, type KitKey } from './kit'

const SCAPES: { key: SoundscapeKey; label: string; icon: LucideIcon }[] = [
  { key: 'rain', label: 'Rain', icon: CloudRain },
  { key: 'stream', label: 'Stream', icon: Droplets },
  { key: 'waves', label: 'Waves', icon: Waves },
  { key: 'wind', label: 'Wind', icon: Wind },
  { key: 'night', label: 'Night', icon: Moon },
  { key: 'fire', label: 'Fire', icon: Flame },
]

const BREATH_ICON: Record<BreathPatternKey, LucideIcon> = { sigh: Wind, box: Square, 'four-seven-eight': Moon, even: Waves }

type AnytimeSheetProps = {
  open: boolean
  origin: HTMLElement | null
  onBreathe: (pattern: BreathPatternKey) => void
  onSit: (minutes: number, interval: number) => void
  onSession: (session: Session) => void
  /** The trail kit, for the heavy-day plan. */
  kit: GoalKit
  onOpenKit: (page: KitKey) => void
  onLogOther: () => void
  onClose: () => void
}

/**
 * Anytime — the Quiet Path's toolbox, Calm's best everyday tools in one place: the breathing
 * patterns, soundscapes with a sleep timer, a quiet sitting timer with bells, and a few
 * sessions for loud moments. None of it moves you along the path (that's what the stones
 * are for), and the Spiral Breaker is right here too.
 */
function AnytimeSheet({ open, origin, onBreathe, onSit, onSession, kit, onOpenKit, onLogOther, onClose }: AnytimeSheetProps) {
  const scape = useSoundscape()
  const [timer, setTimer] = useState<number | null>(30)
  const [volume, setVolume] = useState(0.6)
  const [sitFor, setSitFor] = useState(5)
  const [bellEvery, setBellEvery] = useState(0)

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!scape.endsAt || !open) return
    const first = window.setTimeout(() => setNowMs(Date.now()), 0)
    const t = window.setInterval(() => setNowMs(Date.now()), 15_000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(t)
    }
  }, [scape.endsAt, open])

  const plan = kit['heavy-day']
  const planDef = kitPage('heavy-day')
  const canDo = picksIn(plan, planDef.groups[1])
  const people = plan?.fields.people?.trim()
  const places = plan?.fields.distract?.trim()

  const playing = scape.kind
  const left = scape.endsAt ? Math.max(0, Math.round((scape.endsAt - nowMs) / 60_000)) : null

  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="qa-title" width={540}>
      <div className="qa">
        <header className="qa-head">
          <div>
            <h2 id="qa-title">Anytime</h2>
            <p>Tools to reach for whenever. They’re practice, not stones — the path waits as it is.</p>
          </div>
          <button type="button" className="cs-icon" onClick={onClose} aria-label="Close" data-autofocus>
            <X size={16} strokeWidth={2.6} />
          </button>
        </header>

        <section className="qa-section">
          <h3>Breathe</h3>
          <div className="qa-grid qa-grid--2">
            {BREATHS.map((b) => {
              const Icon = BREATH_ICON[b.key]
              return (
                <button key={b.key} type="button" className="qa-tile" onClick={() => onBreathe(b.key)}>
                  <span className="qa-tile-icon qa-tile-icon--breath" aria-hidden="true">
                    <Icon size={18} strokeWidth={2.5} />
                  </span>
                  <span className="qa-tile-text">
                    <strong>{b.name}</strong>
                    <small>{b.blurb}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="qa-section">
          <h3>
            Sounds
            {playing && (
              <span className="qa-now">
                <i aria-hidden="true" /> {SCAPES.find((s) => s.key === playing)?.label}
                {left != null ? ` · ${left} min left` : ''}
              </span>
            )}
          </h3>
          <div className="qa-grid qa-grid--6">
            {SCAPES.map((s) => {
              const Icon = s.icon
              const on = playing === s.key
              return (
                <button
                  key={s.key}
                  type="button"
                  className={cn('qa-scape', on && 'is-on')}
                  aria-pressed={on}
                  onClick={() => (on ? campSound.stopScape() : campSound.playScape(s.key, volume, timer))}
                >
                  <Icon size={20} strokeWidth={2.4} />
                  <span>{s.label}</span>
                </button>
              )
            })}
          </div>
          <div className="qa-row">
            <span className="qa-label">Fade out after</span>
            <div className="qa-chips" role="radiogroup" aria-label="Sleep timer">
              {[null, 15, 30, 60].map((m) => (
                <button
                  key={String(m)}
                  type="button"
                  role="radio"
                  aria-checked={timer === m}
                  className={cn(timer === m && 'is-on')}
                  onClick={() => {
                    setTimer(m)
                    if (playing) campSound.playScape(playing as SoundscapeKey, volume, m)
                  }}
                >
                  {m == null ? 'Never' : `${m} min`}
                </button>
              ))}
            </div>
          </div>
          <label className="qa-row">
            <span className="qa-label">Volume</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => {
                const v = Number(e.target.value)
                setVolume(v)
                campSound.setScapeVolume(v)
              }}
            />
          </label>
        </section>

        <section className="qa-section">
          <h3>Sit quietly</h3>
          <div className="qa-row">
            <span className="qa-label">For</span>
            <div className="qa-chips" role="radiogroup" aria-label="How long">
              {[2, 5, 10, 20].map((m) => (
                <button key={m} type="button" role="radio" aria-checked={sitFor === m} className={cn(sitFor === m && 'is-on')} onClick={() => setSitFor(m)}>
                  {m} min
                </button>
              ))}
            </div>
          </div>
          <div className="qa-row">
            <span className="qa-label">A bell</span>
            <div className="qa-chips" role="radiogroup" aria-label="Interval bell">
              {[
                [0, 'start & end'],
                [1, 'every minute'],
                [5, 'every 5 min'],
              ].map(([m, label]) => (
                <button key={m} type="button" role="radio" aria-checked={bellEvery === m} className={cn(bellEvery === m && 'is-on')} onClick={() => setBellEvery(m as number)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="qa-start" onClick={() => onSit(sitFor, bellEvery)}>
            <Timer size={17} strokeWidth={2.6} /> Start the timer
          </button>
        </section>

        <section className="qa-section">
          <h3>Quick help</h3>
          <ul className="qa-help">
            {QUICK_HELP.map((id) => {
              const s = sessionById(id)
              if (!s) return null
              return (
                <li key={id}>
                  <button type="button" onClick={() => onSession(s)}>
                    <span className="qa-tile-icon" aria-hidden="true">
                      <SessionIcon icon={s.icon} size={17} />
                    </span>
                    <span className="qa-tile-text">
                      <strong>{s.title}</strong>
                      <small>
                        {s.minutes} min · {s.why}
                      </small>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            className="qa-sos"
            onClick={() => {
              onClose()
              spiralActions.open()
            }}
          >
            <LifeBuoy size={18} strokeWidth={2.4} />
            <span>
              <strong>If it’s a lot right now</strong>
              <small>The Spiral Breaker — a few steps to come down from a spiral</small>
            </span>
          </button>
          {hasContent(plan) ? (
            <div className="qa-plan">
              <p className="qa-plan-head">
                <Backpack size={15} strokeWidth={2.6} aria-hidden="true" /> Your heavy-day plan
                <button type="button" onClick={() => onOpenKit('heavy-day')}>
                  Edit
                </button>
              </p>
              {canDo.length > 0 && (
                <p>
                  <small>Things I can do</small>
                  {canDo.join(' · ')}
                </p>
              )}
              {places && (
                <p>
                  <small>People and places that help</small>
                  {places}
                </p>
              )}
              {people && (
                <p>
                  <small>People I can tell</small>
                  {people}
                </p>
              )}
            </div>
          ) : (
            <button type="button" className="qa-other qa-plan-make" onClick={() => onOpenKit('heavy-day')}>
              <Backpack size={15} strokeWidth={2.5} /> Make a heavy-day plan — about three minutes
            </button>
          )}
          <ul className="qa-lines" aria-label="Helplines">
            {HELPLINES.map((h) => (
              <li key={h.tel}>
                <a href={h.tel}>
                  <Phone size={13} strokeWidth={2.6} aria-hidden="true" />
                  <strong>{h.display}</strong> {h.name}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <button type="button" className="qa-other" onClick={onLogOther}>
          <PenLine size={15} strokeWidth={2.5} /> Did something else that helped? Log it
        </button>
      </div>
    </CampSheet>
  )
}

export { AnytimeSheet }
