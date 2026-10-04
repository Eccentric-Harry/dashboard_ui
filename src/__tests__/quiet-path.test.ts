import { describe, expect, it } from 'vitest'
import type { GoalJourneyDay } from '@/types/goals'
import { HELPLINES } from '@/lib/helplines'
import { COURSE, SATCHEL_AFTER, SESSIONS, sessionSecs } from '@/features/goals/worlds/quiet-path/course'
import { kiriLine, lastWeek, readPath } from '@/features/goals/worlds/quiet-path/path-data'
import { KIT_PAGES, kitPage } from '@/features/goals/worlds/quiet-path/kit'
import { POCKET_CARDS } from '@/features/goals/worlds/quiet-path/pocket-cards'
import { RESIDENTS } from '@/features/goals/worlds/quiet-path/residents'

// The Quiet Path's rules and every word it says are guardrails (design/GOALS_BUDDY_PLAN.md,
// "Goal worlds"): stones are walked by doing their session, one a day; replays never move
// you on or back; days tended only grow; and neither Kiri nor any session guilts, judges,
// scores a feeling or argues with a thought.

const day = (date: string, sessions: string[] = [], practices: GoalJourneyDay['practices'] = ['still'], notes: string[] = []): GoalJourneyDay => ({
  date,
  entries: Math.max(1, sessions.length),
  value: 1,
  practices,
  notes,
  sessions,
  minutes: sessions.length * 4,
})

const iso = (from: string, plus: number) => {
  const [y, m, d] = from.split('-').map(Number)
  const dt = new Date(y, m - 1, d + plus)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** `n` days walking the course in order from the first stone. */
const walk = (n: number, from = '2026-08-01') => Array.from({ length: n }, (_, i) => day(iso(from, i), [SESSIONS[i % SESSIONS.length].id]))

const BANNED = /\b(sad|sorry|disappoint\w*|fail\w*|lost|lose|miss(ed|ing)?|guilt\w*|lazy|should|must|shame on|fall(en)? behind|behind (on|again|schedule)|broke|ruin\w*|streak|depress\w*|fix yourself|wrong with you|score)\b/i

describe('the quiet path', () => {
  it('walks one stone per day, only by doing a stone of the chapter you are in', () => {
    const days = [
      day('2026-09-01', ['story-arriving']),
      // A replay, and a session from a later chapter, move nothing.
      day('2026-09-02', ['story-arriving', 'leaves-on-a-stream']),
      // Two of this chapter's sessions on one day: only the first moves you on.
      day('2026-09-03', ['arrive', 'three-sounds']),
      day('2026-09-04', [], ['walk']),
    ]
    const read = readPath(days, '2026-09-05')
    expect(read.walked.map((w) => w.session.id)).toEqual(['story-arriving', 'arrive'])
    expect(read.next.id).toBe('three-sounds')
    expect(read.daysTended).toBe(4)
    expect(read.walkedToday).toBe(false)
    expect(readPath(days, '2026-09-03').walkedToday).toBe(true)
  })

  it('never takes a walked stone away when the course changes around it', () => {
    // "arrive" was the first stone before chapters opened with a story: it still counts,
    // and the story that now comes before it is simply next.
    const read = readPath([day('2026-10-02', ['arrive'])], '2026-10-03')
    expect(read.walked.map((w) => w.session.id)).toEqual(['arrive'])
    expect(read.next.id).toBe('story-arriving')
    const later = readPath([day('2026-10-02', ['arrive']), day('2026-10-03', ['story-arriving'])], '2026-10-04')
    expect(later.next.id).toBe('three-sounds')
  })

  it('finishes chapters, opens satchels and loops after the summit', () => {
    const read = readPath(walk(SESSIONS.length + 2), '2026-12-30')
    expect(read.chaptersDone).toHaveLength(COURSE.length)
    expect(read.loop).toBe(1)
    expect(read.next.id).toBe(SESSIONS[2].id)
    expect(readPath(walk(6), '2026-09-30').chaptersDone.map((c) => c.chapter.n)).toEqual([1])
    expect(readPath(walk(SATCHEL_AFTER - 1), '2026-09-30').satchels).toEqual([])
    expect(readPath(walk(SATCHEL_AFTER), '2026-09-30').satchels).toEqual([1])
  })

  it('looks back at last week only', () => {
    const lw = lastWeek([day('2026-09-21', ['arrive']), day('2026-09-24'), day('2026-09-29', ['three-sounds'])], '2026-09-28')
    expect(lw).toEqual({ days: 2, sessions: 1, minutes: 4 })
  })

  it('every place is learn, practise, keep — complete, unique and honest about its lengths', () => {
    expect(COURSE).toHaveLength(9)
    expect(new Set(SESSIONS.map((s) => s.id)).size).toBe(SESSIONS.length)
    for (const chapter of COURSE) {
      const kinds = chapter.sessions.map((s) => s.kind ?? 'practice')
      expect(kinds, `chapter ${chapter.n}`).toEqual(['story', 'practice', 'practice', 'practice', 'practice', 'kit'])
      const story = chapter.sessions[0]
      // Each story teaches with a source and asks one gentle question.
      expect(story.steps.some((st) => st.kind === 'fact' && st.source.length > 4), story.id).toBe(true)
      expect(story.steps.some((st) => st.kind === 'choice' && st.options.length >= 3), story.id).toBe(true)
      expect(chapter.sessions[5].kit, `chapter ${chapter.n}`).toBe(KIT_PAGES.find((p) => p.chapter === chapter.n)?.key)
      // Every place but the trailhead (Kiri's own) has a resident who tells its story.
      if (chapter.n > 1) expect(story.host).toBe(RESIDENTS.find((r) => r.chapter === chapter.n)?.key)
    }
    for (const s of SESSIONS) {
      expect(s.steps.length, s.id).toBeGreaterThan(1)
      const [min, max] = (s.kind ?? 'practice') === 'practice' ? [2, 7] : [1, 4]
      expect(s.minutes, s.id).toBeGreaterThanOrEqual(min)
      expect(s.minutes, s.id).toBeLessThanOrEqual(max)
      expect(Math.abs(sessionSecs(s) / 60 - s.minutes), s.id).toBeLessThanOrEqual(0.5)
    }
    expect(POCKET_CARDS.map((c) => c.chapter)).toEqual(COURSE.map((c) => c.n))
  })

  it('the kit asks for a story’s name, never its content, and the heavy-day plan carries real help', () => {
    const stories = kitPage('stories')
    expect(stories.fields.every((f) => (f.maxLength ?? 300) <= 40)).toBe(true)
    expect(kitPage('heavy-day').helplines).toBe(true)
    expect(HELPLINES.map((h) => h.display)).toContain('14416')
  })

  it('nothing on the path guilts, judges or scores — Kiri, the guide, or any session', () => {
    const lines = new Set<string>()
    const cases: GoalJourneyDay[][] = [[], walk(1), walk(9), [day('2026-09-01', ['arrive'])], [...walk(20), day('2026-10-01', [], ['walk'])]]
    for (const days of cases) {
      for (const today of ['2026-10-01', '2026-10-02', '2026-10-05']) {
        for (let hour = 0; hour < 24; hour++) lines.add(kiriLine(readPath(days, today), today, hour))
      }
    }
    const read = readPath([], '2026-10-01')
    for (const chapter of COURSE) {
      lines.add(kiriLine(read, '2026-10-01', 12, { kind: 'chapter', chapter }))
      lines.add(chapter.intention)
      chapter.guide.forEach((g) => lines.add(g))
      for (const s of chapter.sessions) {
        lines.add(s.why)
        lines.add(s.closing)
        s.steps.forEach((step) => {
          if ('text' in step && step.text) lines.add(step.text)
          if (step.kind === 'fact') lines.add(step.title)
          if (step.kind === 'choice') step.options.forEach((o) => [o.label, o.reply].forEach((t) => lines.add(t)))
        })
      }
    }
    // The cast, the satchels' cards, and every word on the kit's pages.
    RESIDENTS.forEach((r) => r.lines.forEach((l) => lines.add(l)))
    POCKET_CARDS.forEach((c) => [c.title, c.text, c.tryIt].forEach((t) => lines.add(t)))
    for (const page of KIT_PAGES) {
      ;[page.title, page.blurb, ...page.groups.flatMap((g) => [g.label, ...g.chips]), ...page.fields.flatMap((f) => [f.label, f.placeholder])].forEach((t) => lines.add(t))
    }
    // Kiri, wherever the path stands: before a story, before a kit stone, with a satchel waiting.
    for (let n = 0; n < SESSIONS.length; n += 1) {
      const read = readPath(walk(n), '2027-03-01')
      lines.add(kiriLine(read, '2027-03-01', 14))
      lines.add(kiriLine(read, '2027-03-01', 14, null, { satchel: true }))
    }
    for (const line of lines) expect(line, line).not.toMatch(BANNED)
    // Kiri's own lines stay short enough for a bubble.
    for (let hour = 0; hour < 24; hour++) expect(kiriLine(readPath(walk(3), '2026-10-01'), '2026-10-01', hour).length).toBeLessThan(150)
    expect(lines.size).toBeGreaterThan(400)
  })

  it('welcomes a return without counting the days away', () => {
    const line = kiriLine(readPath([day('2026-09-20', ['arrive'])], '2026-10-01'), '2026-10-01', 14)
    expect(line).toMatch(/^Welcome back/)
    expect(line).not.toMatch(/\d+ days?/)
  })
})
