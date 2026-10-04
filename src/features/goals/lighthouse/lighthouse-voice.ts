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

import type { ProgramAssessment, ProgramTrackKey } from '@/types/program'
import type { PipMood } from '../buddy-brain'
import { addDays } from '../goal-format'
import { LIFT_PLANS, TRACKS, fillCopy, sessionMinutes, trackMeta } from './program-content'
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
  checkpointsDue,
  dateOfDay,
  nextLiftDay,
  nextMilestone,
  nextRun,
  opensDay,
  upcomingTracks,
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
  /** Says something that matters right now — it leads the queue instead of rotating. */
  pinned?: boolean
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
    return { mood: 'eager', line: pick([`Day 1 is ${shortDate(p.startDate)}. Tonight is for the setup — nothing to prove yet.`, `${shortDate(p.startDate)} is day 1. Anything from the first-week list done tonight is a head start.`, `Day 1 lands on ${shortDate(p.startDate)}. The island’s ready when you are.`], seed) }
  }
  if (day > length) {
    return { mood: 'proud', line: `All ${length} days walked. Look how far the light reaches.` }
  }

  if (sleepIsShort(ctx.sources, ctx.today)) {
    return { mood: 'cozy', pinned: true, line: 'Short nights lately. Small versions all round today — they count exactly the same.' }
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
        pinned: true,
      }
    }
    if (quiet.n >= 3) {
      return {
        mood: 'eager',
        line: `${meta.name} has been quiet for ${quiet.n} ${unit}. That usually means the target is too big for right now — it says nothing about you. Want to make it smaller?`,
        offer: { kind: 'review', track: quiet.key },
        pinned: true,
      }
    }
    return {
      mood: 'eager',
      line: `${meta.name} hasn’t happened for two ${unit}. What got in the way? The small version is ${small}.`,
      offer: { kind: 'small', track: quiet.key },
      pinned: true,
    }
  }

  const away = daysAway(ctx.logs, ctx.today)
  if (away != null && away >= 3) {
    return { mood: 'welcome', pinned: true, line: `The light kept while you were away. Pick one small thing, ${pick(['any one', 'the easiest one', 'whichever is nearest'], seed)}.` }
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
      return { mood: 'eager', pinned: true, line: `${phase.name} starts today. ${phase.line}` }
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

// ── Chatter: everything Pip could say when nothing just happened ──────────
// Modelled on how Animal Crossing and Hades keep a character fresh: lines carry conditions
// (only true things), the useful ones come first, and the bubble remembers what was heard
// today so each visit opens on something new (use-keeper-talk.ts). Tap Pip for the next.

/** A line with a stable key, so the bubble can remember it was heard. */
export interface ChatLine extends KeeperLine {
  key: string
}

const CHECK_NAME = { BODY: 'photos and measurements', ROSENBERG: 'the self-esteem scale', WHO5: 'the well-being check' } as const

const listOf = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Pip's own life on the island — a fellow traveller, not a coach. */
const PIP_LIFE = [
  'I named the seal on the rocks Maris. She hasn’t agreed to it yet.',
  'There’s a crab under the dock. I call him Pinch. He doesn’t call me anything.',
  'I swept the tower steps. The gulls have filed a complaint.',
  'I found a perfectly flat stone on the beach. I’m saving it for the tower.',
  'The old keeper wrote one line a day in the logbook. Some days it’s simply “fog”. Still a line.',
  'I polished the lamp glass even though it isn’t lit yet. Practice.',
  'A boat flashed its light at me twice last night. I flashed back. I think we’re friends now.',
  'The bench faces the sunset on purpose. Somebody wanted to watch the weeks end.',
  'I tried counting the waves. Gave up at forty. The sea doesn’t count either.',
  'I’m learning knots from the dock ropes. So far: one knot, many tangles.',
  'Keepers used to log the weather every few hours. Ours logs what you actually did.',
  'The cottage kettle whistles in two notes. I’ve decided it’s a song.',
]

/** The research the program stands on, said plainly (design/LIGHTHOUSE_90_PLAN.md). */
const WHY = {
  plans: 'If-then plans are one of the best-tested tricks in psychology: deciding when and where makes doing it far more likely.',
  habit: 'In a UCL study, new habits took about 66 days on average to feel automatic — some far fewer, some far more. Ninety days leaves room.',
  dayOff: 'Same study: one day off didn’t change how the habit formed. Coming back is the part that matters.',
  kind: 'In experiments, people who met a setback kindly tried harder afterwards than people who were hard on themselves.',
  wins: 'Researchers who read thousands of work diaries found small wins lifted people’s days more than anything else.',
  move: 'Moving your body has real, medium-sized effects on mood in reviews of hundreds of trials — healthy adults included.',
  speak: 'Speaking nerves shrink with reps. Waiting to feel ready mostly makes the waiting longer.',
  proof: 'Every kept promise is a small piece of proof about who you are. Proof beats pep talks.',
  watch: 'Watching honestly for a week makes every target after it fair. That’s why the first week changes nothing.',
}

const ASK = [
  'Which promise feels easiest this week? That one’s a good place to start.',
  'What did you do today that 23-year-old you would nod at?',
  'If today were a small-versions day, which small one would you pick?',
  'What made yesterday easier than you expected?',
]

function timeLines(now: Date, seed: string): ChatLine {
  const h = now.getHours() + now.getMinutes() / 60
  if (h >= 23 || h < 4)
    return { key: 'time-late', mood: 'cozy', line: pick(['It’s late. The lamp can keep watch tonight — sleep counts toward everything here.', 'Quiet hour. Even the seal’s asleep. Whatever’s left can be tomorrow’s first small thing.'], seed) }
  if (h < 8) return { key: 'time-dawn', mood: 'waking', line: pick(['First light. The sea’s flat and the gulls are still deciding.', 'Early. Whatever comes first today, the small version is allowed.'], seed) }
  if (h < 17) return { key: 'time-day', mood: 'content', line: pick(['Bright out. A gull tried to sit on the bench and slid off.', 'Middle of the day — a fine time to start it, too.'], seed) }
  if (h < 19.5) return { key: 'time-golden', mood: 'content', line: pick(['Golden hour. The tower goes pink this time of day.', 'Sun’s getting low. Good light for a walk, if you want one.'], seed) }
  return { key: 'time-evening', mood: 'content', line: pick(['Evening. The cottage window’s lit — a good hour to write down what really happened.', 'Evening on the island. The gulls have gone home; the lamp hasn’t.'], seed) }
}

/**
 * Everything worth saying right now, most useful first: the situation (pinned when it
 * matters), what's next on the plan, the tower, the week's evidence, then the time of day,
 * Pip's own island life, a piece of research and a question. All of it true today.
 */
export function keeperLines(ctx: ProgramCtx, now: Date, assessments: ProgramAssessment[], buddy = 'Pip'): ChatLine[] {
  const p = ctx.program
  const today = ctx.today
  const day = dayNumber(p, today)
  const length = programLength(p)
  const seed = `${today}:${now.getHours() >> 2}`
  const out: ChatLine[] = [{ key: 'now', ...situationLine(ctx, now, buddy) }]
  const inSetup = day <= 7

  // ── What's next ──
  if (inSetup) {
    const did = (t: ProgramAssessment['type']) => assessments.some((a) => a.type === t && dayNumber(p, a.date) <= 7)
    if (!did('BODY')) out.push({ key: 'setup-body', mood: 'eager', line: 'Day-1 photos and a waist measurement are the one thing you can’t take later. Two minutes, and they stay private to you.' })
    else if (!did('ROSENBERG') || !did('WHO5')) out.push({ key: 'setup-scales', mood: 'eager', line: 'Two short questionnaires wait under the flag. Three minutes, and they become your starting line.' })
    if (!p.letters.to23) out.push({ key: 'setup-letter', mood: 'content', line: 'The bottle on the beach is empty. A letter to 23-year-old you fits in it — sealed until your birthday.' })
    const planned = p.tracks.filter((t) => t.key !== 'mood' && t.plan?.trim()).length
    const next = TRACKS.find((t) => t.key !== 'mood' && !p.tracks.find((x) => x.key === t.key)?.plan?.trim())
    if (next && planned < 7) out.push({ key: 'setup-plans', mood: 'eager', line: `${planned} of 7 if-then plans written. Next: ${next.name.toLowerCase()} — when, where, one sentence.` })
  } else {
    const due = checkpointsDue(p, assessments, today)
    if (due.length) out.push({ key: 'checkpoint', mood: 'eager', line: `The flag’s up: ${listOf(due.map((d) => CHECK_NAME[d.type]))}. A mirror, not a grade.` })
  }
  if (day >= 1 && day <= length) {
    const on = activeTracks(p, today)
    const open = (k: ProgramTrackKey) => {
      if (!on.includes(k) || isDone(dayCell(ctx, k, today).status)) return false
      const wk = weekCount(ctx, k, weekStartOf(today))
      return wk.target == null || wk.done < wk.target
    }
    const run = open('run') ? nextRun(ctx.logs) : null
    if (run) out.push({ key: 'next-run', mood: 'eager', line: `Next on the run coach: week ${run.week}, run ${run.run} — ${run.summary}. About ${sessionMinutes(run)} minutes with the warm-up.` })
    if (open('lift')) {
      const d = nextLiftDay(ctx.logs, LIFT_PLANS[p.liftPlace ?? 'gym'])
      out.push({ key: 'next-lift', mood: 'eager', line: `Next lift is ${d.name}: ${listOf(d.exercises.slice(0, 3).map((e) => e.name.toLowerCase()))}.` })
    }
  }

  // ── The tower ──
  const kept = keptPromises(ctx.logs)
  const regardOpens = dateOfDay(p, opensDay(p, 'regard'))
  const goal = nextMilestone(kept)
  if (kept === 0) {
    out.push(
      today < regardOpens
        ? { key: 'tower', mood: 'content', line: `The tower’s bare stone for now. From ${shortDate(regardOpens)}, each promise you keep paints one.` }
        : { key: 'tower', mood: 'eager', line: 'The tower’s waiting on its first stone: one promise to yourself, kept and written down.' },
    )
  } else if (goal) {
    const what = goal === 25 ? 'the lamp room goes up' : goal === 50 ? 'the lamp lights' : 'the beam starts to sweep'
    out.push({ key: 'tower', mood: 'proud', line: `${count(kept, 'stone')} laid. ${goal - kept} more and ${what}.` })
  } else {
    out.push({ key: 'tower', mood: 'proud', line: `The beam’s sweeping. ${kept} stones, every one of them real.` })
  }

  // ── The week's evidence (said only when there is some) ──
  if (day >= 1) {
    const parts = activeTracks(p, today)
      .filter(isWeekly)
      .map((k) => ({ k, n: weekCount(ctx, k, weekStartOf(today)).done }))
      .filter((x) => x.n > 0)
      .map(({ k, n }) => (k === 'run' ? count(n, 'run') : k === 'lift' ? count(n, 'lift') : k === 'learn' ? count(n, 'learning day') : `${trackMeta(k).name.toLowerCase()} × ${n}`))
    if (parts.length) out.push({ key: 'week', mood: 'proud', line: `This week so far: ${listOf(parts)}. All of it real.` })
  }

  // ── What opens next ──
  const upcoming = upcomingTracks(p, day < 1 ? p.startDate : today).sort((a, b) => opensDay(p, a) - opensDay(p, b))[0]
  if (upcoming && day <= length) {
    out.push({ key: 'opening', mood: 'content', line: `${trackMeta(upcoming).name} opens ${shortDate(dateOfDay(p, opensDay(p, upcoming)))}. Want it sooner? Its card can start it early.` })
  }

  // ── Letters ──
  const to23 = p.letters.to23
  if (to23?.sealed && to23.opensOn) out.push({ key: 'letter', mood: 'content', line: `Your letter to 23 is sealed in the bottle until ${shortDate(to23.opensOn)}. I haven’t peeked.` })

  // ── The island, the research, a question ──
  out.push(timeLines(now, seed))
  const n = PIP_LIFE.length
  const h = Math.abs([...today].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7))
  out.push({ key: 'life-a', mood: 'content', line: PIP_LIFE[h % n] }, { key: 'life-b', mood: 'eager', line: PIP_LIFE[(h + 5) % n] })
  const phase = day >= 1 ? phaseOf(p, day)?.key : 'audit'
  const why =
    phase === 'audit'
      ? [WHY.plans, WHY.watch]
      : phase === 'foundation'
        ? [WHY.habit, WHY.dayOff, WHY.move]
        : phase === 'push'
          ? [WHY.speak, WHY.wins, WHY.kind]
          : [WHY.proof, WHY.dayOff, WHY.kind]
  out.push({ key: 'why', mood: 'content', line: pick(why, seed) })
  if (day >= 1) out.push({ key: 'ask', mood: 'eager', line: pick(ASK, seed) })
  if (day < 1 || day % 10 === 0) out.push({ key: 'birthday', mood: 'content', line: `Day ${length} is ${shortDate(p.birthday ?? p.endDate)} — your birthday. Every day before it is a stone, not a test.` })

  const seen = new Set<string>()
  return out.filter((l) => (seen.has(l.line) ? false : (seen.add(l.line), true)))
}

/** Before a program exists: what the island is, a little at a time. */
export const introLines = (buddy = 'Pip'): ChatLine[] => [
  { key: 'intro-1', mood: 'welcome', line: 'A lighthouse on the edge of the camp. Ninety days, one stone at a time.' },
  { key: 'intro-2', mood: 'eager', line: 'Every promise you keep to yourself becomes a stone in that tower. At 25 the lamp room goes up.' },
  { key: 'intro-3', mood: 'content', line: 'The flag is for check-ins, the bench for the weekly review, the bottle for letters, the cottage keeps the logbook.' },
  { key: 'intro-4', mood: 'content', line: `Nothing here keeps score of bad days. Small versions count the same — ${buddy}’s rule.` },
]
