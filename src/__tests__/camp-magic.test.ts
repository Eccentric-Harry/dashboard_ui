// The camp's newer magic, held to the same rules as Pip's voice (buddy-brain.test.ts):
// Fireside Tales never shames a quiet day, visitors only ever arrive (never leave), the
// festival calendar is pure, and today's visitor is stable for the whole day.
import { describe, expect, it } from 'vitest'
import type { GoalDayCell, GoalProgressView } from '@/types/goals'
import { weekTale, listOf } from '@/features/goals/fireside-tales'
import { arrivedVisitors, nextVisitor, VISITORS, visitorOn } from '@/features/goals/camp-visitors'
import { calendarSeason, festivalOn, isDiwaliNight } from '@/features/goals/camp-calendar'
import { addDays } from '@/features/goals/goal-format'

const BANNED = /\b(sad|sorry|disappoint\w*|fail\w*|lost|lose|miss(ed)?|guilt\w*|lazy|should have|shame\w*|behind|broke|ruin\w*|hungry|sick|hurt\w*|cry\w*|angry)\b/i

const WEEK = '2026-10-05'

function view(id: string, title: string, hits: number[], opts: { note?: [number, string]; measure?: 'CHECK' | 'COUNT'; unit?: string; kept?: boolean } = {}): GoalProgressView {
  const today = addDays(WEEK, 6)
  const days: GoalDayCell[] = Array.from({ length: 7 }, (_, i) => ({
    date: addDays(WEEK, i),
    value: hits.includes(i) ? 12 : 0,
    hit: hits.includes(i),
    today: false,
    future: false,
    beforeStart: false,
  }))
  return {
    goal: {
      id,
      title,
      measure: opts.measure ?? 'CHECK',
      period: 'DAY',
      target: opts.measure === 'COUNT' ? 10 : 1,
      unit: opts.unit,
      daysPerWeek: 5,
      status: 'ACTIVE',
      order: 0,
      startDate: '2026-09-01',
    } as GoalProgressView['goal'],
    today: { date: today, value: 0, hit: false } as GoalProgressView['today'],
    week: { weekStart: WEEK, value: hits.length, target: 5, kept: opts.kept ?? false, pace: 'ON_PACE', daysLeft: 1, perDayToFinish: null, days },
    history: [],
    recentEntries: opts.note
      ? [{ id: `${id}-n`, goalId: id, date: addDays(WEEK, opts.note[0]), value: 1, note: opts.note[1], source: 'manual' }]
      : [],
    weeksKept: 0,
    weekStreak: 0,
  }
}

describe('Fireside Tales', () => {
  it('tells a page per day up to today, quotes your note, and never shames a quiet day', () => {
    const goals = [
      view('a', 'Read', [0, 1, 3], { measure: 'COUNT', unit: 'pages', note: [1, 'Finished the chapter on tides'] }),
      view('b', 'Move', [1]),
    ]
    const today = addDays(WEEK, 3)
    const tale = weekTale(goals, today, WEEK, 'Pip')
    expect(tale.title).toBe('The Tale of Week 41')
    // Cover + Mon..Thu + ending.
    expect(tale.pages.map((p) => p.kind)).toEqual(['cover', 'day', 'day', 'rest', 'today', 'end'])
    expect(tale.pages[1].lines[0]).toContain('Read (12 pages)')
    expect(tale.pages[2].quote).toBe('Finished the chapter on tides')
    expect(tale.pages[2].lit).toEqual(['a', 'b'])
    expect(tale.pages.at(-1)?.lines.join(' ')).toContain('To be continued')
  })

  it('every line it can write passes the tone test, for any week shape', () => {
    const lines = new Set<string>()
    const shapes = [[], [0], [0, 2, 4], [0, 1, 2, 3, 4, 5, 6], [6]]
    for (let d = 0; d < 7; d++) {
      for (const a of shapes) {
        for (const b of shapes) {
          for (const kept of [false, true]) {
            const goals = [view('a', 'Read', a, { kept }), view('b', 'Calm', b, { kept })]
            for (const page of weekTale(goals, addDays(WEEK, d), WEEK, 'Sprout').pages) page.lines.forEach((l) => lines.add(l))
          }
        }
      }
    }
    for (const page of weekTale([], addDays(WEEK, 2), WEEK).pages) page.lines.forEach((l) => lines.add(l))
    for (const line of lines) {
      expect(line, line).not.toMatch(BANNED)
      expect(line.length, line).toBeLessThan(170)
    }
    expect(lines.size).toBeGreaterThan(20)
  })

  it('lists names the way people say them', () => {
    expect(listOf(['A'])).toBe('A')
    expect(listOf(['A', 'B'])).toBe('A and B')
    expect(listOf(['A', 'B', 'C'])).toBe('A, B and C')
  })
})

describe('Visitors', () => {
  it('only ever arrive as kept weeks grow, in order', () => {
    let before = 0
    for (let weeks = 0; weeks <= 60; weeks++) {
      const here = arrivedVisitors(weeks).length
      expect(here).toBeGreaterThanOrEqual(before)
      before = here
    }
    expect(arrivedVisitors(0).map((v) => v.id)).toEqual(['bun'])
    expect(arrivedVisitors(52)).toHaveLength(VISITORS.length)
    expect(nextVisitor(2)?.id).toBe('puddle')
    expect(nextVisitor(52)).toBeNull()
  })

  it('a newcomer gets their first day, and a pinned visitor stays all day', () => {
    expect(visitorOn('2026-10-06', 4, new Set())?.id).toBe('puddle')
    expect(visitorOn('2026-10-06', 4, new Set(['puddle']))?.id).toBe('bristle')
    // Greeted Puddle earlier today: Puddle stays, even though Bristle is still new.
    expect(visitorOn('2026-10-06', 4, new Set(['puddle']), 'puddle')?.id).toBe('puddle')
    // Everyone greeted: the date picks, the same pick every time.
    const all = new Set(VISITORS.map((v) => v.id))
    expect(visitorOn('2026-10-07', 20, all)?.id).toBe(visitorOn('2026-10-07', 20, all)?.id)
  })

  it('never say anything unkind', () => {
    for (const v of VISITORS) for (const line of [...v.lines, v.about]) expect(line, line).not.toMatch(BANNED)
  })
})

describe('The camp calendar', () => {
  it('dresses for Diwali across its five days, and knows the night itself', () => {
    expect(festivalOn('2026-11-05')).toBeNull()
    expect(festivalOn('2026-11-06')).toBe('diwali')
    expect(festivalOn('2026-11-08')).toBe('diwali')
    expect(festivalOn('2026-11-10')).toBe('diwali')
    expect(festivalOn('2026-11-11')).toBeNull()
    expect(isDiwaliNight('2026-11-08')).toBe(true)
    expect(isDiwaliNight('2026-11-07')).toBe(false)
  })

  it('knows the new year, and the birthday wins a clash every year after', () => {
    expect(festivalOn('2026-12-31')).toBe('new-year-eve')
    expect(festivalOn('2027-01-01')).toBe('new-year')
    expect(festivalOn('2027-01-02', '2027-01-02')).toBe('birthday')
    expect(festivalOn('2028-01-02', '2027-01-02')).toBe('birthday')
    expect(festivalOn('2027-01-01', '2027-01-01')).toBe('birthday')
    expect(festivalOn('2026-10-06', '2027-01-02')).toBeNull()
  })

  it('maps months to seasons', () => {
    expect(calendarSeason('2026-10-06')).toBe('autumn')
    expect(calendarSeason('2026-12-20')).toBe('winter')
    expect(calendarSeason('2027-04-01')).toBe('spring')
    expect(calendarSeason('2027-07-01')).toBe('summer')
  })
})
