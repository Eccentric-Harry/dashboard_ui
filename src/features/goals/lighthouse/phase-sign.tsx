import type { CSSProperties } from 'react'
import type { Program } from '@/types/program'
import { cn } from '@/lib/utils'
import { PHASES } from './program-content'
import { dayNumber, phaseOf, phaseRange, programLength } from './program-engine'
import { shortDay } from './lh-utils'

type PhaseSignProps = {
  program: Program
  today: string
}

/**
 * The top of the log, as a wooden sign in the camp's grammar (its week signboard): the phase
 * you're in and what it asks, a paper day-token nailed to the plank, and the 90 days burned
 * into the wood as four grooves sized by their length, filled as far as you've walked. Where
 * you are on the journey — never a countdown, never a verdict.
 */
function PhaseSign({ program, today }: PhaseSignProps) {
  const length = programLength(program)
  const day = dayNumber(program, today)
  const phase = phaseOf(program, Math.min(Math.max(day, 1), length))
  const index = phase ? PHASES.findIndex((p) => p.key === phase.key) : 0
  const before = day < 1
  const after = day > length
  const wait = 1 - day

  const kicker = before ? `Starts ${shortDay(program.startDate)}` : after ? 'All 90 days' : `Phase ${index + 1} of 4 · ${phase?.name}`
  const title = before
    ? `${wait === 1 ? 'Tonight' : 'Before day 1'}: your plans, a letter, day-1 photos.`
    : after
      ? `${length} days walked. Look how far the light reaches.`
      : phase?.line
  const columns = PHASES.map((ph) => {
    const [from, to] = phaseRange(program, ph)
    return `minmax(min-content, ${to - from + 1}fr)`
  }).join(' ')

  return (
    <section className="lh-sign" aria-label={before ? `Day 1 is ${shortDay(program.startDate)}` : `Day ${Math.min(day, length)} of ${length}`}>
      <div className="lh-sign-plank">
        <div className="lh-sign-text">
          <p className="lh-sign-kicker">{kicker}</p>
          <h2 className="lh-sign-title">{title}</h2>
        </div>
        <p className="lh-sign-day" aria-hidden="true">
          <small>Day</small>
          <strong>{before ? 1 : Math.min(day, length)}</strong>
          <small>{before ? (wait === 1 ? 'tomorrow' : `in ${wait} days`) : `of ${length}`}</small>
        </p>
        <div className="lh-sign-voyage" style={{ gridTemplateColumns: columns } as CSSProperties} aria-hidden="true">
          {PHASES.map((ph) => {
            const [from, to] = phaseRange(program, ph)
            const fill = Math.min(1, Math.max(0, (day - from + 1) / (to - from + 1)))
            return (
              <span key={ph.key} className={cn('lh-sign-groove', phase?.key === ph.key && !before && !after && 'is-now')} title={`${ph.name} · days ${from}–${to}`}>
                <i style={{ width: `${fill * 100}%` }} />
              </span>
            )
          })}
          {PHASES.map((ph) => (
            <span key={`${ph.key}-name`} className={cn('lh-sign-phase', phase?.key === ph.key && !before && !after && 'is-now')}>
              {ph.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

export { PhaseSign }
