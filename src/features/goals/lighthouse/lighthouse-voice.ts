// What Pip says at the lighthouse — the brief's buddy table, deterministic, every line
// swept by __tests__/lighthouse.test.ts for the "never does" column:
//   on track        → names the specific thing you did          never generic praise
//   minimum logged  → a win for showing up                      never "only" the minimum
//   two quiet days  → asks what got in the way, offers small    never guilt or countdown
//   three or more   → offers a smaller target (in the review)   never disappointment
//   low mood        → acknowledges it, nothing to fix           never advice or cheering
//   milestones      → celebrates the evidence pile              never comparison
// Plus: short sleep → suggest the small versions, not harder effort. Protein is celebrated,
// never nudged (no food nudges). No streak talk, no exclamation marks on heavy days.

import type { ProgramTrackKey } from '@/types/program'
import type { PipMood } from '../buddy-brain'
import { addDays } from '../goal-format'
import { TRACKS, fillCopy, trackMeta } from './program-content'
import {
  activeTracks,
  dayNumber,
  isOn,
  startedEarly,
  daysAway,
  decidedOn,
  isDone,
  dayCell,
  keptPromises,
  phaseOf,
  phaseRange,
  programLength,
  quietRun,
  sleepIsShort,
  targetOn,
  weekCount,
  weekStartOf,
  isWeekly,
  type ProgramCtx,
} from './program-engine'

/** Something that just happened — Pip reacts to it for a few seconds. */
export type KeeperMoment =
  | { kind: 'logged'; track: ProgramTrackKey; level: 'FULL' | 'MIN' | 'REST'; detail?: string }
  | { kind: 'mood'; score: number }
  | { kind: 'urge' }
  | { kind: 'milestone'; kept: number }
  | { kind: 'kept'; kept: number }
  | { kind: 'checkpoint' }
  | { kind: 'review' }
  | { kind: 'letter'; sealedUntil?: string | null }
  | { kind: 'stretch' }

/** An action Pip's line can offer. */
export type KeeperOffer = { kind: 'small'; track: ProgramTrackKey } | { kind: 'review'; track: ProgramTrackKey }

export interface KeeperLine {
  mood: PipMood
  line: string
  offer?: KeeperOffer
}

/** Picks one of a few lines, stable for the day so Pip doesn't flicker on re-render. */
const pick = (lines: string[], seed: string) => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return lines[Math.abs(h) % lines.length]
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

const MIN_LINES = [
  'Small version, still done. Showing up on a hard day is the whole skill.',
  'That counts. Small versions are how habits survive bad days.',
  'Done is done. Lighter stone, same tower.',
]

const LOW_MOOD_LINES = ['Heavy one. Noted. Nothing to fix tonight.', 'Thanks for writing it down. That’s all today needs.', 'Logged. Weather passes; the lighthouse stays.']

const MOOD_LINES = ['Noted. Weather, not a verdict.', 'Logged. One more dot on the timeline.', 'Got it. Thanks for checking in.']

export function momentLine(m: KeeperMoment, ctx: ProgramCtx): KeeperLine {
  const seed = `${ctx.today}:${m.kind}`
  switch (m.kind) {
    case 'logged': {
      if (m.level === 'REST') return { mood: 'content', line: 'Rest logged. Rest is part of the plan, not a gap in it.' }
      if (m.level === 'MIN') return { mood: 'proud', line: pick(MIN_LINES, seed + m.track) }
      return { mood: 'celebrating', line: fullLine(m.track, ctx, m.detail) }
    }
    case 'mood':
      return m.score <= 2 ? { mood: 'cozy', line: pick(LOW_MOOD_LINES, seed) } : { mood: 'content', line: pick(MOOD_LINES, seed) }
    case 'urge':
      return { mood: 'proud', line: pick(['You rode it out. That’s a stone too.', 'Wave passed. You stayed on the board.', 'That one peaked and passed, and you’re still here. Logged.'], seed) }
    case 'milestone':
      return {
        mood: 'celebrating',
        line:
          m.kept >= 100
            ? '100 kept promises. Look at that light — you built it out of things you actually did.'
            : m.kept >= 50
              ? '50 kept promises. The lamp is on. That’s a record, not a feeling.'
              : '25 kept promises. The lamp room is up — proof stacks.',
      }
    case 'kept':
      return { mood: 'celebrating', line: pick([`Kept promise number ${m.kept}. The tower’s a stone taller.`, `${m.kept} kept. Every one of them really happened.`], seed) }
    case 'checkpoint':
      return { mood: 'content', line: 'Saved. A mirror, not a grade.' }
    case 'review':
      return { mood: 'proud', line: 'Review done. Next week’s plan is yours.' }
    case 'letter':
      return { mood: 'proud', line: m.sealedUntil ? `Sealed until ${shortDate(m.sealedUntil)}. Future you has mail.` : 'Kept safe. Read it on the days you need it.' }
    case 'stretch':
      return { mood: 'celebrating', line: 'You said it out loud, in the room. That’s the rung.' }
  }
}

function fullLine(key: ProgramTrackKey, ctx: ProgramCtx, detail?: string): string {
  const week = weekStartOf(ctx.today)
  const what = detail ? `${detail}` : trackMeta(key).name
  if (isWeekly(key)) {
    const { done, target } = weekCount(ctx, key, week)
    const of = target == null ? '' : done > target ? ` — ${done} this week, past the ${target}` : ` — ${done} of ${target} this week`
    return `${what}, done${of}.`
  }
  switch (key) {
    case 'english':
      return `${what}. Out loud is the part that counts.`
    case 'screen':
      return `${what}. Under the cap — you chose that.`
    case 'regard':
      return `Kept promise number ${keptPromises(ctx.logs)}. The tower’s a stone taller.`
    default:
      return `${what}, done.`
  }
}

const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** What Pip says when nothing just happened — the most useful true thing, gently. */
export function situationLine(ctx: ProgramCtx, now: Date, buddy = 'Pip'): KeeperLine {
  const p = ctx.program
  const day = dayNumber(p, ctx.today)
  const length = programLength(p)
  const seed = ctx.today

  if (day < 1) {
    return { mood: 'eager', line: `Day 1 is ${shortDate(p.startDate)}. Before then, the one job is your if-then plans.` }
  }
  if (day > length) {
    return { mood: 'proud', line: `All ${length} days walked. Look how far the light reaches.` }
  }

  if (sleepIsShort(ctx.sources, ctx.today)) {
    return { mood: 'cozy', line: 'Short nights lately. Small versions all round today — they count exactly the same.' }
  }

  const tracks = activeTracks(p, ctx.today)
  // The longest quiet run decides; ties go to the earlier track. A smaller target is offered
  // once per gap: a review decided since the gap began means it was already considered.
  const quiet = tracks
    .map((key) => ({ key, n: quietRun(ctx, key) }))
    .filter((q) => q.n >= 2)
    .filter((q) => {
      if (q.n < 3) return true
      const gapStart = isWeekly(q.key) ? addDays(weekStartOf(ctx.today), -7 * q.n) : addDays(ctx.today, -q.n)
      return !ctx.reviews.some((r) => decidedOn(r) >= gapStart)
    })
    .sort((a, b) => b.n - a.n)[0]
  if (quiet) {
    const meta = trackMeta(quiet.key)
    const { target, floor } = targetOn(ctx, quiet.key, ctx.today)
    const small = lower(fillCopy(meta.min, target, floor))
    const unit = isWeekly(quiet.key) ? 'weeks' : 'days'
    if (quiet.n >= 3 && quiet.key === 'screen') {
      return {
        mood: 'eager',
        line: `Screen hasn’t been logged for ${quiet.n} days. The number from your phone’s Screen Time takes ten seconds — or loosen the cap in the review if it’s too tight.`,
        offer: { kind: 'review', track: quiet.key },
      }
    }
    if (quiet.n >= 3) {
      return {
        mood: 'eager',
        line: `${meta.name} has been quiet for ${quiet.n} ${unit}. That usually means the target is too big for right now — it says nothing about you. Want to make it smaller?`,
        offer: { kind: 'review', track: quiet.key },
      }
    }
    return {
      mood: 'eager',
      line: `${meta.name} hasn’t happened for two ${unit}. What got in the way? The small version is ${small}.`,
      offer: { kind: 'small', track: quiet.key },
    }
  }

  const away = daysAway(ctx.logs, ctx.today)
  if (away != null && away >= 3) {
    return { mood: 'welcome', line: `The light kept while you were away. Pick one small thing, ${pick(['any one', 'the easiest one', 'whichever is nearest'], seed)}.` }
  }

  const phase = phaseOf(p, day)
  if (phase) {
    const [start] = phaseRange(p, phase)
    if (phase.key === 'audit') {
      const early = TRACKS.filter((t) => startedEarly(p, t.key) && isOn(p, t.key, ctx.today)).map((t) => t.name.toLowerCase())
      if (early.length) {
        return {
          mood: 'eager',
          line: `Audit week — screen time and mood stay as they are, while ${early.join(' and ')} ${early.length === 1 ? 'starts' : 'start'} early. Your call; it counts.`,
        }
      }
      return {
        mood: 'content',
        line: pick(
          [
            'Audit week: change nothing. Log screen time and mood, eat as usual — we’re just looking.',
            'This week we simply watch. Honest numbers now make the next 83 days fair.',
            'No targets yet. Write down what’s true; that’s the whole job this week.',
          ],
          seed,
        ),
      }
    }
    if (day === start) {
      return { mood: 'eager', line: `${phase.name} starts today. ${phase.line}` }
    }
  }

  const doneToday = tracks.filter((key) => key !== 'mood' && isDone(dayCell(ctx, key, ctx.today).status))
  if (doneToday.length > 0) {
    const names = doneToday.map((k) => trackMeta(k).name.toLowerCase())
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    const kept = keptPromises(ctx.logs)
    return { mood: 'content', line: `Today so far: ${list}. Kept promises: ${kept}.` }
  }

  if (now.getHours() < 12) {
    return { mood: 'waking', line: pick(['Morning. What’s the first small promise today?', `Day ${day}. One stone at a time.`, 'Morning. Pick the easiest thing and do it first.'], seed) }
  }

  const yesterday = addDays(ctx.today, -1)
  const keptYesterday = ctx.logs.filter((l) => l.track === 'regard' && l.date === yesterday && l.text?.trim()).length
  if (keptYesterday > 0) return { mood: 'content', line: `Yesterday you kept ${keptYesterday === 1 ? 'a promise' : `${keptYesterday} promises`}. Today’s stones are still open.` }

  return { mood: 'content', line: pick([`Day ${day} of ${length}. One stone at a time.`, `${buddy} here. Whatever’s smallest, start there.`], seed) }
}
