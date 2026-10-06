// Fireside Tales — Pip tells the story of the week so far, by the campfire. Pure and
// deterministic: the board in, a short storybook out (a cover, a page per day up to today,
// and an ending). The same week always tells the same tale.
//
// The voice is Pip's: a day with lanterns lit is told as something that happened; a day
// without is a rest the camp took, never a miss. Your own check-in notes are quoted back
// to you, because the best lines in the tale are yours. The tone test in
// src/__tests__/fireside-tales.test.ts holds every page to buddy-brain's rules.

import type { GoalProgressView } from '@/types/goals'
import { addDays, formatAmount, isoWeek, shapeOf } from './goal-format'

export type TalePageKind = 'cover' | 'day' | 'rest' | 'today' | 'end'

export interface TalePage {
  kind: TalePageKind
  /** "Monday", "Today", or the cover/ending heading. */
  heading: string
  /** The page's sentences. */
  lines: string[]
  /** The user's own note, quoted on the page. */
  quote?: string
  /** Goal ids lit on this page's day — the page's little illustration. */
  lit: string[]
}

export interface Tale {
  title: string
  pages: TalePage[]
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const dayName = (iso: string) => DAY_NAMES[new Date(`${iso}T00:00:00Z`).getUTCDay()]

/** Stable pick among phrasings, seeded by the day, so a page never rewrites itself. */
function pick<T>(options: readonly T[], seed: string): T {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return options[Math.abs(h) % options.length]
}

/** "A", "A and B", "A, B and C". */
export function listOf(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

const REST = [
  (d: string) => `${d} was a quiet one. The camp rested, and the fire kept itself warm.`,
  (d: string, n: string) => `${d} drifted by softly. ${n} counted clouds. (Eleven. One looked like a teapot.)`,
  (d: string) => `${d} was for resting. Even lanterns like a night off now and then.`,
  (d: string) => `On ${d}, the camp napped in the sun. Moss said it was very wise of everyone.`,
  (d: string, n: string) => `${d} was a slow, cosy day. ${n} tidied the tent and hummed.`,
] as const

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'] as const
const count = (n: number) => NUMBER_WORDS[n] ?? String(n)

/** What a lit goal did that day, in its own terms: "10 pages", or just its name. */
function deed(view: GoalProgressView, value: number): string {
  const { goal } = view
  const shape = shapeOf(goal)
  if ((shape === 'daily-amount' || shape === 'weekly-total') && value > 0) {
    return `${goal.title} (${formatAmount(value, goal.unit)})`
  }
  return goal.title
}

/**
 * The tale of the week so far. `today` is the board's day; days after it are left for
 * the sequel. Days before every goal existed are skipped — the story starts when the
 * camp did.
 */
export function weekTale(goals: GoalProgressView[], today: string, weekStart: string, buddyName = 'Pip'): Tale {
  const week = isoWeek(weekStart)
  const title = `The Tale of Week ${week}`
  const name = buddyName
  const titles = goals.map((g) => g.goal.title)

  const cover: TalePage = {
    kind: 'cover',
    heading: title,
    lines:
      goals.length === 0
        ? [`Once upon a week, a sprout named ${name} sat by an empty string of lanterns, waiting for the very first one.`]
        : [
            `Once upon a week, a sprout named ${name} and a friend kept watch over ${count(goals.length)} lantern${goals.length === 1 ? '' : 's'}: ${listOf(titles)}.`,
            'This is what happened.',
          ],
    lit: [],
  }

  const pages: TalePage[] = [cover]
  let litDays = 0
  let stars = 0

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i)
    if (date > today) break
    const started = goals.filter((g) => !g.week.days[i]?.beforeStart)
    if (goals.length > 0 && started.length === 0) continue

    const lit = started.filter((g) => g.week.days[i]?.hit)
    const notes = goals
      .flatMap((g) => g.recentEntries)
      .filter((e) => e.date === date && e.note && e.note.trim())
      .map((e) => e.note!.trim())
    const quote = notes.length ? notes[notes.length - 1] : undefined
    const isToday = date === today
    const day = dayName(date)
    stars += lit.length

    if (lit.length === 0) {
      pages.push(
        isToday
          ? {
              kind: 'today',
              heading: 'Today',
              lines: [`And today… today’s page is still blank. ${name} is holding the pen, just in case.`],
              quote,
              lit: [],
            }
          : { kind: 'rest', heading: day, lines: [pick(REST, date)(day, name)], quote, lit: [] },
      )
      continue
    }

    litDays += 1
    const deeds = lit.map((g) => deed(g, g.week.days[i]?.value ?? 0))
    const opener = isToday ? 'Today' : `On ${day}`
    const lines: string[] = [
      lit.length === 1
        ? `${opener}, the ${deeds[0]} lantern glowed.`
        : `${opener}, ${count(lit.length)} lanterns glowed: ${listOf(deeds)}.`,
    ]
    if (started.length > 1 && lit.length === started.length) {
      lines.push(pick(['Every single one. The whole camp shone.', 'All of them! Fen closed the cart early to watch.', 'The whole string, lit. Wren wrote it down twice.'], date))
    } else if (litDays === 1) {
      lines.push(pick(['The first light of the week — always the bravest one.', 'And just like that, the week had begun.', `${name} did a small, dignified hop.`], date))
    } else {
      lines.push(pick([`${name} added a log to the fire.`, 'Moss nodded slowly, which is Moss for “bravo”.', 'Hoot saw it from the branch and hooted, once.', 'Somewhere, a firefly woke up.'], date))
    }
    pages.push({ kind: isToday ? 'today' : 'day', heading: isToday ? 'Today' : day, lines, quote, lit: lit.map((g) => g.goal.id) })
  }

  const kept = goals.filter((g) => g.week.kept).length
  const left = 6 - Math.round((Date.parse(today) - Date.parse(weekStart)) / 86_400_000)
  const ending: string[] = []
  if (goals.length > 0 && kept === goals.length) {
    ending.push(`And so every lantern’s week was kept. The end.`, `(${name} insists on a sequel.)`)
  } else if (left <= 0) {
    ending.push(stars > 0 ? `And that was the week: ${count(Math.min(stars, 8))}${stars > 8 ? ' and more' : ''} lights by the fire. The end.` : 'And that was a restful week. The end — and a fresh page tomorrow.')
  } else {
    ending.push(
      stars > 0 ? `${stars} light${stars === 1 ? '' : 's'} so far, and ${left} day${left === 1 ? '' : 's'} of story still to write.` : `${left} day${left === 1 ? '' : 's'} of story still to write — plenty of room for a good one.`,
      'To be continued…',
    )
  }
  pages.push({ kind: 'end', heading: kept === goals.length && goals.length > 0 ? 'The end' : 'To be continued', lines: ending, lit: [] })

  return { title, pages }
}
