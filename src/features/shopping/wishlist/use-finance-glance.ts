// What the Wishlist borrows from Finance: how much of this month's budget is left (the same
// sum /finance's hero uses — summarize() over this month's ledger, budget scope respected) and
// the savings goals, so a wish with a goal can show its jar. Read-only; loads the finance
// slices only if nothing has loaded them yet this session.

import { useEffect } from 'react'
import { financeActions, useFinanceStore } from '@/store/finance-store'
import { budgetConfigOf, entriesInMonth, flattenLogs, localToday, summarize } from '@/lib/finance-ledger'
import type { SavingsGoal } from '@/types/finance'

export interface FinanceGlance {
  /** What's left of this month's budget (never below 0); null when no budget is set or it hasn't loaded. */
  budgetLeft: number | null
  monthlyBudget: number | null
  goalsById: Map<string, SavingsGoal>
}

export function useFinanceGlance(): FinanceGlance {
  const logs = useFinanceStore.use.dailyLogs()
  const budget = useFinanceStore.use.budget()
  const account = useFinanceStore.use.account()
  const goals = useFinanceStore.use.goals()

  useEffect(() => {
    if (!logs.loaded && !logs.loading) void financeActions.loadAll()
    if (!goals.loaded && !goals.loading) void financeActions.loadGoals()
    // Only on arrival — mutations re-read these slices themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const settings = budget.data ?? account.data
  const monthlyBudget = settings?.monthlyBudget && settings.monthlyBudget > 0 ? settings.monthlyBudget : null
  let budgetLeft: number | null = null
  if (monthlyBudget != null && logs.loaded) {
    const month = entriesInMonth(flattenLogs(logs.data), localToday().slice(0, 7))
    budgetLeft = Math.max(0, monthlyBudget - summarize(month, budgetConfigOf(settings)).budgeted)
  }
  return { budgetLeft, monthlyBudget, goalsById: new Map(goals.data.map((g) => [g.id, g])) }
}
