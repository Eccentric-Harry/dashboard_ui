import { useState } from 'react'
import type { LiftPlace, ProgramStartPayload } from '@/types/program'
import { cn } from '@/lib/utils'
import { addDays } from '../goal-format'
import { PHASES, TRACKS } from './program-content'
import { Seg, TrackDisc } from './lh-ui'
import { dayMonth, shortDay } from './lh-utils'

type StartViewProps = {
  today: string
  profileWeightKg?: number | null
  busy: boolean
  onStart: (payload: ProgramStartPayload) => void
}

/** The next Monday (today if it is one) — a fresh week is a real fresh start. */
function nextMonday(today: string): string {
  const [y, m, d] = today.split('-').map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return dow === 1 ? today : addDays(today, (8 - dow) % 7)
}

/**
 * Before day 1: what the 90 days are, in four phases, and the few things the program needs
 * to know. The brief's open questions are asked here; the private one stays private.
 */
function StartView({ today, profileWeightKg, busy, onStart }: StartViewProps) {
  const [start, setStart] = useState(() => nextMonday(today))
  const [birthday, setBirthday] = useState(() => addDays(nextMonday(today), 89))
  const [weight, setWeight] = useState(profileWeightKg ? String(profileWeightKg) : '')
  const [place, setPlace] = useState<LiftPlace>('gym')
  const [dopamine, setDopamine] = useState('')
  const [english, setEnglish] = useState('Team meetings')
  const [level, setLevel] = useState('Starting from zero')
  const kg = Number(weight)

  const moveStart = (v: string) => {
    setStart(v)
    setBirthday(addDays(v, 89))
  }

  return (
    <div className="lh-start">
      <p className="lh-kicker">90 days · {dayMonth(start)} → {dayMonth(birthday)}</p>
      <h2 className="lh-start-title">Build the light.</h2>
      <p className="lh-start-lede">
        Confidence comes from evidence. For 90 days, every promise you keep to yourself becomes a stone in a lighthouse. By your birthday, it’s a light
        you built — out of things you actually did.
      </p>

      <ol className="lh-start-phases">
        {PHASES.map((ph) => (
          <li key={ph.key}>
            <strong>{ph.name}</strong>
            <small>
              Days {ph.from}–{ph.to}
            </small>
            <span>{ph.line}</span>
          </li>
        ))}
      </ol>

      <div className="lh-start-tracks" aria-label="The eight tracks">
        {TRACKS.map((t) => (
          <span key={t.key} className="lh-start-track" data-color={t.color}>
            <TrackDisc track={t.key} size={24} />
            {t.name}
          </span>
        ))}
      </div>

      <div className="lh-start-form">
        <div className="lh-row">
          <label className="lh-field">
            <span>Day 1</span>
            <input className="lh-input" type="date" value={start} min={addDays(today, -6)} onChange={(e) => moveStart(e.target.value)} />
          </label>
          <label className="lh-field">
            <span>Day 90 · your birthday</span>
            <input className="lh-input" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </label>
        </div>
        <div className="lh-row">
          <label className="lh-field">
            <span>Body weight, kg {kg > 0 && <small>→ protein {Math.round(kg * 1.6)} g</small>}</span>
            <input className="lh-input" type="number" inputMode="decimal" min={30} max={250} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="For the protein maths" />
          </label>
          <div className="lh-field">
            <span>Lifting at</span>
            <Seg label="Lifting at" value={place} onChange={setPlace} options={[{ value: 'gym', label: 'Gym' }, { value: 'home', label: 'Home' }]} />
          </div>
        </div>
        <label className="lh-field">
          <span>What counts as cheap dopamine for you? (private — it’s never shown in the world)</span>
          <input className="lh-input" maxLength={200} value={dopamine} onChange={(e) => setDopamine(e.target.value)} placeholder="e.g. short videos, endless scrolling" />
        </label>
        <div className="lh-row">
          <label className="lh-field">
            <span>Where English lets you down most</span>
            <input className="lh-input" maxLength={200} value={english} onChange={(e) => setEnglish(e.target.value)} />
          </label>
          <label className="lh-field">
            <span>Running and lifting today</span>
            <input className="lh-input" maxLength={200} value={level} onChange={(e) => setLevel(e.target.value)} />
          </label>
        </div>
        <button
          type="button"
          className={cn('lh-btn lh-btn--primary lh-btn--lg lh-btn--wide')}
          disabled={busy || !start || birthday <= start}
          onClick={() =>
            onStart({
              title: 'Turning 23',
              startDate: start,
              endDate: birthday,
              birthday,
              weightKg: kg > 0 ? kg : undefined,
              liftPlace: place,
              answers: { dopamine, english, level },
            })
          }
        >
          {busy ? 'Laying the foundation…' : `Begin — day 1 is ${shortDay(start)}`}
        </button>
        <p className="lh-small lh-center">No streaks. No red. A missed day changes nothing; a small version always counts.</p>
      </div>
    </div>
  )
}

export { StartView }
