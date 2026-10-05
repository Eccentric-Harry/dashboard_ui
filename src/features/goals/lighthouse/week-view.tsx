import { useState } from 'react'
import { Armchair, Check, ChevronLeft, ChevronRight, Moon } from 'lucide-react'
import type { ProgramTrackKey } from '@/types/program'
import { cn } from '@/lib/utils'
import { addDays, weekdayLetter } from '../goal-format'
import { MOOD_SCALE, trackMeta } from './program-content'
import { dayCell, dayNumber, isDone, isOn, isWeekly, programLength, weekCount, weekDates, weekStartOf, type DayCell, type ProgramCtx } from './program-engine'
import { Ring, TrackDisc } from './lh-ui'
import { dayMonth } from './lh-utils'

type WeekViewProps = {
  ctx: ProgramCtx
  onReview: (weekStart: string, el: HTMLElement) => void
  onOpen: (track: ProgramTrackKey, el: HTMLElement) => void
}

// Training first, then mood straight under it, so the two read on one timeline.
const ORDER: ProgramTrackKey[] = ['run', 'lift', 'mood', 'protein', 'learn', 'english', 'regard']

const STATUS_LABEL: Record<DayCell['status'], string> = {
  full: 'done',
  min: 'small version — done',
  rest: 'rest day',
  logged: 'logged',
  none: 'nothing logged',
  unknown: 'unknown — nothing to judge',
  off: '',
  future: 'still ahead',
}

/**
 * A week at a glance: a row per track, Monday to Sunday. Full is solid, the small version a
 * lighter shade, rest a moon, and a day without anything is plain grey — never red. Weekly
 * tracks show a ring that's judged on Sunday; mood sits under the training rows as a line,
 * observed, never scored.
 */
function WeekView({ ctx, onReview, onOpen }: WeekViewProps) {
  const p = ctx.program
  const thisWeek = weekStartOf(ctx.today)
  const firstWeek = weekStartOf(p.startDate)
  const lastWeek = weekStartOf(p.endDate) < thisWeek ? weekStartOf(p.endDate) : thisWeek
  const [week, setWeek] = useState(lastWeek < firstWeek ? firstWeek : lastWeek)
  const days = weekDates(week)
  const rows = ORDER.filter((k) => days.some((d) => isOn(p, k, d) && dayNumber(p, d) >= 1 && dayNumber(p, d) <= programLength(p)))
  const review = ctx.reviews.find((r) => r.weekStart === week)
  const weekNo = Math.floor((dayNumber(p, week) - 1) / 7) + 1

  return (
    <div className="lh-week">
      <div className="lh-page lh-week-page">
        <header className="lh-week-head">
          <button type="button" className="lh-icon-btn" onClick={() => setWeek(addDays(week, -7))} disabled={week <= firstWeek} aria-label="Previous week">
            <ChevronLeft size={18} strokeWidth={2.8} />
          </button>
          <div>
            <strong>Week {Math.max(1, weekNo)}</strong>
            <small>
              {dayMonth(days[0])} – {dayMonth(days[6])}
            </small>
          </div>
          <button type="button" className="lh-icon-btn" onClick={() => setWeek(addDays(week, 7))} disabled={week >= lastWeek} aria-label="Next week">
            <ChevronRight size={18} strokeWidth={2.8} />
          </button>
        </header>

        <div className="lh-grid" role="table" aria-label={`Week ${weekNo}`}>
          <div className="lh-grid-row lh-grid-row--head" role="row">
            <span role="columnheader" />
            {days.map((d) => (
              <span key={d} role="columnheader" className={cn('lh-grid-day', d === ctx.today && 'is-today')}>
                {weekdayLetter(d)}
                <small>{Number(d.slice(8))}</small>
              </span>
            ))}
            <span role="columnheader" />
          </div>

          {rows.map((k) => {
            const meta = trackMeta(k)
            const cells = days.map((d) => dayCell(ctx, k, d))
            if (k === 'mood') return <MoodRow key={k} cells={cells} today={ctx.today} onOpen={onOpen} />
            const weekly = isWeekly(k)
            const wc = weekly ? weekCount(ctx, k, week) : null
            const judged = cells.filter((c) => ['full', 'min', 'none', 'logged'].includes(c.status) && c.date <= ctx.today)
            return (
              <div key={k} className="lh-grid-row" role="row" data-color={meta.color}>
                <button type="button" className="lh-grid-name" role="rowheader" onClick={(e) => onOpen(k, e.currentTarget)}>
                  <TrackDisc track={k} size={22} />
                  {meta.name}
                </button>
                {cells.map((c) => (
                  <span
                    key={c.date}
                    role="cell"
                    className={cn('lh-cell', `is-${c.status}`, c.date === ctx.today && 'is-today')}
                    title={`${dayMonth(c.date)} · ${STATUS_LABEL[c.status]}${c.value != null && k !== 'regard' ? ` · ${Math.round(c.value)}${meta.unit === 'g' ? ' g' : meta.unit === 'min' ? ' min' : ''}` : ''}`}
                  >
                    {c.status === 'full' && <Check size={14} strokeWidth={3.6} aria-hidden="true" />}
                    {c.status === 'rest' && <Moon size={12} strokeWidth={2.8} aria-hidden="true" />}
                    {c.status === 'unknown' && <i aria-hidden="true">?</i>}
                    <span className="sr-only">{STATUS_LABEL[c.status]}</span>
                  </span>
                ))}
                <span className="lh-grid-end" role="cell">
                  {wc && wc.target != null ? (
                    <Ring value={wc.done} max={wc.target} size={30} label={`${wc.done} of ${wc.target}`} />
                  ) : (
                    <small>
                      {judged.filter((c) => isDone(c.status)).length}/{judged.length}
                    </small>
                  )}
                </span>
              </div>
            )
          })}
        </div>

        <ul className="lh-legend" aria-label="Legend">
          <li>
            <span className="lh-cell is-full" data-color="grape">
              <Check size={11} strokeWidth={3.6} />
            </span>
            Done
          </li>
          <li>
            <span className="lh-cell is-min" data-color="grape" /> Small version
          </li>
          <li>
            <span className="lh-cell is-rest">
              <Moon size={10} strokeWidth={2.8} />
            </span>
            Rest
          </li>
          <li>
            <span className="lh-cell is-none" /> Nothing logged
          </li>
        </ul>
      </div>

      {review ? (
        <section className="lh-page lh-week-review">
          <p className="lh-kicker">The bench, this week</p>
          <p>
            Self-trust <b>{review.selfTrust}/10</b>
            {review.win && <> · win: {review.win}</>}
          </p>
          {review.obstacle && <p className="lh-small">In the way: {review.obstacle}</p>}
          {review.adjustment && <p className="lh-small">Adjusting: {review.adjustment}</p>}
          {review.ifThen && <p className="lh-small">If-then: {review.ifThen}</p>}
          {review.changes.length > 0 && <p className="lh-small">Targets: {review.changes.map((c) => `${trackMeta(c.track).name} ${c.fromTarget ?? 'auto'} → ${c.toTarget ?? 'auto'}`).join(' · ')}</p>}
        </section>
      ) : (
        week <= thisWeek && (
          <button type="button" className="lh-notice" data-color="lemon" onClick={(e) => onReview(week, e.currentTarget)}>
            <span className="lh-notice-icon">
              <Armchair size={17} strokeWidth={2.6} aria-hidden="true" />
            </span>
            <span className="lh-notice-text">
              <strong>Review this week</strong>
              <small>One number, one win, one change</small>
            </span>
          </button>
        )
      )}
      <p className="lh-sky-note">Weekly tracks are judged on Sunday, never before. A quiet day is grey, never red.</p>
    </div>
  )
}

/** Mood as a line across the week: height is the score, one quiet hue, no colour that means "bad". */
function MoodRow({ cells, today, onOpen }: { cells: DayCell[]; today: string; onOpen: (track: ProgramTrackKey, el: HTMLElement) => void }) {
  const y = (v: number) => 1 - (v - 1) / 4
  const pts = cells.map((c, i) => (c.status === 'logged' && c.value != null ? { x: (i + 0.5) / 7, y: y(c.value), c } : null))
  const segments: string[] = []
  let run: string[] = []
  for (const p of pts) {
    if (p) run.push(`${p.x},${0.12 + p.y * 0.76}`)
    else {
      if (run.length > 1) segments.push(run.join(' '))
      run = []
    }
  }
  if (run.length > 1) segments.push(run.join(' '))
  return (
    <div className="lh-grid-row lh-grid-row--mood" role="row" data-color="dusk">
      <button type="button" className="lh-grid-name" role="rowheader" onClick={(e) => onOpen('mood', e.currentTarget)}>
        <TrackDisc track="mood" size={22} />
        Mood
      </button>
      <span className="lh-mood-lane" role="cell">
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          {segments.map((s, i) => (
            <polyline key={i} points={s} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        {pts.map((p, i) =>
          p ? (
            <span
              key={i}
              className={cn('lh-mood-dot', p.c.date === today && 'is-today')}
              style={{
                left: `${p.x * 100}%`,
                top: `${(0.12 + p.y * 0.76) * 100}%`,
              }}
              title={`${dayMonth(p.c.date)} · ${MOOD_SCALE[(p.c.value ?? 3) - 1]?.word}${p.c.source === 'mind' ? ' (from Mind)' : ''}`}
            >
              <span className="sr-only">{MOOD_SCALE[(p.c.value ?? 3) - 1]?.word}</span>
            </span>
          ) : null,
        )}
      </span>
      <span className="lh-grid-end" role="cell">
        <small>{pts.filter(Boolean).length}/7</small>
      </span>
    </div>
  )
}

export { WeekView }
