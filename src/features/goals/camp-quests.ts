// Wren's letter: the words for each quest kind and the letter's greeting. The server only
// says what a quest is (util/CampRules.java); how it reads lives here, in one voice —
// small, optional, never a chore, and nothing is ever "failed" (it just isn't done yet).

import type { CampQuest } from '@/types/goals'
import { formatAmount, formatNumber } from './goal-format'

export function questTitle(q: CampQuest): string {
  switch (q.kind) {
    case 'light-n':
      return `Light ${formatNumber(q.target)} lanterns`
    case 'light-goal':
      return `Light ${q.goalTitle ?? 'a lantern'}`
    case 'note':
      return 'Leave a note on a lantern'
    case 'early':
      return 'Light something before noon'
    case 'amount':
      return `Log ${formatAmount(q.amount ?? q.target, q.unit)} of ${q.goalTitle ?? 'a goal'}`
    case 'all':
      return 'Light every lantern'
  }
}

/** The small line under a quest: how far along, in its own terms. */
export function questProgress(q: CampQuest): string {
  if (q.claimed) return 'Claimed'
  if (q.done) return 'Done — claim it!'
  if (q.kind === 'amount') return `${formatAmount(q.progress, q.unit)} of ${formatAmount(q.target, q.unit)}`
  if (q.target > 1) return `${formatNumber(q.progress)} of ${formatNumber(q.target)}`
  switch (q.kind) {
    case 'note':
      return 'Add one when you log — a line is plenty'
    case 'early':
      return 'Any lantern, any amount, before 12'
    default:
      return 'Whenever suits'
  }
}

const GREETINGS = [
  'Post for the camp! Three small errands today — any one of them is a win.',
  'Morning mail! Nothing urgent. Just a few things that would be nice.',
  'Fresh letter, still warm. Do one, do all, do none — it all rests fine.',
  'Special delivery! Little quests, little sparks. No rush at all.',
]

/** Same greeting all day, a different one tomorrow. */
export function letterGreeting(day: string): string {
  let h = 0
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) | 0
  return GREETINGS[Math.abs(h) % GREETINGS.length]
}

/** Quests worth claiming right now: today's and yesterday's leftovers. */
export const claimable = (quests: CampQuest[]) => quests.filter((q) => q.done && !q.claimed)
