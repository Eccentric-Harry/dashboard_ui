// How much light a goal's lantern holds, and what its paper tag says. Shared by the small
// lanterns on the string and the big one lowered for logging, so both always agree.

import type { GoalProgressView } from '@/types/goals'
import { formatAmount, formatNumber, shapeOf, weekRatio } from './goal-format'

/** The light inside: the day's share for daily amounts, the week's for everything else. */
export function lightLevel(view: GoalProgressView): number {
  const { goal, today } = view
  if (today.hit && (goal.period === 'DAY' || goal.measure === 'CHECK')) return 1
  switch (shapeOf(goal)) {
    case 'daily-amount':
      return goal.target > 0 ? Math.min(1, today.value / goal.target) : 0
    case 'weekly-total':
      return weekRatio(view)
    default:
      return 0
  }
}

/** The light an amount would bring it to — the striped preview while choosing how much. */
export function previewLevel(view: GoalProgressView, add: number, dayValue: number, inThisWeek: boolean): number {
  const { goal, week } = view
  if (!(add > 0)) return lightLevel(view)
  switch (shapeOf(goal)) {
    case 'daily-amount':
      return goal.target > 0 ? Math.min(1, (dayValue + add) / goal.target) : 0
    case 'weekly-total':
      return inThisWeek && week.target > 0 ? Math.min(1, (week.value + add) / week.target) : weekRatio(view)
    default:
      return 1
  }
}

/** The tag's figure: the big number and the small word after it. */
export function lanternFigure(view: GoalProgressView): { big: string; small: string } {
  const { goal, today, week } = view
  switch (shapeOf(goal)) {
    case 'daily-amount':
      return { big: `${formatNumber(today.value)}/${formatNumber(goal.target)}`, small: goal.unit ?? 'today' }
    case 'weekly-total':
      return { big: formatAmount(week.value, goal.unit), small: `of ${formatAmount(week.target, goal.unit)}` }
    case 'times-week':
      return { big: `${formatNumber(week.value)}/${formatNumber(week.target)}`, small: today.hit ? 'lit today' : 'this week' }
    case 'daily-check':
      return { big: today.hit ? 'Lit!' : 'Hold', small: today.hit ? 'for today' : 'to light it' }
  }
}
