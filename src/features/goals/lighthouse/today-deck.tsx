import { useState } from 'react'
import type { MouseEvent } from 'react'
import { Armchair, Check, ChevronDown, ChevronRight, Flag, Mail } from 'lucide-react'
import type { ProgramAssessment, ProgramAssessmentType, ProgramTrackKey } from '@/types/program'
import { cn } from '@/lib/utils'
import { PHASES, TRACKS } from './program-content'
import { activeTracks, checkpointsDue, dayNumber, phaseRange, upcomingTracks, type ProgramCtx } from './program-engine'
import { LockedTrack, TrackRow } from './track-card'

type TodayDeckProps = {
  ctx: ProgramCtx
  assessments: ProgramAssessment[]
  busy: ReadonlySet<string>
  reviewDue: boolean
  onHoldFull: (track: ProgramTrackKey, el: HTMLElement) => void
  onSmall: (track: ProgramTrackKey, el: HTMLElement) => void
  onOpen: (track: ProgramTrackKey, el: HTMLElement) => void
  onMood: (score: number, el: HTMLElement) => void
  onUrge: (el: HTMLElement) => void
  onCheckpoint: (type: ProgramAssessmentType | undefined, el: HTMLElement) => void
  onLetters: (el: HTMLElement) => void
  onReview: (el: HTMLElement) => void
}

const CHECK_NAME: Record<ProgramAssessmentType, string> = {
  BODY: 'photos and measurements',
  ROSENBERG: 'self-esteem scale',
  WHO5: 'well-being check',
}

/** A small ring for the first-week list: how much of the setup is done. */
function SetupRing({ done, total }: { done: number; total: number }) {
  const r = 17
  const c = 2 * Math.PI * r
  return (
    <span className="lh-setup-ring" aria-hidden="true">
      <svg viewBox="0 0 42 42">
        <circle cx="21" cy="21" r={r} className="lh-setup-ring-track" />
        <circle cx="21" cy="21" r={r} className="lh-setup-ring-fill" strokeDasharray={`${(done / total) * c} ${c}`} transform="rotate(-90 21 21)" />
      </svg>
      <b>
        {done}/{total}
      </b>
    </span>
  )
}

/**
 * Today: anything the day asks beyond the tracks (a check-in, the review) as quiet notices,
 * the first-week setup while it matters, then one row per track that's on. Tracks still to
 * come wait at the bottom with the day they open — tap one to write its if-then plan.
 */
function TodayDeck({ ctx, assessments, busy, reviewDue, onHoldFull, onSmall, onOpen, onMood, onUrge, onCheckpoint, onLetters, onReview }: TodayDeckProps) {
  const p = ctx.program
  const day = dayNumber(p, ctx.today)
  const tracks = activeTracks(p, ctx.today)
  const upcoming = upcomingTracks(p, ctx.today)
  const due = checkpointsDue(p, assessments, ctx.today)
  // The setup list shows from the evening before day 1 to the end of the audit week.
  const inAudit = day <= phaseRange(p, PHASES[0])[1]
  const [setupOpen, setSetupOpen] = useState(true)
  const at = (fn: (el: HTMLElement) => void) => (e: MouseEvent<HTMLElement>) => fn(e.currentTarget)

  const plans = p.tracks.filter((t) => t.key !== 'mood' && t.plan?.trim()).length
  const unplanned = TRACKS.map((t) => t.key).find((k) => k !== 'mood' && !p.tracks.find((t) => t.key === k)?.plan?.trim()) ?? 'screen'
  const auditDays = (track: ProgramTrackKey) =>
    new Set(ctx.logs.filter((l) => l.track === track && dayNumber(p, l.date) >= 1 && dayNumber(p, l.date) <= 7).map((l) => l.date)).size +
    (track === 'mood' ? Object.keys(ctx.sources.mood).filter((d) => dayNumber(p, d) >= 1 && dayNumber(p, d) <= 7 && !ctx.logs.some((l) => l.track === 'mood' && l.date === d)).length : 0)
  const doneType = (type: ProgramAssessmentType) => assessments.some((a) => a.type === type && dayNumber(p, a.date) <= 7)

  const setup = [
    { key: 'body', label: 'Day-1 photos, weight and waist', done: doneType('BODY'), act: (el: HTMLElement) => onCheckpoint('BODY', el) },
    { key: 'rosenberg', label: 'Self-esteem scale · 2 min', done: doneType('ROSENBERG'), act: (el: HTMLElement) => onCheckpoint('ROSENBERG', el) },
    { key: 'who5', label: 'Well-being check · 1 min', done: doneType('WHO5'), act: (el: HTMLElement) => onCheckpoint('WHO5', el) },
    { key: 'letter', label: 'A letter to 23-year-old you', done: !!p.letters.to23, act: onLetters },
    { key: 'plans', label: `If-then plan for each track · ${plans}/7`, done: plans >= 7, act: (el: HTMLElement) => onOpen(unplanned, el) },
    { key: 'screen', label: `Screen minutes each night · ${Math.min(7, auditDays('screen'))}/7`, done: auditDays('screen') >= 7, act: (el: HTMLElement) => onOpen('screen', el) },
    { key: 'mood', label: `Mood each evening · ${Math.min(7, auditDays('mood'))}/7`, done: auditDays('mood') >= 7, act: (el: HTMLElement) => onOpen('mood', el) },
  ]
  const setupDone = setup.filter((s) => s.done).length

  return (
    <div className="lh-today">
      {!inAudit && (due.length > 0 || reviewDue) && (
        <div className="lh-notices">
          {due.length > 0 && (
            <button type="button" className="lh-notice" data-color="sky" onClick={at((el) => onCheckpoint(due[0].type, el))}>
              <span className="lh-notice-icon">
                <Flag size={17} strokeWidth={2.6} />
              </span>
              <span className="lh-notice-text">
                <strong>Check-in day</strong>
                <small>{due.map((d) => CHECK_NAME[d.type]).join(' · ')}</small>
              </span>
              <ChevronRight size={18} strokeWidth={2.6} aria-hidden="true" />
            </button>
          )}
          {reviewDue && (
            <button type="button" className="lh-notice" data-color="lemon" onClick={at(onReview)}>
              <span className="lh-notice-icon">
                <Armchair size={17} strokeWidth={2.6} />
              </span>
              <span className="lh-notice-text">
                <strong>Weekly review</strong>
                <small>Five minutes · one number, one win, one change</small>
              </span>
              <ChevronRight size={18} strokeWidth={2.6} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {inAudit && (
        <section className={cn('lh-setup', setupDone === setup.length && 'is-complete')} aria-label="Your first week">
          <span className="lh-tape" aria-hidden="true" />
          <button type="button" className="lh-setup-head" onClick={() => setSetupOpen((o) => !o)} aria-expanded={setupOpen}>
            <SetupRing done={setupDone} total={setup.length} />
            <span>
              <strong>{setupDone === setup.length ? 'First week, set up' : 'Your first week'}</strong>
              <small>{day < 1 ? 'Most of these can be done tonight' : 'Seven small things before the work starts'}</small>
            </span>
            <ChevronDown className={cn('lh-setup-chev', setupOpen && 'is-open')} size={18} strokeWidth={2.6} aria-hidden="true" />
          </button>
          {setupOpen && (
            <ul>
              {setup.map((s) => (
                <li key={s.key}>
                  <button type="button" className={cn('lh-setup-item', s.done && 'is-done')} onClick={at(s.act)}>
                    <span className="lh-setup-box" aria-hidden="true">
                      {s.done && <Check size={12} strokeWidth={3.6} />}
                    </span>
                    <span className="lh-setup-label">{s.label}</span>
                    {s.key === 'letter' && !s.done && <Mail size={14} strokeWidth={2.6} aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tracks.length > 0 && (
        <section className="lh-list" aria-label="Today's tracks">
          {TRACKS.filter((t) => tracks.includes(t.key)).map((t) => (
            <TrackRow
              key={t.key}
              ctx={ctx}
              track={t.key}
              busy={busy.has(t.key)}
              onHoldFull={onHoldFull}
              onSmall={onSmall}
              onOpen={onOpen}
              onMood={onMood}
              onUrge={onUrge}
            />
          ))}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="lh-upcoming" aria-label="Tracks still to come">
          <h3 className="lh-sky-title">
            Opening soon <small>tap one to write its if-then plan</small>
          </h3>
          <div className="lh-upcoming-row">
            {upcoming.map((k) => (
              <LockedTrack key={k} ctx={ctx} track={k} onOpen={onOpen} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export { TodayDeck }
