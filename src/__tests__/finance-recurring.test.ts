import { describe, expect, it } from 'vitest'
import type { SubscriptionDTO } from '@/types/finance'
import type { LedgerEntry } from '@/lib/finance-ledger'
import { billStatus, cycleLabel, dueDateAt, monthlyCostOf, paymentsFor, stillDueInMonth } from '@/lib/finance-recurring'

const sub = (over: Partial<SubscriptionDTO> = {}): SubscriptionDTO => ({
  id: 's1',
  name: 'Netflix',
  cost: 199,
  billingDate: '2026-06-28',
  intervalUnit: 'MONTH',
  intervalCount: 1,
  ...over,
})

const pay = (day: string, over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: `tx-${day}`,
  description: 'Netflix',
  amount: 199,
  category: 'Subscriptions',
  kind: 'spending',
  type: 'Expense',
  day,
  at: 0,
  time: null,
  subscriptionId: 's1',
  ...over,
})

describe('dueDateAt', () => {
  it('keeps the anchor day and clamps short months', () => {
    expect(dueDateAt('2026-01-31', 'MONTH', 1, 1)).toBe('2026-02-28')
    expect(dueDateAt('2026-01-31', 'MONTH', 1, 2)).toBe('2026-03-31')
    expect(dueDateAt('2026-01-31', 'MONTH', 1, -2)).toBe('2025-11-30')
  })
  it('steps days and years', () => {
    expect(dueDateAt('2026-09-19', 'DAY', 28, 1)).toBe('2026-10-17')
    expect(dueDateAt('2024-02-29', 'YEAR', 1, 1)).toBe('2025-02-28')
  })
})

describe('billStatus', () => {
  it('is due soon inside a week with no payment', () => {
    const s = billStatus(sub(), [], '2026-09-24')
    expect(s.state).toBe('due-soon')
    expect(s.nextDue).toBe('2026-09-28')
    expect(s.daysUntil).toBe(4)
  })

  it('counts an early payment toward the upcoming due date', () => {
    // Real Jio pattern: paid on the 19th for a bill due on the 30th.
    const jio = sub({ name: 'Jio Prepaid', billingDate: '2026-06-30' })
    const s = billStatus(jio, [pay('2026-09-19')], '2026-09-28')
    expect(s.state).toBe('paid')
    expect(s.nextDue).toBe('2026-09-30')
  })

  it('stays paid after the due date until the next cycle gets close', () => {
    const s = billStatus(sub(), [pay('2026-09-28')], '2026-10-05')
    expect(s.state).toBe('paid')
    expect(s.nextDue).toBe('2026-10-28')
  })

  it('flags a missed due date as overdue only for half a cycle', () => {
    expect(billStatus(sub(), [], '2026-10-02')).toMatchObject({ state: 'overdue', overdueSince: '2026-09-28', daysOverdue: 4 })
    // Past the midpoint the missed cycle is dropped and the next one takes over.
    expect(billStatus(sub(), [], '2026-10-16').state).toBe('upcoming')
  })

  it('never calls a due date before a future anchor overdue', () => {
    const s = billStatus(sub({ billingDate: '2026-10-10' }), [], '2026-09-28')
    expect(s.state).toBe('upcoming')
    expect(s.nextDue).toBe('2026-10-10')
  })

  it('infers the schedule from the last payment when no due date is set', () => {
    // Claude Code Pro: no billing date, paid on the 8th.
    const claude = sub({ id: 's2', name: 'Claude Code Pro', billingDate: null, cost: 1999 })
    const s = billStatus(claude, [pay('2026-09-08', { subscriptionId: 's2', description: 'Claude Code Pro Subscription' })], '2026-09-28')
    expect(s.state).toBe('paid')
    expect(s.nextDue).toBe('2026-10-08')
  })

  it('is unscheduled with neither a due date nor a payment', () => {
    expect(billStatus(sub({ billingDate: null }), [], '2026-09-28').state).toBe('unscheduled')
  })

  it('ignores payments dated in the future', () => {
    expect(billStatus(sub(), [pay('2026-09-29')], '2026-09-26').state).toBe('due-soon')
  })
})

describe('paymentsFor', () => {
  it('matches legacy unlinked rows by name but never steals another bill’s payment', () => {
    const rows = [
      pay('2026-09-08', { subscriptionId: null, description: 'Netflix Monthly Subscription' }),
      pay('2026-08-08', { subscriptionId: 'other', description: 'Netflix' }),
      pay('2026-07-08', { subscriptionId: null, description: 'Netflix', kind: 'transfer-out' }),
    ]
    expect(paymentsFor(sub(), rows).map((p) => p.day)).toEqual(['2026-09-08'])
  })
})

describe('costs & labels', () => {
  it('normalises to a monthly figure', () => {
    expect(monthlyCostOf(sub({ cost: 1200, intervalUnit: 'YEAR', monthlyCost: undefined }))).toBeCloseTo(100, 0)
    expect(monthlyCostOf(sub({ cost: 399, intervalUnit: 'DAY', intervalCount: 28, monthlyCost: undefined }))).toBeCloseTo(433.7, 0)
    expect(monthlyCostOf(sub({ monthlyCost: 42 }))).toBe(42)
  })
  it('labels cycles', () => {
    expect(cycleLabel({ intervalUnit: 'MONTH', intervalCount: 1 })).toBe('Monthly')
    expect(cycleLabel({ intervalUnit: 'MONTH', intervalCount: 3 })).toBe('Quarterly')
    expect(cycleLabel({ intervalUnit: 'DAY', intervalCount: 28 })).toBe('Every 28 days')
  })
  it('knows what is still due this month', () => {
    expect(stillDueInMonth(billStatus(sub(), [], '2026-09-24'), '2026-09')).toBe(true)
    expect(stillDueInMonth(billStatus(sub(), [pay('2026-09-24')], '2026-09-24'), '2026-09')).toBe(false)
  })
})
