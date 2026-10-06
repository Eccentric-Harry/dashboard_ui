// Pip's brain. Pure and deterministic: the board, the clock and an optional fresh moment
// in; one mood and one line out. Nothing here is random, so a reload says the same thing,
// and nothing here reads /mind or mood (design/GOALS_BUDDY_PLAN.md, guardrail 4).
//
// The voice: state the fact, offer the smallest next step, never guilt. Pip is never sad,
// sick, hurt or disappointed — a quiet day makes Pip cosy, not upset. The tone test in
// src/__tests__/buddy-brain.test.ts holds every line to that.

import type { GoalProgressView } from '@/types/goals'
import type { CampFestival } from './camp-calendar'
import { formatAmount, shapeOf } from './goal-format'

export type PipMood = 'welcome' | 'waking' | 'content' | 'eager' | 'celebrating' | 'proud' | 'cozy'

export interface PipMoment {
  kind: 'day-done' | 'week-kept' | 'goal-done' | 'first-light' | 'chest' | 'quest' | 'bought' | 'wish' | 'festival'
  goalTitle?: string
  /** festival: which one the camp is dressed for. */
  festival?: CampFestival
  /** festival (birthday): a sealed letter is waiting at the lighthouse. */
  letterWaiting?: boolean
  streak?: number
  /** chest / quest: how many sparks came in. */
  sparks?: number
  /** bought: what from Fen's cart. */
  item?: string
}

export interface PipState {
  mood: PipMood
  line: string
}

/** A goal still worth doing today: not hit today, and its week isn't already kept. */
const stillOpen = (g: GoalProgressView) => !g.today.hit && !g.week.kept

/** Every goal has had its moment today (or doesn't need one this week). */
export const allDoneToday = (goals: GoalProgressView[]) => goals.length > 0 && goals.every((g) => !stillOpen(g))

/** The smallest useful step for a goal, in its own terms. */
export function smallestStep(g: GoalProgressView): string {
  const { goal, today, week } = g
  switch (shapeOf(goal)) {
    case 'daily-amount': {
      const left = Math.max(0, Math.ceil(goal.target - today.value))
      return today.value > 0 ? `${formatAmount(left, goal.unit)} to go` : `${formatAmount(goal.target, goal.unit)} would light it`
    }
    case 'weekly-total': {
      const share = week.perDayToFinish != null ? Math.max(1, Math.ceil(week.perDayToFinish)) : goal.target / 7
      return `about ${formatAmount(share, goal.unit)} keeps it on track`
    }
    default:
      return 'one hold lights it'
  }
}

/** Stable pick among phrasings, so the line changes day to day but not reload to reload. */
function pick<T>(options: readonly T[], seed: string): T {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return options[Math.abs(h) % options.length]
}

/**
 * The goal Pip suggests next: the one you told Hoot you'd light first, if it's still open;
 * then one already in motion today, else the easiest-looking one.
 */
function nextUp(goals: GoalProgressView[], firstLightId?: string | null): GoalProgressView | undefined {
  const open = goals.filter(stillOpen)
  return (
    (firstLightId ? open.find((g) => g.goal.id === firstLightId) : undefined) ??
    open.find((g) => g.week.pace === 'TIGHT') ??
    open.find((g) => g.today.value > 0) ??
    open.find((g) => g.goal.measure === 'CHECK') ??
    open[0]
  )
}

const FESTIVAL_LINES: Record<CampFestival, string> = {
  diwali: 'Happy Diwali! I lined the camp with diyas — one for every lantern, and a few spare for luck.',
  'new-year-eve': 'Last night of the year! Fen has been saving fireworks since the summer.',
  'new-year': 'Happy new year! Same camp, fresh pages. I like this one already.',
  birthday: 'Happy birthday! The whole camp is in on it — Fen even baked a cake. It’s mostly icing.',
}

/**
 * `firstLightId`: the lantern you told Hoot you'd light first today (CampView.firstLight),
 * which Pip suggests before anything else while it's still open.
 */
export function pipState(
  goals: GoalProgressView[],
  today: string,
  now: Date,
  moment?: PipMoment | null,
  name = 'Pip',
  firstLightId?: string | null,
): PipState {
  const hour = now.getHours()
  const seed = `${today}`

  // Camp moments come first — they answer something you just did.
  if (moment?.kind === 'bought') {
    return {
      mood: 'celebrating',
      line: moment.item
        ? `The ${moment.item.toLowerCase()}! I'm never taking it off. (I might take it off.)`
        : 'Something new from Fen! Do I look dashing? Don’t answer that.',
    }
  }
  if (moment?.kind === 'chest') {
    return {
      mood: 'proud',
      line: `${moment.sparks ?? 'Lots of'} sparks out of the chest — every one from a week you kept. Fen will be thrilled.`,
    }
  }
  if (moment?.kind === 'quest') {
    return { mood: 'eager', line: `Wren says thanks — that’s +${moment.sparks ?? 1} sparks in the jar.` }
  }
  if (moment?.kind === 'festival' && moment.festival) {
    return {
      mood: 'celebrating',
      line:
        moment.festival === 'birthday' && moment.letterWaiting
          ? 'Happy birthday! The whole camp is in on it. And there’s a letter waiting for you at the lighthouse.'
          : FESTIVAL_LINES[moment.festival],
    }
  }
  if (moment?.kind === 'wish') {
    return { mood: 'content', line: 'Did you see that shooting star? I made a wish for you. It’s a secret.' }
  }

  if (goals.length === 0) {
    return {
      mood: 'welcome',
      line: `Hi, I'm ${name}! Pick one little thing for us to look after, and I'll keep the fire going.`,
    }
  }

  if (moment?.kind === 'week-kept') {
    const streak = moment.streak ?? 1
    return {
      mood: 'proud',
      line:
        streak > 1
          ? `${moment.goalTitle} is kept for the week — ${streak} weeks in a row! I'm adding it to the sticker book.`
          : `${moment.goalTitle} is kept for the week! First sticker of many.`,
    }
  }

  if (moment?.kind === 'day-done' || (moment == null && allDoneToday(goals))) {
    return {
      mood: 'celebrating',
      line: pick(
        [
          'Every lantern is lit! That’s the whole list for today.',
          'All done for today. I’m doing a very small, very proud dance.',
          'That’s everything. The camp is glowing — go enjoy your evening.',
        ],
        seed,
      ),
    }
  }

  const done = goals.filter((g) => g.today.hit).length
  const next = nextUp(goals, firstLightId)
  const hootsPick = next != null && next.goal.id === firstLightId

  if (moment?.kind === 'first-light') {
    return {
      mood: 'proud',
      line: next
        ? `First light: ${moment.goalTitle}, just like you told Hoot. ${next.goal.title} next?`
        : `First light: ${moment.goalTitle}, just like you told Hoot. Hoot is being very smug about it.`,
    }
  }

  if (moment?.kind === 'goal-done' && next) {
    return {
      mood: 'eager',
      line: `${moment.goalTitle} — lit! ${next.goal.title} next? ${capitalise(smallestStep(next))}.`,
    }
  }

  const weekStarted = goals.some((g) => g.week.value > 0)
  if (now.getDay() === 1 && !weekStarted) {
    return {
      mood: 'welcome',
      line: pick(
        ['Brand-new week, clean trail. Where shall we start?', 'New week! Seven fresh stones ahead of us.'],
        seed,
      ),
    }
  }

  if (hour >= 21 || hour < 5) {
    return {
      mood: 'cozy',
      line: next
        ? pick(
            [
              `Cosy hour. If you have a few minutes, ${next.goal.title} is ready — or we rest. Both are fine.`,
              `Getting sleepy here. ${next.goal.title}: ${smallestStep(next)}, if you feel like it.`,
            ],
            seed,
          )
        : 'All quiet at camp. Goodnight, fire.',
    }
  }

  if (!next) {
    return { mood: 'content', line: 'Everything’s in good shape. I’ll keep the fire warm.' }
  }

  const tight = goals.find((g) => stillOpen(g) && g.week.pace === 'TIGHT')
  if (tight) {
    return {
      mood: 'eager',
      line: `Heads up: ${tight.goal.title} needs each day left this week. Today would do it — ${smallestStep(tight)}.`,
    }
  }

  if (next && hootsPick && done === 0 && hour < 12) {
    return {
      mood: 'waking',
      line: `Morning! Hoot hung a star on ${next.goal.title} — your first light today. ${capitalise(smallestStep(next))}.`,
    }
  }

  if (done === 0 && hour < 12) {
    return {
      mood: 'waking',
      line: pick(
        [
          `Morning! ${goals.length} little things today. ${next.goal.title} first? ${capitalise(smallestStep(next))}.`,
          `*yawn* Good morning. Shall we start with ${next.goal.title}?`,
        ],
        seed,
      ),
    }
  }

  if (done > 0) {
    return {
      mood: 'eager',
      line: `${done} lit so far! ${next.goal.title} next? ${capitalise(smallestStep(next))}.`,
    }
  }

  return {
    mood: 'content',
    line: pick(
      [
        `Quiet day so far — that’s okay. ${next.goal.title}: ${smallestStep(next)}.`,
        `Nothing’s slipping. One small thing keeps the fire warm — maybe ${next.goal.title}?`,
      ],
      seed,
    ),
  }
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
