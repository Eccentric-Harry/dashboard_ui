// What a savings goal says about itself, in one place so the card, the workspace and the
// modals never word the same state two ways. Plain facts with a next step — "behind" is
// how far and what it now takes, never a verdict (FINANCE_SAVINGS_GOALS_PLAN §9).

import { inr } from '@/lib/insights/engine'
import { monthYear, shortDate, spanWords, type GoalPlan } from '@/lib/finance-goals'

export type GoalTone = 'good' | 'watch' | 'quiet' | 'done'

/** "₹23.6k", "₹1.6L" — for pills where a full figure won't fit. */
export const compactInr = (n: number): string => {
  const v = Math.round(n)
  if (v >= 100000) return `₹${(v / 100000).toFixed(v >= 1000000 ? 0 : 1).replace(/\.0$/, '')}L`
  if (v >= 1000) return `₹${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  return `₹${v}`
}

/** The row's one status line. */
export function statusLine(plan: GoalPlan): { text: string; tone: GoalTone } {
  const { goal } = plan
  switch (plan.state) {
    case 'ready':
      return { text: `Ready — ${inr(plan.saved)} saved`, tone: 'good' }
    case 'bought':
      return {
        text: goal.boughtFor != null ? `Bought for ${inr(goal.boughtFor)}${goal.boughtOn ? ` · ${shortDate(goal.boughtOn)}` : ''}` : 'Bought',
        tone: 'done',
      }
    case 'paused':
      return { text: `Paused · ${inr(plan.saved)} set aside`, tone: 'quiet' }
    case 'behind':
      if (plan.overdue) return { text: `Date passed · ${inr(plan.remaining ?? 0)} to go`, tone: 'watch' }
      return {
        text: `${spanWords(plan.behindDays ?? 1)} behind · ${inr(plan.monthlyNeed ?? 0)}/mo now`,
        tone: 'watch',
      }
    case 'ahead':
      return { text: `Ahead of plan${goal.targetDate ? ` · by ${shortDate(goal.targetDate)}` : ''}`, tone: 'good' }
    case 'on-track':
      return plan.dueThisCycle >= 1
        ? { text: `${inr(plan.dueThisCycle)} to set aside this payday`, tone: 'quiet' }
        : { text: `On track${goal.targetDate ? ` · by ${shortDate(goal.targetDate)}` : ''}`, tone: 'good' }
    default:
      if (plan.monthlyNeed) {
        return {
          text: `${inr(plan.monthlyNeed)} a month${plan.projectedDate ? ` · lands ${monthYear(plan.projectedDate)}` : ''}`,
          tone: 'quiet',
        }
      }
      return { text: plan.saved > 0 ? `${inr(plan.saved)} set aside` : 'Nothing set aside yet', tone: 'quiet' }
  }
}

/** The workspace's serif finding line. Returns [lead, amount-or-null, tail] so the amount can carry colour. */
export function findingLine(plan: GoalPlan): { amount: number | null; text: string } {
  const { goal } = plan
  const togo = plan.remaining ?? 0
  switch (plan.state) {
    case 'ready':
      return { amount: null, text: "Ready — you've saved all of it" }
    case 'bought':
      return {
        amount: null,
        text: `Bought${goal.boughtOn ? ` on ${shortDate(goal.boughtOn)}` : ''}${goal.boughtFor != null ? ` for ${inr(goal.boughtFor)}` : ''}`,
      }
    case 'paused':
      return { amount: plan.saved, text: 'set aside — paused for now' }
    case 'behind':
      return { amount: togo, text: plan.overdue ? 'to go — the date has passed' : `to go — about ${spanWords(plan.behindDays ?? 1)} behind` }
    case 'ahead':
      return { amount: togo, text: 'to go — ahead of plan' }
    case 'on-track':
      return { amount: togo, text: `to go — on track for ${goal.targetDate ? shortDate(goal.targetDate) : 'your date'}` }
    default:
      if (plan.target == null) return { amount: plan.saved, text: 'set aside so far' }
      return { amount: togo, text: plan.projectedDate ? `to go — lands ${monthYear(plan.projectedDate)}` : 'to go' }
  }
}

/** Board order: what needs attention first, then the plan's own order, finished goals last. */
const STATE_ORDER: Record<GoalPlan['state'], number> = {
  ready: 0,
  behind: 1,
  'on-track': 2,
  ahead: 2,
  open: 2,
  paused: 3,
  bought: 4,
  archived: 5,
}

export const byAttention = (a: GoalPlan, b: GoalPlan): number =>
  STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.goal.priority - b.goal.priority
