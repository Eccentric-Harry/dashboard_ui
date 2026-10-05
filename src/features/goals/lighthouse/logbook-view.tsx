import type { MouseEvent } from 'react'
import { Flag, HeartHandshake, Lock, Mail, X } from 'lucide-react'
import type { ProgramAssessment, ProgramMedia, ProgramTrackKey } from '@/types/program'
import { CampSheet } from '../components/camp-sheet'
import { addDays } from '../goal-format'
import { C25K, TRACKS } from './program-content'
import {
  MILESTONES,
  c25kDone,
  consistency,
  dayCell,
  dayNumber,
  evidenceCount,
  isDone,
  isOn,
  keptPromises,
  nextMilestone,
  programLength,
  type ProgramCtx,
} from './program-engine'
import { Photo } from './checkpoint-sheet'
import { RecordingPlayer } from './speak-studio'
import { TrackDisc } from './lh-ui'
import { dayMonth, formatMinutes } from './lh-utils'

type LogbookViewProps = {
  ctx: ProgramCtx
  assessments: ProgramAssessment[]
  media: ProgramMedia[]
  onKept: (el: HTMLElement) => void
  onCheckpoint: (el: HTMLElement) => void
  onLetters: (el: HTMLElement) => void
  onOpen: (track: ProgramTrackKey, el: HTMLElement) => void
}

/**
 * A one-series line over weeks or days: hairline gridlines at the scale's ends and middle,
 * a 2px line, 8px points with a tooltip each, and a label on the latest value only.
 */
function LineChart({ points, min, max, ticks, label }: { points: { x: string; tick: string; y: number }[]; min: number; max: number; ticks: number[]; label: string }) {
  const W = 320
  const H = 116
  const L = 22
  const R = 18
  const T = 10
  const B = 22
  const px = (i: number) => (points.length === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (points.length - 1))
  const py = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B)
  const last = points[points.length - 1]
  return (
    <svg className="lh-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${points.map((p) => `${p.x} ${p.y}`).join(', ')}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line className="lh-chart-grid" x1={L} x2={W - R} y1={py(t)} y2={py(t)} />
          <text className="lh-chart-tick" x={L - 6} y={py(t) + 3.5} textAnchor="end">
            {t}
          </text>
        </g>
      ))}
      {points.length > 1 && <polyline className="lh-chart-line" points={points.map((p, i) => `${px(i)},${py(p.y)}`).join(' ')} />}
      {points.map((p, i) => (
        <g key={i}>
          <circle className="lh-chart-dot" cx={px(i)} cy={py(p.y)} r={4.5} />
          <circle className="lh-chart-hit" cx={px(i)} cy={py(p.y)} r={12}>
            <title>{`${p.x}: ${p.y}`}</title>
          </circle>
          {(points.length <= 8 || i === 0 || i === points.length - 1) && (
            <text className="lh-chart-tick" x={px(i)} y={H - 6} textAnchor="middle">
              {p.tick}
            </text>
          )}
        </g>
      ))}
      {last && (
        <text className="lh-chart-label" x={px(points.length - 1)} y={py(last.y) - 9} textAnchor="middle">
          {last.y}
        </text>
      )}
    </svg>
  )
}

/** The latest of a slow measure, with where it started. */
function Measure({ label, scale, values, empty }: { label: string; scale: string; values: number[]; empty: string }) {
  const latest = values[values.length - 1]
  const first = values[0]
  return (
    <div className="lh-measure">
      <p className="lh-measure-label">
        {label} <small>{scale}</small>
      </p>
      {values.length ? (
        <p className="lh-measure-value">
          <strong>{latest}</strong>
          <small>{values.length > 1 ? `from ${first} on day 1` : 'on day 1'}</small>
        </p>
      ) : (
        <p className="lh-measure-empty">{empty}</p>
      )}
    </div>
  )
}

/**
 * The logbook, read top to bottom like a story: the evidence pile (kept promises toward the
 * lamp at 25, 50 and 100), four numbers that only grow, how you see yourself (self-trust from
 * the reviews and the two questionnaires), day 1 beside now, then every track's story and the
 * recordings. Nothing here is ranked or compared with anyone.
 */
function LogbookView({ ctx, assessments, media, onKept, onCheckpoint, onLetters, onOpen }: LogbookViewProps) {
  const p = ctx.program
  const kept = keptPromises(ctx.logs)
  const next = nextMilestone(kept)
  const prev = [...MILESTONES].reverse().find((m) => m <= kept) ?? 0
  const recent = ctx.logs.filter((l) => l.track === 'regard' && l.text).slice(-3).reverse()
  const trust = ctx.reviews.map((r, i) => ({ x: `Week of ${dayMonth(r.weekStart)}`, tick: `W${i + 1}`, y: r.selfTrust }))
  const rse = assessments.filter((a) => a.type === 'ROSENBERG' && a.score != null).map((a) => a.score as number)
  const who5 = assessments.filter((a) => a.type === 'WHO5' && a.score != null).map((a) => a.score as number)
  const body = assessments.filter((a) => a.type === 'BODY')
  const recordings = media.filter((m) => m.kind === 'AUDIO')
  const day = Math.min(programLength(p), Math.max(0, dayNumber(p, ctx.today)))
  const at = (fn: (el: HTMLElement) => void) => (e: MouseEvent<HTMLElement>) => fn(e.currentTarget)
  const shown = body.length ? [body[0], ...(body.length > 1 ? [body[body.length - 1]] : [])] : []
  const photos = shown.some((a) => (a.mediaIds?.length ?? 0) > 0)

  return (
    <div className="lh-logbook">
      <section className="lh-lb-hero" data-color="berry">
        <button type="button" className="lh-lb-hero-main" onClick={at(onKept)}>
          <span className="lh-lb-hero-icon" aria-hidden="true">
            <HeartHandshake size={26} strokeWidth={2.4} />
          </span>
          <span className="lh-lb-hero-text">
            <strong>{kept}</strong>
            <span>kept promise{kept === 1 ? '' : 's'} · every one a stone</span>
          </span>
        </button>
        {next ? (
          <div className="lh-lb-progress">
            <span className="lh-lb-bar" aria-hidden="true">
              <i style={{ width: `${((kept - prev) / (next - prev)) * 100}%` }} />
            </span>
            <small>
              {next - kept} more to {next === 25 ? 'the lamp room' : next === 50 ? 'light the lamp' : 'the beam'}
            </small>
          </div>
        ) : (
          <p className="lh-small">The beam is on. Every one past 100 is a brighter light.</p>
        )}
        {recent.length > 0 ? (
          <ul className="lh-lb-recent">
            {recent.map((l) => (
              <li key={l.id}>
                <span>{l.text}</span>
                <small>{dayMonth(l.date)}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="lh-small">Your first kept promise lays the first stone.</p>
        )}
      </section>

      <section className="lh-kpis" aria-label="Your 90 days so far">
        <div className="lh-kpi">
          <strong>{day}</strong>
          <span>days walked</span>
        </div>
        <div className="lh-kpi">
          <strong>{evidenceCount(ctx.logs)}</strong>
          <span>times you showed up</span>
        </div>
        <div className="lh-kpi">
          <strong>
            {c25kDone(ctx.logs)}
            <small>/{C25K.length}</small>
          </strong>
          <span>coach runs</span>
        </div>
        <div className="lh-kpi">
          <strong>{ctx.logs.filter((l) => l.urge).length}</strong>
          <span>urges ridden out</span>
        </div>
      </section>

      <section className="lh-page lh-lb-section">
        <h3 className="lh-section-title">
          How you see yourself
          <button type="button" className="lh-section-link" onClick={at(onCheckpoint)}>
            <Flag size={13} strokeWidth={2.8} aria-hidden="true" /> Check-ins
          </button>
        </h3>
        <div className="lh-lb-card" data-color="lemon">
          <p className="lh-measure-label">
            Self-trust <small>weekly · “I trust myself to do what I say I will”</small>
          </p>
          {trust.length > 0 ? <LineChart points={trust} min={1} max={10} ticks={[1, 5, 10]} label="Self-trust by week" /> : <p className="lh-measure-empty">Your first weekly review sets the first point.</p>}
        </div>
        <div className="lh-lb-pair">
          <Measure label="Self-esteem" scale="0–30" values={rse} empty="Days 1, 45 and 90" />
          <Measure label="Well-being" scale="0–100" values={who5} empty="Every two weeks" />
        </div>
      </section>

      <section className="lh-page lh-lb-section">
        <h3 className="lh-section-title">Day 1 and now</h3>
        {shown.length === 0 ? (
          <p className="lh-measure-empty">Day-1 photos and measurements live here — never on the main screen.</p>
        ) : photos ? (
          <div className="lh-compare">
            {shown.map((a) => (
              <figure key={a.id} className="lh-compare-col">
                <Photo programId={p.id} mediaId={a.mediaIds?.[0]} />
                <figcaption>
                  Day {Math.max(1, dayNumber(p, a.date))}
                  {a.weightKg != null && ` · ${a.weightKg} kg`}
                  {a.waistCm != null && ` · ${a.waistCm} cm waist`}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="lh-lb-pair">
            {shown.map((a) => (
              <div key={a.id} className="lh-measure">
                <p className="lh-measure-label">Day {Math.max(1, dayNumber(p, a.date))}</p>
                <p className="lh-measure-value">
                  <strong>{a.weightKg ?? '—'}</strong>
                  <small>kg{a.waistCm != null ? ` · ${a.waistCm} cm waist` : ''}</small>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="lh-page lh-lb-section">
        <h3 className="lh-section-title">Every track so far</h3>
        <ul className="lh-tracks-table">
          {TRACKS.filter((t) => isOn(p, t.key, ctx.today) || ctx.logs.some((l) => l.track === t.key)).map((t) => (
            <li key={t.key} data-color={t.color}>
              <button type="button" onClick={at((el) => onOpen(t.key, el))}>
                <TrackDisc track={t.key} size={30} />
                <span className="lh-tt-text">
                  <span className="lh-tt-name">{t.name}</span>
                  <span className="lh-tt-stat">{trackStory(ctx, t.key)}</span>
                </span>
                <span className="lh-tt-pct" title="Done on the days that counted, last 14 days">
                  {pctOf(ctx, t.key)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {recordings.length > 0 && (
        <section className="lh-page lh-lb-section">
          <h3 className="lh-section-title">Hear the change</h3>
          <div className="lh-rec-compare">
            <RecordingPlayer programId={p.id} mediaId={recordings[0].id} label={`First · ${dayMonth(recordings[0].date)}`} />
            {recordings.length > 1 && <RecordingPlayer programId={p.id} mediaId={recordings[recordings.length - 1].id} label={`Latest · ${dayMonth(recordings[recordings.length - 1].date)}`} />}
          </div>
        </section>
      )}

      <button type="button" className="lh-notice" data-color="berry" onClick={at(onLetters)}>
        <span className="lh-notice-icon">{p.letters.to23?.sealed ? <Lock size={16} strokeWidth={2.6} /> : <Mail size={16} strokeWidth={2.6} />}</span>
        <span className="lh-notice-text">
          <strong>{p.letters.to23 ? (p.letters.to23.sealed ? 'Your letter to 23 is sealed' : 'Read your letter to 23') : 'Write to 23-year-old you'}</strong>
          <small>{p.letters.to23?.sealed ? `Opens ${dayMonth(p.letters.to23.opensOn ?? p.endDate)} · and there’s a reply from 23 to write` : 'Letters in a bottle'}</small>
        </span>
      </button>
    </div>
  )
}

function pctOf(ctx: ProgramCtx, key: ProgramTrackKey) {
  const c = consistency(ctx, key)
  return c.pct == null ? '' : `${Math.round(c.pct * 100)}%`
}

/** One honest line per track — totals only ever grow. */
function trackStory(ctx: ProgramCtx, key: ProgramTrackKey): string {
  const logs = ctx.logs.filter((l) => l.track === key)
  const p = ctx.program
  const days = (pred: (d: string) => boolean) => {
    let n = 0
    for (let d = p.startDate; d <= ctx.today && d <= p.endDate; d = addDays(d, 1)) if (pred(d)) n++
    return n
  }
  switch (key) {
    case 'run': {
      const sessions = days((d) => isDone(dayCell(ctx, 'run', d).status))
      const km = logs.reduce((n, l) => n + (l.distanceKm ?? 0), 0) + Object.entries(ctx.sources.runs).filter(([d]) => d >= p.startDate).reduce((n, [, r]) => n + r.km, 0)
      return `${sessions} runs${km > 0 ? ` · ${km.toFixed(1)} km` : ''} · C25K ${c25kDone(ctx.logs)}/${C25K.length}`
    }
    case 'lift': {
      const sessions = days((d) => isDone(dayCell(ctx, 'lift', d).status))
      const withSets = logs.filter((l) => l.sets?.length)
      if (withSets.length >= 2) {
        const firstSet = withSets[0].sets![0]
        const later = [...withSets].reverse().find((l) => l.sets!.some((s) => s.exercise === firstSet.exercise))
        const last = later?.sets!.find((s) => s.exercise === firstSet.exercise)
        if (last && (last.weightKg ?? 0) !== (firstSet.weightKg ?? 0)) return `${sessions} sessions · ${firstSet.exercise} ${firstSet.weightKg ?? 0} → ${last.weightKg ?? 0} kg`
        if (last && (last.reps ?? 0) !== (firstSet.reps ?? 0)) return `${sessions} sessions · ${firstSet.exercise} ${firstSet.reps} → ${last.reps} reps`
      }
      return `${sessions} sessions`
    }
    case 'protein': {
      const known = days((d) => dayNumber(p, d) > 7 && ['full', 'min', 'logged'].includes(dayCell(ctx, 'protein', d).status))
      const hit = days((d) => dayNumber(p, d) > 7 && isDone(dayCell(ctx, 'protein', d).status))
      return known ? `${hit} of ${known} known days at target or floor` : 'Read from Nutrition'
    }
    case 'mood': {
      const n = days((d) => dayCell(ctx, 'mood', d).status === 'logged')
      return `${n} check-in${n === 1 ? '' : 's'}`
    }
    case 'learn':
      return `${days((d) => isDone(dayCell(ctx, 'learn', d).status))} focused days`
    case 'english': {
      const minutes = logs.reduce((n, l) => n + (l.minutes ?? 0), 0)
      const stretches = logs.filter((l) => l.stretch).length
      return `${formatMinutes(minutes)} spoken${stretches ? ` · ${stretches} meeting stretch${stretches === 1 ? '' : 'es'}` : ''}`
    }
    case 'regard':
      return `${keptPromises(ctx.logs)} kept`
  }
}

/** Every kept promise, newest first — the evidence pile, readable. */
function KeptSheet({ open, origin, ctx, onClose }: { open: boolean; origin: HTMLElement | null; ctx: ProgramCtx | null; onClose: () => void }) {
  const list = ctx ? ctx.logs.filter((l) => l.track === 'regard' && l.text).slice().reverse() : []
  return (
    <CampSheet open={open} onRequestClose={onClose} origin={origin} labelledBy="lh-kept-title" width={560} color="berry">
      <div className="lh-sheet" data-color="berry">
        <header className="lh-sheet-head">
          <div className="lh-sheet-title">
            <h2 id="lh-kept-title">{list.length} kept promise{list.length === 1 ? '' : 's'}</h2>
            <p>Each one is a stone in the tower — and each one really happened.</p>
          </div>
          <button type="button" className="cs-icon" onClick={onClose} aria-label="Close" data-autofocus>
            <X size={18} strokeWidth={2.6} />
          </button>
        </header>
        <div className="lh-sheet-body">
          {list.length === 0 ? (
            <p className="lh-small">Nothing here yet. The first one is the hardest and the most important.</p>
          ) : (
            <ol className="lh-kept-list">
              {list.map((l, i) => (
                <li key={l.id}>
                  <span className="lh-kept-n">{list.length - i}</span>
                  <div>
                    <p>{l.text}</p>
                    {l.kind && <p className="lh-kept-kind">{l.kind}</p>}
                  </div>
                  <small>{dayMonth(l.date)}</small>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </CampSheet>
  )
}

export { LogbookView, KeptSheet }
