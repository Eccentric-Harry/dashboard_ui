import { describe, expect, it } from 'vitest'
import type { DailyFinancialLog } from '@/types/finance'
import {
  budgetConfigOf,
  countsTowardBudget,
  flattenLogs,
  logDay,
  summarize,
  txKind,
} from '@/lib/finance-ledger'

const log = (over: Partial<DailyFinancialLog>): DailyFinancialLog => ({
  id: 'l1',
  date: '2026-09-27T20:33:00Z',
  dailyTotals: { totalExpense: 0, totalIncome: 0 },
  transactions: {},
  ...over,
})

describe('txKind', () => {
  it('treats legacy untyped rows as spending unless the category says income', () => {
    expect(txKind({ type: null }, 'Food')).toBe('spending')
    expect(txKind({ type: null }, 'Salary')).toBe('income')
  })
  it('never counts a transfer as spending or income', () => {
    expect(txKind({ type: 'Transfer' }, 'Family')).toBe('transfer-out')
    expect(txKind({ type: 'Transfer', direction: 'IN' }, 'Loan Recovery')).toBe('transfer-in')
  })
})

describe('logDay', () => {
  it('prefers dateString — the Instant is the UTC day, a day early before 05:30 IST', () => {
    expect(logDay(log({ dateString: '2026-09-28' }))).toBe('2026-09-28')
  })
  it('accepts a bare date', () => {
    expect(logDay(log({ date: '2026-09-28' }))).toBe('2026-09-28')
  })
})

describe('summarize', () => {
  const entries = flattenLogs([
    log({
      dateString: '2026-09-04',
      transactions: {
        Rent: [{ id: 'r', description: 'PG Rent', amount: 16000, type: 'Expense', timestamp: '2026-09-04T05:00:00Z' }],
        Food: [{ id: 'f', description: 'Lunch', amount: 300, type: 'Expense', timestamp: '2026-09-04T07:00:00Z' }],
        Family: [{ id: 'h', description: 'Sent home', amount: 10000, type: 'Transfer', direction: 'OUT', timestamp: '2026-09-04T08:00:00Z' }],
        'Loan Recovery': [{ id: 'l', description: 'Kapoor paid back', amount: 3000, type: 'Transfer', direction: 'IN', timestamp: '2026-09-04T09:00:00Z' }],
        Salary: [{ id: 's', description: 'Salary', amount: 50000, type: 'Income', timestamp: '2026-09-04T03:00:00Z' }],
      },
    }),
  ])

  it('keeps transfers out of spending but in the net cash change', () => {
    const all = summarize(entries, budgetConfigOf(null))
    expect(all.spending).toBe(16300)
    expect(all.budgeted).toBe(16300)
    expect(all.transferOut).toBe(10000)
    expect(all.transferIn).toBe(3000)
    expect(all.income).toBe(50000)
    expect(all.net).toBe(50000 + 3000 - 16300 - 10000)
  })

  it('measures only flexible spending against a FLEX budget', () => {
    const flex = summarize(entries, budgetConfigOf({ budgetScope: 'FLEX' }))
    expect(flex.budgeted).toBe(300)
    expect(flex.fixed).toBe(16000)
    const rent = entries.find((e) => e.id === 'r')!
    expect(countsTowardBudget(rent, budgetConfigOf({ budgetScope: 'FLEX' }))).toBe(false)
    expect(countsTowardBudget(rent, budgetConfigOf({ budgetScope: 'ALL' }))).toBe(true)
  })
})
