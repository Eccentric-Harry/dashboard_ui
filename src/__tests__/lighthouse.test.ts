import { describe, expect, it } from 'vitest'
import type { Program, ProgramAssessment, ProgramLog, ProgramReview, ProgramSources } from '@/types/program'
import { addDays } from '@/features/goals/goal-format'
import {
  activeTracks,
  capOn,
  checkpointsDue,
  consistency,
  dayCell,
  dayNumber,
  keptPromises,
  lighthouseStage,
  nextRun,
  phaseOf,
  quietRun,
  startedEarly,
  targetOn,
  weekCount,
  who5Concern,
  type ProgramCtx,
} from '@/features/goals/lighthouse/program-engine'
import { C25K, sessionMinutes, TRACKS } from '@/features/goals/lighthouse/program-content'
import { momentLine, situationLine, type KeeperMoment } from '@/features/goals/lighthouse/lighthouse-voice'
import { joinIfThen, splitIfThen } from '@/features/goals/lighthouse/lh-utils'

const START = '2026-10-05' // a Monday — day 1

const program = (over: Partial<Program> = {}): Program => ({
  id: 'p',
  title: 'Turning 23',
  status: 'ACTIVE',
  startDate: START,
  endDate: '2027-01-02',
  birthday: '2027-01-02',
  weightKg: 70,
  liftPlace: 'gym',
  tracks: [
    { key: 'run', target: 3 },
    { key: 'lift', target: 3 },
    { key: 'protein', target: 112, floor: 84 },
    { key: 'mood' },
    { key: 'learn', target: 5 },
    { key: 'english', target: 15, floor: 5 },
    { key: 'screen' },
    { key: 'regard', target: 1 },
  ],
  answers: {},
  letters: {},
  ...over,
})

const noSources = (): ProgramSources => ({ protein: {}, sleep: {}, mood: {}, runs: {}, focus: {} })

let seq = 0
const log = (track: ProgramLog['track'], date: string, over: Partial<ProgramLog> = {}): ProgramLog => ({
  id: `l${++seq}`,
  programId: 'p',
  track,
  date,
  createdAt: `${date}T10:00:00Z`,
  ...over,
})

const day = (n: number) => addDays(START, n - 1)

const ctx = (today: string, logs: ProgramLog[] = [], over: Partial<ProgramCtx> = {}): ProgramCtx => ({
  program: program(),
  logs,
  reviews: [],
  sources: noSources(),
  today,
  ...over,
})

describe('days and phases', () => {
  it('runs 90 days from Monday 5 October to the birthday, in four phases', () => {
    const p = program()
    expect(dayNumber(p, START)).toBe(1)
    expect(dayNumber(p, '2027-01-02')).toBe(90)
    expect(phaseOf(p, 1)?.key).toBe('audit')
    expect(phaseOf(p, 7)?.key).toBe('audit')
    expect(phaseOf(p, 8)?.key).toBe('foundation')
    expect(phaseOf(p, 36)?.key).toBe('push')
    expect(phaseOf(p, 71)?.key).toBe('lockin')
    expect(phaseOf(p, 90)?.key).toBe('lockin')
    expect(phaseOf(p, 91)).toBeNull()
    expect(phaseOf(p, 0)).toBeNull()
  })

  it('switches tracks on in stages', () => {
    const p = program()
    expect(activeTracks(p, day(1))).toEqual(['protein', 'mood', 'screen'])
    expect(activeTracks(p, day(8))).toEqual(['lift', 'protein', 'mood', 'screen', 'regard'])
    expect(activeTracks(p, day(15))).toContain('run')
    expect(activeTracks(p, day(36))).toHaveLength(8)
  })

  it('lets a track start early — from the day chosen, never before day 1, never later than planned', () => {
    const base = program()
    const p = { ...base, tracks: base.tracks.map((t) => (t.key === 'run' ? { ...t, openedOn: day(3) } : t.key === 'lift' ? { ...t, openedOn: addDays(START, -2) } : t)) }
    expect(activeTracks(p, day(2))).not.toContain('run')
    expect(activeTracks(p, day(3))).toContain('run')
    expect(activeTracks(p, day(1))).toContain('lift')
    expect(startedEarly(p, 'run')).toBe(true)
    expect(startedEarly(p, 'protein')).toBe(false)
    const late = { ...base, tracks: base.tracks.map((t) => (t.key === 'run' ? { ...t, openedOn: day(30) } : t)) }
    expect(activeTracks(late, day(15))).toContain('run')
  })
})

describe('a day on a track', () => {
  it('counts the bad-day version as done, drawn as min', () => {
    const today = day(20)
    const c = ctx(today, [log('lift', today, { level: 'MIN' })])
    expect(dayCell(c, 'lift', today).status).toBe('min')
  })

  it('never judges mood', () => {
    const today = day(20)
    const c = ctx(today, [log('mood', today, { value: 1 })])
    expect(dayCell(c, 'mood', today)).toMatchObject({ status: 'logged', value: 1 })
    expect(consistency(c, 'mood').pct).toBeNull()
    expect(quietRun(ctx(today), 'mood')).toBe(0)
  })

  it('reads mood from /mind when nothing was logged here', () => {
    const today = day(10)
    const c = ctx(today, [], { sources: { ...noSources(), mood: { [today]: 4 } } })
    expect(dayCell(c, 'mood', today)).toMatchObject({ status: 'logged', value: 4, source: 'mind' })
  })

  it('treats a day without food logged as unknown protein, not a miss', () => {
    const today = day(20)
    const sources = { ...noSources(), protein: { [day(18)]: 120, [day(19)]: 90 } }
    const c = ctx(today, [], { sources })
    expect(dayCell(c, 'protein', day(18)).status).toBe('full')
    expect(dayCell(c, 'protein', day(19)).status).toBe('min')
    expect(dayCell(c, 'protein', day(17)).status).toBe('unknown')
    // Only the two known days are judged.
    const cons = consistency(c, 'protein')
    expect(cons.possible).toBe(2)
    expect(cons.pct).toBe(1)
    // And protein never nudges.
    expect(quietRun(c, 'protein')).toBe(0)
  })

  it('counts a Strava run and a long focus session without logging twice', () => {
    const today = day(40)
    const sources = { ...noSources(), runs: { [today]: { count: 1, km: 3.2, minutes: 24 } }, focus: { [today]: 30 } }
    const c = ctx(today, [], { sources })
    expect(dayCell(c, 'run', today)).toMatchObject({ status: 'full', source: 'strava' })
    expect(dayCell(c, 'learn', today)).toMatchObject({ status: 'full', source: 'focus' })
  })

  it('folds kept promises: with a kind sentence is full, without is min', () => {
    const today = day(10)
    const c = ctx(today, [log('regard', today, { text: 'Ran even though tired' })])
    expect(dayCell(c, 'regard', today).status).toBe('min')
    const c2 = ctx(today, [log('regard', today, { text: 'Ran', kind: 'You showed up.' })])
    expect(dayCell(c2, 'regard', today).status).toBe('full')
    expect(keptPromises(c2.logs)).toBe(1)
  })
})

describe('consistency — a 14-day percentage, never a streak', () => {
  it('leaves an open today out of the count', () => {
    const today = day(20)
    const logs = [log('regard', day(19), { text: 'a' }), log('regard', day(18), { text: 'b' })]
    const c = ctx(today, logs)
    const cons = consistency(c, 'regard')
    // Days 8–19 are judged (12 days), today isn't until it's done.
    expect(cons.possible).toBe(12)
    expect(cons.done).toBe(2)
  })

  it('judges weekly tracks against the sessions the target asked for', () => {
    const today = day(28)
    const logs = [day(22), day(24), day(26), day(15), day(17)].map((d) => log('lift', d, { level: 'FULL' }))
    const cons = consistency(ctx(today, logs), 'lift')
    expect(cons.done).toBe(5)
    expect(cons.possible).toBeCloseTo(5.6, 1) // 13 judged days × 3/7 (today is open)
    expect(cons.pct).toBeGreaterThan(0.85)
  })
})

describe('gaps — one miss changes nothing', () => {
  it('counts quiet days back from yesterday, never today', () => {
    const today = day(20)
    const logs = [log('regard', day(17), { text: 'a' })]
    expect(quietRun(ctx(today, logs), 'regard')).toBe(2)
    expect(quietRun(ctx(today, [log('regard', day(19), { text: 'a' })]), 'regard')).toBe(0)
  })

  it('judges weekly tracks only at the end of the week, and a rest day is never a gap', () => {
    // Day 22 is a Monday; last week (days 15–21) had two lifts and a rest.
    const today = day(23)
    const logs = [log('lift', day(15), { level: 'FULL' }), log('lift', day(17), { level: 'FULL' }), log('lift', day(19), { level: 'REST' })]
    const c = ctx(today, logs)
    expect(weekCount(c, 'lift', day(15))).toEqual({ done: 2, target: 3 })
    expect(dayCell(c, 'lift', day(19)).status).toBe('rest')
    // Last week fell short and so did the one before (days 8–14); the week lift opened in ends the count.
    expect(quietRun(c, 'lift')).toBe(2)
  })
})

describe('targets change only through reviews', () => {
  it('judges each day by the target in effect then', () => {
    const p = program({ tracks: program().tracks.map((t) => (t.key === 'run' ? { ...t, target: 2 } : t)) })
    const reviews: ProgramReview[] = [
      { id: 'r', programId: 'p', weekStart: day(22), selfTrust: 6, changes: [{ track: 'run', fromTarget: 3, toTarget: 2 }], createdAt: `${day(28)}T14:00:00Z` },
    ]
    const c = { program: p, reviews }
    expect(targetOn(c, 'run', day(27)).target).toBe(3)
    expect(targetOn(c, 'run', day(28)).target).toBe(2)
    expect(targetOn(c, 'run', day(40)).target).toBe(2)
  })
})

describe('the screen cap', () => {
  const audit = (minutes: number) => [1, 2, 3, 4, 5].map((n) => log('screen', day(n), { value: minutes }))

  it('starts 20% under the audit average, then steps a third of the way to two hours every two weeks of the push', () => {
    const c = ctx(day(80), audit(300))
    expect(capOn(c, day(5))).toBeNull() // the audit only watches
    expect(capOn(c, day(8))).toBe(240)
    expect(capOn(c, day(35))).toBe(240)
    expect(capOn(c, day(36))).toBe(200)
    expect(capOn(c, day(50))).toBe(175)
    expect(capOn(c, day(64))).toBe(155)
    expect(capOn(c, day(80))).toBe(155) // lock in holds
  })

  it('holds an audit already under two hours, and waits for three audit days', () => {
    expect(capOn(ctx(day(40), audit(100)), day(40))).toBe(100)
    expect(capOn(ctx(day(10), audit(300).slice(0, 2)), day(10))).toBeNull()
  })

  it('counts under the cap as full and lower-than-yesterday as the small version', () => {
    const logs = [...audit(300), log('screen', day(9), { value: 280 }), log('screen', day(10), { value: 260 }), log('screen', day(11), { value: 200 })]
    const c = ctx(day(12), logs)
    expect(dayCell(c, 'screen', day(9)).status).toBe('logged') // over the cap — data, not a miss
    expect(dayCell(c, 'screen', day(10)).status).toBe('min')
    expect(dayCell(c, 'screen', day(11)).status).toBe('full')
  })
})

describe('plans', () => {
  it('has the 27 runs of Couch to 5K and advances only by runs the coach finished', () => {
    expect(C25K).toHaveLength(27)
    expect(C25K[0].summary).toMatch(/1 min run/)
    expect(C25K[14]).toMatchObject({ week: 5, run: 3 })
    expect(sessionMinutes(C25K[14])).toBe(30) // 5 warm-up + 20 running + 5 cool-down
    expect(sessionMinutes(C25K[26])).toBe(40)
    const logs = [
      log('run', day(15), { level: 'FULL', session: 'c25k-1-1' }),
      log('run', day(17), { level: 'MIN' }),
      log('run', day(19), { level: 'FULL', session: 'c25k-1-2' }),
    ]
    expect(nextRun(logs)?.key).toBe('c25k-1-3')
  })
})

describe('checkpoints', () => {
  it('asks for the day-1 measures, then every two weeks', () => {
    const p = program()
    expect(checkpointsDue(p, [], day(1)).map((c) => c.type).sort()).toEqual(['BODY', 'ROSENBERG', 'WHO5'])
    const done: ProgramAssessment[] = (['BODY', 'ROSENBERG', 'WHO5'] as const).map((type, i) => ({ id: `a${i}`, programId: 'p', type, date: day(2) }))
    expect(checkpointsDue(p, done, day(5))).toHaveLength(0)
    expect(checkpointsDue(p, done, day(15)).map((c) => c.type).sort()).toEqual(['BODY', 'WHO5'])
    expect(checkpointsDue(p, done, day(45)).map((c) => c.type)).toContain('ROSENBERG')
  })

  it('flags a low WHO-5, and two in a row', () => {
    const a = (score: number, d: number): ProgramAssessment => ({ id: `w${d}`, programId: 'p', type: 'WHO5', date: day(d), score })
    expect(who5Concern([a(64, 1)])).toBe('none')
    expect(who5Concern([a(64, 1), a(44, 15)])).toBe('low')
    expect(who5Concern([a(48, 1), a(44, 15)])).toBe('low-twice')
  })
})

describe('the lighthouse', () => {
  it('builds the lamp room at 25 kept promises, lights it at 50, and beams at 100', () => {
    expect(lighthouseStage(0)).toBe('building')
    expect(lighthouseStage(25)).toBe('lamp-room')
    expect(lighthouseStage(50)).toBe('lit')
    expect(lighthouseStage(100)).toBe('beam')
  })
})

describe('Pip at the lighthouse', () => {
  // Screen logged every day, and a lift and a run in each week, so only kept promises go quiet.
  const steady = () => [
    ...Array.from({ length: 19 }, (_, i) => log('screen', day(i + 1), { value: 150 })),
    ...[8, 10, 12, 15, 17, 19].map((n) => log('lift', day(n), { level: 'FULL' })),
  ]

  it('asks what got in the way after two quiet days, and offers a smaller target after three', () => {
    const two = situationLine(ctx(day(20), [...steady(), log('regard', day(17), { text: 'a' })]), new Date(2026, 9, 24, 15))
    expect(two.line).toMatch(/What got in the way/)
    expect(two.offer).toEqual({ kind: 'small', track: 'regard' })
    const three = situationLine(ctx(day(20), [...steady(), log('regard', day(16), { text: 'a' })]), new Date(2026, 9, 24, 15))
    expect(three.offer).toEqual({ kind: 'review', track: 'regard' })
  })

  it('offers the smaller target once per gap — not again after a review', () => {
    const reviews: ProgramReview[] = [{ id: 'r', programId: 'p', weekStart: day(15), selfTrust: 5, changes: [], createdAt: `${day(19)}T12:00:00Z` }]
    const line = situationLine(ctx(day(20), [...steady(), log('regard', day(16), { text: 'a' })], { reviews }), new Date(2026, 9, 24, 15))
    expect(line.offer).toBeUndefined()
  })

  it('suggests the small versions after short nights', () => {
    const today = day(20)
    const sleep = { [today]: 300, [day(19)]: 320, [day(18)]: 340, [day(17)]: 480 }
    const line = situationLine(ctx(today, [], { sources: { ...noSources(), sleep } }), new Date(2026, 9, 24, 9))
    expect(line.line).toMatch(/Small versions/)
    expect(line.mood).toBe('cozy')
  })

  it('only acknowledges a low mood — no advice, no cheering', () => {
    const line = momentLine({ kind: 'mood', score: 1 }, ctx(day(20)))
    expect(line.mood).toBe('cozy')
    expect(line.line).not.toMatch(/!|try|should|cheer|smile|tomorrow will/i)
  })

  it('never says the words the brief rules out', () => {
    const BANNED = /\bonly\b|\bjust the\b|fail|\blost\b|streak|behind|disappoint|should have|lazy|guilt|than others|everyone else|don['’]t break|countdown|\bmiss(ed)?\b|hurry/i
    const lines: string[] = []
    const moments: KeeperMoment[] = [
      ...TRACKS.flatMap((t) => (['FULL', 'MIN', 'REST'] as const).map((level) => ({ kind: 'logged' as const, track: t.key, level }))),
      ...[1, 2, 3, 4, 5].map((score) => ({ kind: 'mood' as const, score })),
      { kind: 'urge' },
      ...[25, 50, 100].map((kept) => ({ kind: 'milestone' as const, kept })),
      { kind: 'kept', kept: 7 },
      { kind: 'checkpoint' },
      { kind: 'review' },
      { kind: 'letter', sealedUntil: '2027-01-02' },
      { kind: 'letter' },
      { kind: 'stretch' },
    ]
    for (let n = -3; n <= 95; n += 1) {
      const today = day(n)
      const logs = n > 10 ? [log('regard', day(n - 3), { text: 'a' }), log('lift', day(n - 1), { level: 'FULL' })] : []
      const c = ctx(today, logs, { sources: { ...noSources(), sleep: n % 7 === 0 ? { [today]: 300, [day(n - 1)]: 300, [day(n - 2)]: 300 } : {} } })
      for (const hour of [7, 15, 22]) lines.push(situationLine(c, new Date(2026, 9, 5, hour)).line)
      for (const m of moments) lines.push(momentLine(m, c).line)
    }
    for (const line of lines) expect(line, line).not.toMatch(BANNED)
  })
})

describe('if-then plans', () => {
  it('splits a plan into its cue and its action, and joins them back the same', () => {
    const plan = 'If it’s 7:00 on Monday, Wednesday or Friday, then shoes on and out the door before I check my phone.'
    const parts = splitIfThen(plan)
    expect(parts).toEqual({ when: 'it’s 7:00 on Monday, Wednesday or Friday', then: 'shoes on and out the door before I check my phone' })
    expect(joinIfThen(parts.when, parts.then)).toBe(plan)
  })

  it('keeps every word of a plan that isn’t in if-then shape, as the action', () => {
    expect(splitIfThen('Run before work')).toEqual({ when: '', then: 'Run before work' })
    expect(joinIfThen('', 'Run before work')).toBe('Run before work')
  })

  it('tidies what people type into the halves', () => {
    expect(joinIfThen('if I get into bed,', 'then the phone charges in the other room.')).toBe('If I get into bed, then the phone charges in the other room.')
    expect(joinIfThen('  ', '  ')).toBe('')
  })

  it('fits the stored limit when both halves are full', () => {
    const half = Math.floor((200 - 11) / 2)
    expect(joinIfThen('a'.repeat(half), 'b'.repeat(half)).length).toBeLessThanOrEqual(200)
  })
})
