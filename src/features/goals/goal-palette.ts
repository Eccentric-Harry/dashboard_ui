import type { Goal, GoalColor } from '@/types/goals'

/**
 * The candy palette goals wear on /goals. Only keys live here — the colours themselves
 * are CSS (`[data-color='…']` in goals-overview.css), the same in every theme: the camp
 * is an illustration and keeps its colours.
 */
export const GOAL_COLORS: { key: GoalColor; label: string }[] = [
  { key: 'tangerine', label: 'Tangerine' },
  { key: 'mint', label: 'Mint' },
  { key: 'sky', label: 'Sky' },
  { key: 'grape', label: 'Grape' },
  { key: 'berry', label: 'Berry' },
  { key: 'lemon', label: 'Lemon' },
  { key: 'teal', label: 'Teal' },
]

/** A goal's colour; goals saved before colours existed take one from their board order. */
export function goalColor(goal: Pick<Goal, 'color' | 'order'>): GoalColor {
  return goal.color ?? GOAL_COLORS[Math.abs(goal.order) % GOAL_COLORS.length].key
}
