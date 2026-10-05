import type { MouseEvent, PointerEvent } from 'react'
import { Check, ChevronRight, Lock, Moon, PenLine, Sprout } from 'lucide-react'
import type { ProgramTrackKey } from '@/types/program'
import { cn } from '@/lib/utils'
import { useHold } from '../use-hold'
import { campSound } from '../camp-sound'
import { LIFT_PLANS, MOOD_SCALE, SPEAK_PROMPTS, fillCopy, trackMeta } from './program-content'
import {
  dateOfDay,
  dayCell,
  dayNumber,
  isBaseline,
  isDone,
  isWeekly,
  keptPromises,
  logSound,
  nextLiftDay,
  nextRun,
  opensDay,
  targetOn,
  weekCount,
  weekDates,
  weekStartOf,
  type DayCell,
  type ProgramCtx,
} from './program-engine'
import { TrackDisc } from './lh-ui'
import { dayMonth } from './lh-utils'

type TrackRowProps = {
  ctx: ProgramCtx
  track: ProgramTrackKey
  busy: boolean
  onHoldFull: (track: ProgramTrackKey, el: HTMLElement) => void
  onSmall: (track: ProgramTrackKey, el: HTMLElement) => void
  onOpen: (track: ProgramTrackKey, el: HTMLElement) => void
  onMood: (score: number, el: HTMLElement) => void
}

/** One short line about what today holds on this track. */
function trackHint(ctx: ProgramCtx, track: ProgramTrackKey): string {
  const today = ctx.today
  switch (track) {
    case 'run': {
      const next = nextRun(ctx.logs)
      return next ? `Week ${next.week}, run ${next.run} · ${next.summary}` : '30-minute runs, three a week'
    }
    case 'lift': {
      const day = nextLiftDay(ctx.logs, LIFT_PLANS[ctx.program.liftPlace ?? 'gym'])
      return `${day.name} · ${day.exercises.map((e) => e.name.toLowerCase()).slice(0, 3).join(', ')}`
    }
    case 'learn': {
      const focus = ctx.sources.focus[today]
      return focus ? `${focus} focused minutes so far today` : '25 focused minutes on a pursuit step'
    }
    case 'english':
      return SPEAK_PROMPTS[Math.max(0, dayNumber(ctx.program, today) - 1) % SPEAK_PROMPTS.length]
    case 'protein':
      return isBaseline(ctx.program, 'protein', today) ? 'Audit week · eat as usual, it reads from Nutrition' : 'Read from your meals on Nutrition'
    case 'regard':
      return `${keptPromises(ctx.logs)} stones in the tower so far`
    case 'mood':
      return 'Weather, not a verdict'
  }
}

/** A thin meter under the title: this week's sessions, today's grams, today's minutes. */
function Meter({ value, max, floor, label }: { value: number; max: number; floor?: number | null; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <span className="lh-meter-row">
      <span className="lh-meter" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
        {floor != null && max > 0 && <b style={{ left: `${Math.min(100, (floor / max) * 100)}%` }} />}
      </span>
      <span className="lh-meter-label">{label}</span>
    </span>
  )
}

/**
 * This week, one dot per day (the camp lantern tag's dots): filled for a session, a soft ring
 * for the small version, a faint moon-dot for rest, today ringed, days to come faded.
 */
function WeekDots({ ctx, track, done, target }: { ctx: ProgramCtx; track: ProgramTrackKey; done: number; target: number }) {
  return (
    <span className="lh-meter-row">
      <span className="lh-dots" aria-hidden="true">
        {weekDates(weekStartOf(ctx.today)).map((d) => {
          const s = dayCell(ctx, track, d).status
          return <i key={d} className={cn(`is-${s}`, d === ctx.today && 'is-today')} />
        })}
      </span>
      <span className="lh-meter-label">
        {done} of {target} this week
      </span>
    </span>
  )
}

const DONE_WORD: Partial<Record<DayCell['status'], string>> = { full: 'Done', min: 'Small version', rest: 'Rest day' }

/** Hold the circle to log the full version — a ring winds up, then the check lands. */
function HoldCircle({
  done,
  rest,
  busy,
  label,
  onComplete,
  onTap,
}: {
  done: boolean
  rest: boolean
  busy: boolean
  label: string
  onComplete: () => void
  onTap: () => void
}) {
  const hold = useHold({
    enabled: !done && !busy,
    onComplete: () => {
      campSound.chargeStop()
      onComplete()
    },
    onTap,
  })
  // The hum starts on the press itself and stops the moment the finger lifts.
  const handlers = {
    ...hold.handlers,
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (!done && !busy && e.button === 0) campSound.chargeStart()
      hold.handlers.onPointerDown(e)
    },
    onPointerUp: () => {
      campSound.chargeStop()
      hold.handlers.onPointerUp()
    },
    onPointerCancel: () => {
      campSound.chargeStop()
      hold.handlers.onPointerCancel()
    },
    onPointerLeave: () => {
      campSound.chargeStop()
      hold.handlers.onPointerLeave()
    },
  }
  return (
    <button
      type="button"
      className={cn('lh-hold', done && 'is-done', hold.charging && 'is-charging', hold.nudged && 'is-nudged')}
      data-quiet-press
      {...handlers}
      disabled={busy}
      aria-label={done ? `${label} — logged. Open it` : `Hold to log: ${label}`}
      title={done ? undefined : 'Hold to log'}
    >
      <svg viewBox="0 0 56 56" aria-hidden="true">
        <circle className="lh-hold-track" cx="28" cy="28" r="24" />
        <circle className="lh-hold-ring" cx="28" cy="28" r="24" transform="rotate(-90 28 28)" />
      </svg>
      <span className="lh-hold-mark" aria-hidden="true">
        {rest ? <Moon size={20} strokeWidth={2.8} /> : <Check size={22} strokeWidth={3.4} />}
      </span>
      {hold.nudged && <span className="lh-hold-tip">Hold it</span>}
    </button>
  )
}

/**
 * A track for today, as one row: what today holds, a thin meter where there's a number, and
 * a single action on the right — hold the circle for the full version (Habits-style), or the
 * quiet "small version" link for a hard day; both count. Mood is five words to tap, and the
 * tracks that need words or numbers open their sheet. No row is ever red or "missed".
 */
function TrackRow({ ctx, track, busy, onHoldFull, onSmall, onOpen, onMood }: TrackRowProps) {
  const meta = trackMeta(track)
  const cell = dayCell(ctx, track, ctx.today)
  const done = isDone(cell.status) || cell.status === 'rest'
  const { target, floor } = targetOn(ctx, track, ctx.today)
  const weekly = isWeekly(track)
  const week = weekly ? weekCount(ctx, track, weekStartOf(ctx.today)) : null
  const holdable = weekly || track === 'english'
  const rowEl = () => document.querySelector<HTMLElement>(`[data-track-card="${track}"]`)
  const at = (fn: (el: HTMLElement) => void) => (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    fn(e.currentTarget.closest<HTMLElement>('[data-track-card]') ?? e.currentTarget)
  }
  const baseline = isBaseline(ctx.program, track, ctx.today)
  const moodValue = track === 'mood' && cell.status === 'logged' ? cell.value : undefined
  const englishMinutes = track === 'english' ? (cell.value ?? 0) : 0

  return (
    <article className={cn('lh-track', `is-${cell.status}`, busy && 'is-busy')} data-color={meta.color} data-track-card={track}>
      <button type="button" className="lh-track-main" onClick={at((el) => onOpen(track, el))} aria-label={`Open ${meta.name}`}>
        <TrackDisc track={track} size={46} className="lh-track-icon" />
        <span className="lh-track-text">
          <span className="lh-track-name">
            {meta.name}
            {DONE_WORD[cell.status] && <em className="lh-track-badge">{DONE_WORD[cell.status]}</em>}
          </span>
          <span className="lh-track-hint">{trackHint(ctx, track)}</span>
          {week && week.target != null && <WeekDots ctx={ctx} track={track} done={week.done} target={week.target} />}
          {track === 'protein' &&
            (cell.value != null ? (
              baseline ? (
                <Meter value={cell.value} max={Math.max(cell.value, target ?? 110)} label={`${Math.round(cell.value)} g today`} />
              ) : (
                <Meter value={cell.value} max={target ?? 110} floor={floor} label={`${Math.round(cell.value)} of ${target} g`} />
              )
            ) : (
              <span className="lh-meter-label is-quiet">Nothing logged on Nutrition yet</span>
            ))}
          {track === 'english' && target != null && <Meter value={englishMinutes} max={target} floor={floor} label={`${englishMinutes} of ${target} min spoken`} />}
        </span>
      </button>

      {track === 'mood' ? (
        <div className="lh-mood" role="group" aria-label="How was today?">
          {MOOD_SCALE.map((m) => (
            <button
              key={m.score}
              type="button"
              className={cn('lh-mood-dot-btn', moodValue === m.score && 'is-on')}
              data-sound="tap"
              style={{ ['--mood' as string]: m.color }}
              disabled={busy}
              onClick={at((el) => onMood(m.score, el))}
              aria-pressed={moodValue === m.score}
            >
              <i aria-hidden="true" />
              <span>{m.word}</span>
            </button>
          ))}
        </div>
      ) : holdable ? (
        <div className="lh-track-act">
          <HoldCircle
            done={done}
            rest={cell.status === 'rest'}
            busy={busy}
            label={fillCopy(meta.full, target, floor)}
            onComplete={() => {
              const el = rowEl()
              if (el) onHoldFull(track, el)
            }}
            onTap={() => {
              const el = rowEl()
              if (el) onOpen(track, el)
            }}
          />
          {!done && (
            <button
              type="button"
              className="lh-small-link"
              data-sound={logSound(ctx, track, 'MIN').name}
              data-sound-step={logSound(ctx, track, 'MIN').step}
              onClick={at((el) => onSmall(track, el))}
              disabled={busy}
              title={fillCopy(meta.min, target, floor)}
            >
              <Sprout size={12} strokeWidth={2.8} aria-hidden="true" /> small version
            </button>
          )}
        </div>
      ) : (
        <div className="lh-track-act">
          {track === 'regard' && (
            <button type="button" className={cn('lh-pill', !isDone(cell.status) && 'is-primary')} onClick={at((el) => onOpen(track, el))} disabled={busy}>
              {isDone(cell.status) ? (
                '+ Another'
              ) : (
                <>
                  <PenLine size={15} strokeWidth={2.8} aria-hidden="true" /> Write
                </>
              )}
            </button>
          )}
          {track === 'protein' && (
            <button type="button" className="lh-pill is-quiet" onClick={at((el) => onOpen(track, el))} aria-label="Protein details">
              <ChevronRight size={18} strokeWidth={2.8} />
            </button>
          )}
        </div>
      )}
    </article>
  )
}

/** A track that hasn't opened yet: when it does, and whether its if-then plan is written. */
function LockedTrack({ ctx, track, onOpen }: { ctx: ProgramCtx; track: ProgramTrackKey; onOpen: (track: ProgramTrackKey, el: HTMLElement) => void }) {
  const meta = trackMeta(track)
  const opens = dateOfDay(ctx.program, opensDay(ctx.program, track))
  const planned = !!ctx.program.tracks.find((t) => t.key === track)?.plan
  return (
    <button type="button" className="lh-locked" data-color={meta.color} onClick={(e) => onOpen(track, e.currentTarget)}>
      <TrackDisc track={track} size={30} />
      <span>
        <strong>{meta.name}</strong>
        <small>{dayMonth(opens)}</small>
      </span>
      {planned ? <Check className="lh-locked-mark is-planned" size={14} strokeWidth={3.2} aria-label="If-then plan written" /> : <Lock className="lh-locked-mark" size={13} strokeWidth={2.6} aria-hidden="true" />}
    </button>
  )
}

export { TrackRow, LockedTrack }
