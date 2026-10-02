// The worlds a goal can have of its own. Every goal keeps its lantern at camp; a world is
// a second, dedicated place for it, visited at /goals?world=<goalId>. Keys are stored on
// the goal (Goal.world, validated by GoalRequest), so they're forever — rename a label,
// never a key.

import type { GoalWorldKey } from '@/types/goals'

export interface GoalWorldInfo {
  key: GoalWorldKey
  name: string
  /** One line for the workshop's picker. */
  blurb: string
}

export const GOAL_WORLDS: GoalWorldInfo[] = [
  { key: 'path', name: 'The Quiet Path', blurb: 'A journey, not a target — one step each day you tend it, through nine quiet places.' },
]

export const goalWorld = (key?: string | null) => GOAL_WORLDS.find((w) => w.key === key)
