// The Lighthouse's rules — pure functions over GET /program, pinned by
// __tests__/lighthouse.test.ts. The brief's six rules live here (design/LIGHTHOUSE_90_PLAN.md):
//   1. a minimum-version log is done (drawn lighter), never "partial";
//   2. consistency is a 14-day percentage — there is no streak anywhere;
//   3. one miss changes nothing; two in a row → a gentle question; three → a smaller target;
//   4. weekly tracks are judged at week's end only, and a rest day is never "missed";
//   5. mood is never judged — no done, no %, no colour scale that means "bad";
//   6. targets change only through the weekly review — history is judged by the target in
//      effect on each day (review changes apply from the day they were decided).
// Plus the camp's: unknown ≠ missed (a day without food logged is unknown protein), and no
// food nudges (protein never triggers a nudge).

import type {
  Program,
  ProgramAssessment,
  ProgramAssessmentType,
  ProgramLog,
  ProgramReview,
  ProgramSources,
  ProgramTrack,
  ProgramTrackKey,
} from '@/types/program'
import { addDays, goalDay } from '../goal-format'
import { C25K, PHASES, TRACKS, trackMeta, type LiftDay, type PhaseInfo, type RunSession } from './program-content'

export const PROGRAM_DAYS = 90
/** Phases and track openings are written for 90 days; a longer or shorter program scales them. */
const scaleDay = (day: number, length: number) => (length === PROGRAM_DAYS ? day : Math.max(1, Math.round((day / PROGRAM_DAYS) * length)))

export interface ProgramCtx {
  program: Program
  logs: ProgramLog[]
  reviews: ProgramReview[]
  sources: ProgramSources
  /** The local goal-day (04:00 rollover). */
  today: string
}

// ── Days and phases ─────────────────────────────────────────────────────

const toUtc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
export const daysBetween = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / 86_400_000)
export const weekStartOf = (iso: string) => addDays(iso, -((new Date(toUtc(iso)).getUTCDay() + 6) % 7))

export const programLength = (p: Program) => daysBetween(p.startDate, p.endDate) + 1
/** 1-based: day 1 is the start date. ≤ 0 before it begins, > length after it ends. */
export const dayNumber = (p: Program, date: string) => daysBetween(p.startDate, date) + 1
export const dateOfDay = (p: Program, day: number) => addDays(p.startDate, day - 1)

export function phaseOf(p: Program, day: number): PhaseInfo | null {
  const length = programLength(p)
  if (day < 1 || day > length) return null
  return (
    PHASES.find((ph) => day >= scaleDay(ph.from, length) && day <= (ph.to === PROGRAM_DAYS ? length : scaleDay(ph.to, length))) ??
    PHASES[PHASES.length - 1]
  )
}

/** The phase's first and last day for this program. */
export function phaseRange(p: Program, phase: PhaseInfo): [number, number] {
  const length = programLength(p)
  return [scaleDay(phase.from, length), phase.to === PROGRAM_DAYS ? length : scaleDay(phase.to, length)]
}

/** The day a track opens on the schedule (tracks are staged so they don't all start at once). */
export const scheduledDay = (p: Program, key: ProgramTrackKey) => scaleDay(trackMeta(key).opensDay, programLength(p))
/** The day a track actually opens: its scheduled day, or earlier if the user started it now. */
export const opensDay = (p: Program, key: ProgramTrackKey) => {
  const scheduled = scheduledDay(p, key)
  const early = p.tracks.find((t) => t.key === key)?.openedOn
  return early ? Math.min(scheduled, Math.max(1, dayNumber(p, early))) : scheduled
}
/** Started before its scheduled day. */
export const startedEarly = (p: Program, key: ProgramTrackKey) => opensDay(p, key) < scheduledDay(p, key)
export const isOn = (p: Program, key: ProgramTrackKey, date: string) => dayNumber(p, date) >= opensDay(p, key)
/** Audit week: screen and protein are watched, not judged. */
export const isBaseline = (p: Program, key: ProgramTrackKey, date: string) =>
  (key === 'screen' || key === 'protein') && dayNumber(p, date) <= phaseRange(p, PHASES[0])[1]

export const trackOf = (p: Program, key: ProgramTrackKey): ProgramTrack => p.tracks.find((t) => t.key === key) ?? { key }

/** Tracks on today, in the program's order. */
export const activeTracks = (p: Program, today: string) =>
  TRACKS.map((t) => t.key).filter((k) => p.tracks.some((t) => t.key === k) && isOn(p, k, today))
export const upcomingTracks = (p: Program, today: string) =>
  TRACKS.map((t) => t.key).filter((k) => p.tracks.some((t) => t.key === k) && !isOn(p, k, today))

// ── Targets in effect (rule 6) ─────────────────────────────────────────

/** The local day a review was decided — its changes apply from then on. */
export const decidedOn = (r: ProgramReview) => (r.createdAt ? goalDay(new Date(r.createdAt)) : r.weekStart)

/** The target and floor that applied on `date`, replaying review changes in order. */
export function targetOn(ctx: Pick<ProgramCtx, 'program' | 'reviews'>, key: ProgramTrackKey, date: string): { target: number | null; floor: number | null } {
  const track = trackOf(ctx.program, key)
  const changes = ctx.reviews
    .flatMap((r) => (r.changes ?? []).filter((c) => c.track === key).map((c) => ({ from: decidedOn(r), c })))
    .sort((a, b) => a.from.localeCompare(b.from))
  if (changes.length === 0) return { target: track.target ?? null, floor: track.floor ?? null }
  let target = changes[0].c.fromTarget ?? null
  let floor = changes[0].c.fromFloor ?? null
  for (const { from, c } of changes) {
    if (date < from) break
    target = c.toTarget ?? null
    floor = c.toFloor ?? null
  }
  return { target, floor }
}

// ── The screen cap ─────────────────────────────────────────────────────

const round5 = (n: number) => Math.round(n / 5) * 5
/** Where the cap heads: two hours a day (Pieh et al. 2025). */
export const SCREEN_GOAL_MIN = 120

/** Screen minutes logged per day (the latest log with a value wins). */
export function screenMinutes(logs: ProgramLog[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const l of logs) if (l.track === 'screen' && l.value != null) out.set(l.date, l.value)
  return out
}

/** The audit week's average, once at least three of its days are logged. */
export function auditAverage(ctx: Pick<ProgramCtx, 'program' | 'logs'>): number | null {
  const [, auditEnd] = phaseRange(ctx.program, PHASES[0])
  const vals = [...screenMinutes(ctx.logs).entries()]
    .filter(([d]) => dayNumber(ctx.program, d) >= 1 && dayNumber(ctx.program, d) <= auditEnd)
    .map(([, v]) => v)
  if (vals.length < 3) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/**
 * The cap on `date`: a review's number if one was set, otherwise derived — 20% under the
 * audit average from Foundation, then a third of the way to 120 min every two weeks of the
 * Push (three steps), held through Lock in. Null during the audit or before there's data.
 */
export function capOn(ctx: Pick<ProgramCtx, 'program' | 'logs' | 'reviews'>, date: string): number | null {
  const set = targetOn(ctx, 'screen', date).target
  if (set != null) return set
  const p = ctx.program
  const day = dayNumber(p, date)
  const [, auditEnd] = phaseRange(p, PHASES[0])
  if (day <= auditEnd) return null
  const avg = auditAverage(ctx)
  if (avg == null) return null
  let cap = avg <= SCREEN_GOAL_MIN ? round5(avg) : Math.max(SCREEN_GOAL_MIN, round5(avg * 0.8))
  const [pushStart] = phaseRange(p, PHASES[2])
  const steps = day < pushStart ? 0 : Math.min(3, Math.floor((day - pushStart) / 14) + 1)
  for (let i = 0; i < steps; i++) {
    if (cap <= SCREEN_GOAL_MIN) break
    cap = Math.max(SCREEN_GOAL_MIN, round5(cap - (cap - SCREEN_GOAL_MIN) / 3))
  }
  return cap
}

// ── A day on a track ───────────────────────────────────────────────────

/**
 * full / min — done (min drawn lighter). rest — a planned rest day. logged — showed up, not
 * judged (mood, baseline weeks, screen over its cap, protein under its floor). none — nothing
 * yet (neutral grey, never red). unknown — no data to judge (no food logged). off — before the
 * track opens. future — not yet.
 */
export type DayStatus = 'full' | 'min' | 'rest' | 'logged' | 'none' | 'unknown' | 'off' | 'future'
export type CellSource = 'manual' | 'strava' | 'focus' | 'nutrition' | 'mind'

export interface DayCell {
  date: string
  status: DayStatus
  /** Minutes, grams, score… whatever the track counts that day. */
  value?: number
  source?: CellSource
}

export const isDone = (s: DayStatus) => s === 'full' || s === 'min'

const LEVEL_RANK = { FULL: 3, MIN: 2, REST: 1 } as const

/** The day's best explicit level across logs: FULL beats MIN beats REST. */
function bestLevel(logs: ProgramLog[]): DayStatus | null {
  let best: keyof typeof LEVEL_RANK | null = null
  for (const l of logs) if (l.level && (!best || LEVEL_RANK[l.level] > LEVEL_RANK[best])) best = l.level
  return best === 'FULL' ? 'full' : best === 'MIN' ? 'min' : best === 'REST' ? 'rest' : null
}

export const logsOn = (logs: ProgramLog[], key: ProgramTrackKey, date: string) => logs.filter((l) => l.track === key && l.date === date)

export function dayCell(ctx: ProgramCtx, key: ProgramTrackKey, date: string): DayCell {
  const p = ctx.program
  if (date > ctx.today) return { date, status: 'future' }
  const day = dayNumber(p, date)
  if (day < 1 || day > programLength(p)) return { date, status: 'off' }
  const mine = logsOn(ctx.logs, key, date)

  if (key === 'mood') {
    const own = [...mine].reverse().find((l) => l.value != null)
    if (own) return { date, status: 'logged', value: own.value ?? undefined, source: 'manual' }
    const mind = ctx.sources.mood[date]
    return mind != null ? { date, status: 'logged', value: mind, source: 'mind' } : { date, status: 'none' }
  }

  if (!isOn(p, key, date)) {
    // A track that hasn't opened still shows anything logged early, unjudged.
    return mine.length ? { date, status: 'logged' } : { date, status: 'off' }
  }

  const level = bestLevel(mine)

  switch (key) {
    case 'run': {
      if (level) return { date, status: level, source: 'manual', value: sumMinutes(mine) || undefined }
      const strava = ctx.sources.runs[date]
      if (strava && strava.count > 0) return { date, status: 'full', source: 'strava', value: Math.round(strava.minutes) }
      return { date, status: 'none' }
    }
    case 'lift':
      return level ? { date, status: level, source: 'manual' } : { date, status: 'none' }
    case 'learn': {
      if (level === 'full' || level === 'rest') return { date, status: level, source: 'manual' }
      const focus = ctx.sources.focus[date] ?? 0
      if (focus >= 25) return { date, status: 'full', source: 'focus', value: focus }
      if (level === 'min') return { date, status: 'min', source: 'manual' }
      if (focus >= 10) return { date, status: 'min', source: 'focus', value: focus }
      return { date, status: 'none' }
    }
    case 'english': {
      const { target, floor } = targetOn(ctx, key, date)
      const minutes = sumMinutes(mine)
      if (level === 'full' || (target != null && minutes >= target)) return { date, status: 'full', value: minutes || undefined, source: 'manual' }
      if (level === 'min' || (floor != null && minutes >= floor)) return { date, status: 'min', value: minutes || undefined, source: 'manual' }
      if (level === 'rest') return { date, status: 'rest' }
      return minutes > 0 ? { date, status: 'logged', value: minutes, source: 'manual' } : { date, status: 'none' }
    }
    case 'protein': {
      const manual = [...mine].reverse().find((l) => l.value != null)?.value ?? null
      const auto = ctx.sources.protein[date] ?? null
      const grams = Math.max(manual ?? -1, auto ?? -1)
      const known = grams >= 0
      const source: CellSource = manual != null && (auto == null || manual >= auto) ? 'manual' : 'nutrition'
      if (isBaseline(p, key, date)) return known ? { date, status: 'logged', value: grams, source } : { date, status: 'unknown' }
      const { target, floor } = targetOn(ctx, key, date)
      if (level === 'full' || (known && target != null && grams >= target)) return { date, status: 'full', value: known ? grams : undefined, source }
      if (level === 'min' || (known && floor != null && grams >= floor)) return { date, status: 'min', value: known ? grams : undefined, source }
      return known ? { date, status: 'logged', value: grams, source } : { date, status: 'unknown' }
    }
    case 'screen': {
      const minutes = screenMinutes(mine).get(date)
      if (minutes == null) return { date, status: 'none' }
      if (isBaseline(p, key, date)) return { date, status: 'logged', value: minutes, source: 'manual' }
      const cap = capOn(ctx, date)
      if (cap != null && minutes <= cap) return { date, status: 'full', value: minutes, source: 'manual' }
      const yesterday = screenMinutes(ctx.logs).get(addDays(date, -1))
      if (yesterday != null && minutes < yesterday) return { date, status: 'min', value: minutes, source: 'manual' }
      return { date, status: 'logged', value: minutes, source: 'manual' }
    }
    case 'regard': {
      const kept = mine.filter((l) => l.text?.trim())
      if (kept.length === 0) return { date, status: 'none' }
      return { date, status: kept.some((l) => l.kind?.trim()) ? 'full' : 'min', value: kept.length, source: 'manual' }
    }
    default:
      return { date, status: 'none' }
  }
}

function sumMinutes(logs: ProgramLog[]): number {
  return logs.reduce((n, l) => n + (l.minutes ?? (l.track === 'english' && l.value != null ? l.value : 0)), 0)
}

export const isWeekly = (key: ProgramTrackKey) => trackMeta(key).kind === 'weekly'

// ── Weeks (rule 4) ─────────────────────────────────────────────────────

export const weekDates = (weekStart: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

/** Sessions (days done) in a week against the target in effect at its end. */
export function weekCount(ctx: ProgramCtx, key: ProgramTrackKey, weekStart: string): { done: number; target: number | null } {
  const days = weekDates(weekStart)
  const done = days.filter((d) => isDone(dayCell(ctx, key, d).status)).length
  return { done, target: targetOn(ctx, key, days[6]).target }
}

// ── Consistency over 14 days (rule 2) ──────────────────────────────────

export interface Consistency {
  done: number
  /** Days that could be judged (daily), or the sessions the target asked for (weekly). */
  possible: number
  /** 0–1, null when nothing could be judged yet — never shown as 0%. */
  pct: number | null
}

export function consistency(ctx: ProgramCtx, key: ProgramTrackKey, windowDays = 14): Consistency {
  if (key === 'mood') return { done: 0, possible: 0, pct: null }
  let done = 0
  let judged = 0
  let expected = 0
  for (let i = windowDays - 1; i >= 0; i--) {
    const date = addDays(ctx.today, -i)
    const cell = dayCell(ctx, key, date)
    const isToday = date === ctx.today
    if (cell.status === 'off' || cell.status === 'future' || cell.status === 'unknown') continue
    if (isBaseline(ctx.program, key, date)) continue
    // Today only counts once it's done — an open day is never a miss.
    if (isToday && !isDone(cell.status)) continue
    if (isDone(cell.status)) done++
    if (isWeekly(key)) expected += (targetOn(ctx, key, date).target ?? 0) / 7
    else if (cell.status !== 'rest') judged++
  }
  if (isWeekly(key)) {
    const possible = Math.round(expected * 10) / 10
    return { done, possible, pct: expected > 0 ? Math.min(1, done / expected) : null }
  }
  return { done, possible: judged, pct: judged > 0 ? done / judged : null }
}

// ── Gaps (rule 3) ──────────────────────────────────────────────────────

/**
 * How many days (daily tracks) or weeks (weekly tracks) in a row a track has gone without,
 * counting back from yesterday / last week. Today and this week never count. Mood never
 * counts, protein never counts (no food nudges), and an unknown or rest day ends the run.
 */
export function quietRun(ctx: ProgramCtx, key: ProgramTrackKey): number {
  if (key === 'mood' || key === 'protein') return 0
  if (isWeekly(key)) {
    let n = 0
    let week = addDays(weekStartOf(ctx.today), -7)
    while (true) {
      const days = weekDates(week)
      // Only weeks the track was on for all seven days are judged.
      if (!isOn(ctx.program, key, days[0]) || dayNumber(ctx.program, days[0]) < 1) break
      const { done, target } = weekCount(ctx, key, week)
      if (target == null || done >= target) break
      n++
      week = addDays(week, -7)
    }
    return n
  }
  let n = 0
  let date = addDays(ctx.today, -1)
  while (true) {
    const cell = dayCell(ctx, key, date)
    if (cell.status !== 'none' || isBaseline(ctx.program, key, date)) break
    n++
    date = addDays(date, -1)
  }
  return n
}

// ── Evidence ───────────────────────────────────────────────────────────

/** Kept promises — the self-regard entries, the number the buddy celebrates most. */
export const keptPromises = (logs: ProgramLog[]) => logs.filter((l) => l.track === 'regard' && l.text?.trim()).length

/** The lighthouse's milestones: the lamp room, the lamp lit, the beam. */
export const MILESTONES = [25, 50, 100] as const
export type LighthouseStage = 'building' | 'lamp-room' | 'lit' | 'beam'
export function lighthouseStage(kept: number): LighthouseStage {
  if (kept >= 100) return 'beam'
  if (kept >= 50) return 'lit'
  if (kept >= 25) return 'lamp-room'
  return 'building'
}
export const nextMilestone = (kept: number) => MILESTONES.find((m) => m > kept) ?? null

/** Every action that counts as showing up: done levels, urges ridden out, meeting stretches. */
export const evidenceCount = (logs: ProgramLog[]) =>
  logs.filter((l) => l.level === 'FULL' || l.level === 'MIN' || l.urge || l.stretch || (l.track === 'regard' && l.text?.trim())).length

// ── Plans: Couch to 5K and the lifting days ────────────────────────────

/** Runs done from the coach — it advances by runs completed, never by the calendar. */
export function c25kDone(logs: ProgramLog[]): number {
  const days = new Set(logs.filter((l) => l.track === 'run' && l.level === 'FULL' && l.session?.startsWith('c25k-')).map((l) => l.date))
  return days.size
}

export function nextRun(logs: ProgramLog[]): RunSession | null {
  const done = c25kDone(logs)
  return done < C25K.length ? C25K[done] : null
}

/** The lifting day to do next: whichever wasn't done last. */
export function nextLiftDay(logs: ProgramLog[], days: LiftDay[]): LiftDay {
  const last = [...logs].reverse().find((l) => l.track === 'lift' && (l.session === 'lift-a' || l.session === 'lift-b'))
  if (!last) return days[0]
  return days.find((d) => d.key !== last.session) ?? days[0]
}

/** The most recent top set logged for an exercise. */
export function lastSet(logs: ProgramLog[], exercise: string) {
  for (let i = logs.length - 1; i >= 0; i--) {
    const set = logs[i].track === 'lift' ? logs[i].sets?.find((s) => s.exercise === exercise) : undefined
    if (set) return { ...set, date: logs[i].date }
  }
  return null
}

/** Double progression: at the top of the range, add load; otherwise one more rep. */
export function progressionHint(last: { weightKg?: number | null; reps?: number | null } | null, top: number, next: string, timed = false): string {
  if (!last || last.reps == null) return 'First time: find a weight you could lift 2–3 more times.'
  const unit = timed ? 's' : 'reps'
  const load = last.weightKg ? `${last.weightKg} kg × ` : ''
  if (last.reps >= top) return `Last: ${load}${last.reps} ${unit}. Time to progress: ${next}.`
  return `Last: ${load}${last.reps} ${unit}. Today: ${timed ? 'a few seconds longer' : 'one more rep'}.`
}

// ── Checkpoints ────────────────────────────────────────────────────────

export const CHECKPOINT_DAYS: Record<ProgramAssessmentType, number[]> = {
  ROSENBERG: [1, 45, 90],
  WHO5: [1, 15, 29, 43, 57, 71, 90],
  BODY: [1, 15, 29, 43, 57, 71, 90],
}

export interface Checkpoint {
  type: ProgramAssessmentType
  /** The scheduled day (of 90). */
  day: number
  date: string
  done: boolean
}

/**
 * Each questionnaire's current checkpoint: the latest scheduled day that has arrived (from
 * the day before), done if something of that type was recorded within three days before it
 * or any time since. Null before the first one or for a finished program.
 */
export function currentCheckpoint(p: Program, assessments: ProgramAssessment[], type: ProgramAssessmentType, today: string): Checkpoint | null {
  const length = programLength(p)
  const days = CHECKPOINT_DAYS[type].map((d) => (d === PROGRAM_DAYS ? length : scaleDay(d, length)))
  const now = dayNumber(p, today)
  const due = [...days].reverse().find((d) => now >= d - 1)
  if (due == null) return null
  const date = dateOfDay(p, due)
  const done = assessments.some((a) => a.type === type && a.date >= addDays(date, -3))
  return { type, day: due, date, done }
}

export const checkpointsDue = (p: Program, assessments: ProgramAssessment[], today: string) =>
  (['BODY', 'ROSENBERG', 'WHO5'] as const)
    .map((t) => currentCheckpoint(p, assessments, t, today))
    .filter((c): c is Checkpoint => c != null && !c.done && dayNumber(p, today) <= programLength(p) + 7)

/** The next scheduled checkpoint of any type after today. */
export function nextCheckpoint(p: Program, today: string): { type: ProgramAssessmentType; date: string } | null {
  const length = programLength(p)
  const now = dayNumber(p, today)
  let best: { type: ProgramAssessmentType; date: string; day: number } | null = null
  for (const type of ['BODY', 'ROSENBERG', 'WHO5'] as const) {
    for (const d0 of CHECKPOINT_DAYS[type]) {
      const d = d0 === PROGRAM_DAYS ? length : scaleDay(d0, length)
      if (d - 1 > now && (!best || d < best.day)) best = { type, date: dateOfDay(p, d), day: d }
    }
  }
  return best ? { type: best.type, date: best.date } : null
}

/** WHO-5 at 50 or below suggests checking in with someone; two in a row, a doctor or therapist. */
export function who5Concern(assessments: ProgramAssessment[]): 'none' | 'low' | 'low-twice' {
  const scores = assessments.filter((a) => a.type === 'WHO5' && a.score != null).map((a) => a.score as number)
  if (scores.length === 0 || scores[scores.length - 1] > 50) return 'none'
  return scores.length >= 2 && scores[scores.length - 2] <= 50 ? 'low-twice' : 'low'
}

// ── Sleep (guardrail) ──────────────────────────────────────────────────

/** Three of the last four logged nights (within five days) under six hours. */
export function sleepIsShort(sources: ProgramSources, today: string): boolean {
  const nights = [0, 1, 2, 3, 4].map((i) => sources.sleep[addDays(today, -i)]).filter((m): m is number => m != null)
  const recent = nights.slice(0, 4)
  return recent.length >= 3 && recent.filter((m) => m < 360).length >= 3
}

/** Days since anything at all was logged (null if nothing ever was). */
export function daysAway(logs: ProgramLog[], today: string): number | null {
  const last = logs.reduce<string | null>((m, l) => (l.date <= today && (!m || l.date > m) ? l.date : m), null)
  return last ? daysBetween(last, today) : null
}
