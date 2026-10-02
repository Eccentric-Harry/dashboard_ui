// The Quiet Path's rules and words (design/GOALS_BUDDY_PLAN.md, "Goal worlds").
//
// The path is a course (course.ts): each stone is one short guided session — a story, a
// practice or a kit page. A stone is walked by doing its session — at most one new stone a
// day, so the course is spaced out the way practice sticks best, and replays never move
// you on or back. Stones in the chapter you're in count in any order (so a course edit
// can never take a walked stone away); stones further on wait their turn. Days you tended
// your peace in any way are counted separately and only ever grow.
// Kiri, the heron who keeps the path, speaks only about the path — never about feelings.

import type { GoalJourneyDay, GoalPractice } from '@/types/goals'
import { COURSE, SATCHEL_AFTER, SESSIONS, chapterOf, sessionById, type Chapter, type Session } from './course'
import { speakerName } from './residents'

export interface PracticeInfo {
  key: GoalPractice
  label: string
  fill: string
}

export const PRACTICES: PracticeInfo[] = [
  { key: 'breathe', label: 'Breathe', fill: '#52b4ff' },
  { key: 'walk', label: 'Walk', fill: '#3fcb91' },
  { key: 'still', label: 'Be still', fill: '#2fc4be' },
  { key: 'write', label: 'Write', fill: '#a07cff' },
  { key: 'gratitude', label: 'Gratitude', fill: '#ff6f95' },
  { key: 'nature', label: 'Nature', fill: '#58ac6b' },
  { key: 'talk', label: 'Reach out', fill: '#ff9f5a' },
  { key: 'learn', label: 'Learn', fill: '#f5b82e' },
  { key: 'other', label: 'Something else', fill: '#ffcb3d' },
]

export const practiceInfo = (key?: string | null) => PRACTICES.find((p) => p.key === key)

/** Candy colours by key, for chapter nodes and banners. */
export const CHAPTER_COLORS: Record<Chapter['color'], { fill: string; lip: string; soft: string; ink: string }> = {
  sky: { fill: '#52b4ff', lip: '#2a8edd', soft: '#dbeeff', ink: '#0e4a7e' },
  mint: { fill: '#3fcb91', lip: '#23a56f', soft: '#d6f5e7', ink: '#0d5c3c' },
  teal: { fill: '#2fc4be', lip: '#179f99', soft: '#d3f4f2', ink: '#0a5a56' },
  grape: { fill: '#a07cff', lip: '#7a55e0', soft: '#ece4ff', ink: '#41239e' },
  berry: { fill: '#ff6f95', lip: '#de4772', soft: '#ffe1e9', ink: '#8a1c3d' },
  tangerine: { fill: '#ff9f5a', lip: '#e0742c', soft: '#ffe7d4', ink: '#8a3b0c' },
  lemon: { fill: '#f5b82e', lip: '#d69a12', soft: '#fff2c7', ink: '#6e4d00' },
}

// ── Reading the journey ──────────────────────────────────────────────────

const toDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000)

export interface PathRead {
  /** Days tended in any way — only grows. */
  daysTended: number
  /** Anything logged today. */
  tendedToday: boolean
  /** Days since the last tended day before today (null if none). */
  gap: number | null
  /** Minutes of practice, all time. */
  minutes: number
  /** Stones walked, in the order walked, with the day and which walk of the course. */
  walked: { session: Session; date: string; loop: number }[]
  /** This walk of the course: stone id → the day it was walked. */
  doneNow: Map<string, string>
  /** Today already walked a new stone — the next opens tomorrow. */
  walkedToday: boolean
  /** The next stone's session (the course loops after the summit). */
  next: Session
  /** The chapter the next stone is in. */
  nextChapter: Chapter
  /** How many times the whole path has been walked. */
  loop: number
  /** Chapters finished, with the day the last stone was walked. */
  chaptersDone: { chapter: Chapter; date: string; loop: number }[]
  /** Chapters whose satchel has been reached (its first stones walked, on any walk). */
  satchels: number[]
  /** Each practice and how often it was part of a day. */
  tally: { practice: PracticeInfo; count: number }[]
  /** "What stayed with you" lines, newest first. */
  helped: { date: string; note: string }[]
}

export function readPath(days: GoalJourneyDay[], today: string): PathRead {
  const n = SESSIONS.length
  const walked: PathRead['walked'] = []
  let doneNow = new Map<string, string>()
  const ever = new Set<string>()
  let loop = 0
  let lastAdvance: string | null = null
  const nextOf = () => SESSIONS.find((s) => !doneNow.has(s.id)) ?? SESSIONS[0]
  for (const day of days) {
    if (lastAdvance === day.date) continue
    const dueChapter = chapterOf(nextOf().id).n
    // One new stone a day: the first session done that day that's still to walk in the
    // chapter you're in. Replays, and sessions from further on, move nothing.
    const id = (day.sessions ?? []).find((sid) => !doneNow.has(sid) && sessionById(sid) != null && chapterOf(sid).n === dueChapter)
    const session = sessionById(id)
    if (!id || !session) continue
    walked.push({ session, date: day.date, loop })
    doneNow.set(id, day.date)
    ever.add(id)
    lastAdvance = day.date
    if (doneNow.size === n) {
      loop++
      doneNow = new Map()
    }
  }
  const chaptersDone: PathRead['chaptersDone'] = []
  for (let l = 0; l <= loop; l++) {
    const inLoop = new Map(walked.filter((w) => w.loop === l).map((w) => [w.session.id, w.date]))
    for (const chapter of COURSE) {
      const dates = chapter.sessions.map((s) => inLoop.get(s.id))
      if (dates.every((d): d is string => d != null)) chaptersDone.push({ chapter, date: dates.reduce((a, b) => (b > a ? b : a)), loop: l })
    }
  }
  chaptersDone.sort((a, b) => a.loop - b.loop || a.date.localeCompare(b.date) || a.chapter.n - b.chapter.n)
  const next = nextOf()
  const before = days.filter((d) => d.date < today).at(-1)
  const counts = new Map<string, number>()
  days.forEach((d) => d.practices.forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1)))
  return {
    daysTended: days.length,
    tendedToday: days.at(-1)?.date === today,
    gap: before ? daysBetween(before.date, today) : null,
    minutes: days.reduce((sum, d) => sum + (d.minutes ?? 0), 0),
    walked,
    doneNow,
    walkedToday: lastAdvance === today,
    next,
    nextChapter: chapterOf(next.id),
    loop,
    chaptersDone,
    satchels: COURSE.filter((c) => c.sessions.slice(0, SATCHEL_AFTER).every((s) => ever.has(s.id))).map((c) => c.n),
    tally: PRACTICES.map((p) => ({ practice: p, count: counts.get(p.key) ?? 0 }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count),
    helped: days
      .flatMap((d) => d.notes.map((note) => ({ date: d.date, note })))
      .reverse()
      .slice(0, 10),
  }
}

/** Last week (Mon–Sun before this one), for the quiet look-back. */
export function lastWeek(days: GoalJourneyDay[], weekStart: string): { days: number; sessions: number; minutes: number } {
  const start = toDate(weekStart)
  start.setDate(start.getDate() - 7)
  const pad = (v: number) => String(v).padStart(2, '0')
  const from = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
  const inWeek = days.filter((d) => d.date >= from && d.date < weekStart)
  return {
    days: inWeek.length,
    sessions: inWeek.reduce((sum, d) => sum + (d.sessions?.length ?? 0), 0),
    minutes: inWeek.reduce((sum, d) => sum + (d.minutes ?? 0), 0),
  }
}

// ── Kiri's voice ─────────────────────────────────────────────────────────
// Short, plain, kind. About the path, never about feelings; never a should, never a
// count of days away. src/__tests__/quiet-path.test.ts holds every line to that.

const pick = <T,>(options: readonly T[], seed: string): T => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return options[Math.abs(h) % options.length]
}

export type KiriMoment = { kind: 'session'; session: Session } | { kind: 'chapter'; chapter: Chapter } | { kind: 'say'; text: string }

/** "the birch wood", "Fern hollow" — a place in the middle of a sentence. */
const placeIn = (chapter: Chapter) => chapter.place.replace(/^The /, 'the ')

export function kiriLine(read: PathRead, today: string, hour: number, moment?: KiriMoment | null, extra?: { satchel?: boolean }): string {
  if (moment?.kind === 'chapter') return moment.chapter.postcard
  if (moment?.kind === 'session') return moment.session.closing
  if (moment?.kind === 'say') return moment.text
  const next = `“${read.next.title}”`
  if (read.walked.length === 0 && read.daysTended === 0) {
    return `This is the start of a quiet path. Each stone is a few minutes — the first is a short story, ${next}.`
  }
  if (read.walkedToday) {
    return pick(
      [
        `Today’s stone is down. ${next} opens tomorrow — spacing it out helps it stay with you.`,
        'That’s today’s stone. The tools in Anytime are open whenever you want them.',
        'Well walked. The next stone will keep until tomorrow.',
      ],
      today,
    )
  }
  if (read.gap != null && read.gap >= 3) return `Welcome back. The path kept your place — ${next} is waiting.`
  if (extra?.satchel) {
    return pick(['There’s a satchel by the path, with something useful inside.', 'Someone left a satchel on the trail. Take a look inside.'], today)
  }
  const host = read.next.host && read.next.host !== 'kiri' ? speakerName(read.next.host) : null
  if (read.next.kind === 'story' && host) {
    return pick([`${host} has a story for you today: ${next}, about ${read.next.minutes} minutes.`, `Today you meet ${host}, who lives in ${placeIn(read.nextChapter)}. Their story: ${next}.`], today)
  }
  if (read.next.kind === 'kit') {
    return pick([`Last stone of ${placeIn(read.nextChapter)}: ${next}. It goes in your kit.`, `Today you pack a page of your kit — ${next}.`], today)
  }
  if (hour >= 21 || hour < 5) {
    return pick(
      [`If sleep feels far off tonight, the 4·7·8 breath is in Anytime. Or ${next}, if you’d like.`, `Evening on the path. ${next} is about ${read.next.minutes} minutes, whenever suits.`],
      today,
    )
  }
  return pick(
    [
      `Today’s stone: ${next} — about ${read.next.minutes} minutes, whenever suits.`,
      `No rush here. ${next} will wait for you.`,
      `One small session today: ${next}. That’s the whole step.`,
    ],
    today,
  )
}
