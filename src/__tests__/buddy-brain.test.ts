import { describe, expect, it } from 'vitest'
import type { GoalPace, GoalProgressView } from '@/types/goals'
import { allDoneToday, pipState, type PipMoment } from '@/features/goals/buddy-brain'

// Pip's voice is a guardrail, not a style preference (design/GOALS_BUDDY_PLAN.md):
// never guilt, never sad, never a verdict. This sweeps the brain across days, hours,
// paces and moments and holds every line it can say to that.

const TODAY = '2026-10-01' // a Thursday
const MONDAY = '2026-09-28'

function view(partial: {
  id?: string
  title?: string
  measure?: 'COUNT' | 'CHECK'
  period?: 'DAY' | 'WEEK'
  todayValue?: number
  todayHit?: boolean
  weekValue?: number
  weekTarget?: number
  pace?: GoalPace
  streak?: number
}): GoalProgressView {
  const measure = partial.measure ?? 'COUNT'
  const period = partial.period ?? 'DAY'
  const pace = partial.pace ?? 'ON_PACE'
  return {
    goal: {
      id: partial.id ?? 'g1',
      title: partial.title ?? 'Read',
      measure,
      period,
      target: period === 'DAY' ? (measure === 'CHECK' ? 1 : 10) : 420,
      unit: measure === 'COUNT' ? (period === 'DAY' ? 'pages' : 'min') : null,
      daysPerWeek: period === 'DAY' ? 5 : null,
      status: 'ACTIVE',
      startDate: '2026-09-01',
      order: 0,
    },
    today: {
      date: TODAY,
      value: partial.todayValue ?? 0,
      target: period === 'DAY' ? 10 : null,
      hit: partial.todayHit ?? false,
    },
    week: {
      weekStart: MONDAY,
      value: partial.weekValue ?? 0,
      target: partial.weekTarget ?? 5,
      kept: pace === 'KEPT',
      pace,
      daysLeft: 4,
      perDayToFinish: period === 'WEEK' ? 60 : null,
      days: [],
    },
    history: [],
    recentEntries: [],
    weeksKept: 3,
    weekStreak: partial.streak ?? 2,
  }
}

const at = (hour: number, day = TODAY) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, hour, 15)
}

const BANNED = /\b(sad|sorry|disappoint\w*|fail\w*|lost|lose|miss(ed)? you|guilt\w*|lazy|should have|shame\w*|behind again|broke|ruin\w*|hungry|sick|hurt\w*|cry\w*|angry)\b/i

describe('pip brain', () => {
  it('welcomes an empty camp, by whatever name it was given', () => {
    expect(pipState([], TODAY, at(10)).mood).toBe('welcome')
    expect(pipState([], TODAY, at(10), null, 'Sprout').line).toContain("I'm Sprout")
  })

  it('answers camp moments — the chest, a quest, a new hat — before reading the board', () => {
    expect(pipState([view({})], TODAY, at(15), { kind: 'chest', sparks: 70 }).line).toContain('70 sparks')
    expect(pipState([view({})], TODAY, at(15), { kind: 'bought', item: 'Knit beanie' }).mood).toBe('celebrating')
  })

  it('celebrates when every goal has had its moment today', () => {
    const goals = [view({ todayHit: true }), view({ id: 'g2', title: 'Move', measure: 'CHECK', pace: 'KEPT' })]
    expect(allDoneToday(goals)).toBe(true)
    expect(pipState(goals, TODAY, at(15)).mood).toBe('celebrating')
  })

  it('a kept week outranks everything else', () => {
    const moment: PipMoment = { kind: 'week-kept', goalTitle: 'Read', streak: 4 }
    const s = pipState([view({})], TODAY, at(23), moment)
    expect(s.mood).toBe('proud')
    expect(s.line).toContain('4 weeks in a row')
  })

  it('gets cosy late at night — never upset — even with things undone', () => {
    const s = pipState([view({ pace: 'OUT_OF_REACH' })], TODAY, at(23))
    expect(s.mood).toBe('cozy')
    expect(s.line).toMatch(/or we rest/i)
  })

  it('names the tight goal and the smallest step', () => {
    const s = pipState([view({ title: 'Read', pace: 'TIGHT', todayValue: 4 })], TODAY, at(14))
    expect(s.mood).toBe('eager')
    expect(s.line).toContain('Read')
    expect(s.line).toContain('6 pages to go')
  })

  it('says a fresh Monday is a clean trail', () => {
    expect(pipState([view({})], MONDAY, at(9, MONDAY)).mood).toBe('welcome')
  })

  it('is deterministic for the same day and board', () => {
    const goals = [view({})]
    expect(pipState(goals, TODAY, at(15)).line).toBe(pipState(goals, TODAY, at(15)).line)
  })

  it('never says anything guilt-tripping, sad or shaming, in any situation', () => {
    const paces: GoalPace[] = ['KEPT', 'ON_PACE', 'TIGHT', 'BEHIND', 'OUT_OF_REACH']
    const moments: (PipMoment | null)[] = [
      null,
      { kind: 'goal-done', goalTitle: 'Read' },
      { kind: 'day-done' },
      { kind: 'week-kept', goalTitle: 'Read', streak: 1 },
      { kind: 'chest', sparks: 70 },
      { kind: 'quest', sparks: 4 },
      { kind: 'bought', item: 'Knit beanie' },
      { kind: 'bought' },
      { kind: 'wish' },
    ]
    const days = ['2026-09-28', '2026-09-29', '2026-10-01', '2026-10-03', '2026-10-04']
    const lines = new Set<string>()
    for (const day of days) {
      for (let hour = 0; hour < 24; hour += 1) {
        for (const pace of paces) {
          for (const moment of moments) {
            for (const hit of [false, true]) {
              const goals = [
                view({ pace, todayHit: hit, todayValue: hit ? 10 : 3 }),
                view({ id: 'g2', title: 'Deep learning', period: 'WEEK', pace, weekTarget: 420, weekValue: 90 }),
                view({ id: 'g3', title: 'Calm', measure: 'CHECK', pace: pace === 'KEPT' ? 'ON_PACE' : pace }),
              ]
              const s = pipState(goals, day, at(hour, day), moment)
              lines.add(s.line)
              expect(['welcome', 'waking', 'content', 'eager', 'celebrating', 'proud', 'cozy']).toContain(s.mood)
            }
          }
        }
      }
    }
    for (const line of lines) {
      expect(line, line).not.toMatch(BANNED)
      expect(line.length, line).toBeLessThan(170)
    }
    // The sweep should exercise a real spread of the voice, not one canned line.
    expect(lines.size).toBeGreaterThan(8)
  })
})
