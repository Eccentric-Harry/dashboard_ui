import { describe, expect, it } from 'vitest'
import type { DailyFinancialLog, FinancialTransaction } from '@/types/finance'
import { buildBurndown, financeInsights, legacyTransferBuckets } from '@/lib/insights/finance'

const tx = (id: string, amount: number, over: Partial<FinancialTransaction> = {}): FinancialTransaction => ({
  id,
  description: id,
  amount,
  type: 'Expense',
  timestamp: '2026-09-10T06:00:00Z',
  ...over,
})

const day = (d: string, transactions: Record<string, FinancialTransaction[]>): DailyFinancialLog => ({
  id: d,
  dateString: d,
  date: `${d}T06:00:00Z`,
  dailyTotals: { totalExpense: 0, totalIncome: 0 },
  transactions,
})

// A month that accelerates late: quiet for two weeks, then heavy. A least-squares line
// through that curve lands *below* today's total — the old forecast then clamped to
// "spent so far", i.e. predicted nothing more would be spent in the days left.
const logs = [
  day('2026-09-03', { Rent: [tx('rent', 16000)] }),
  ...Array.from({ length: 10 }, (_, i) => day(`2026-09-${String(18 + i).padStart(2, '0')}`, { Food: [tx(`f${i}`, 600)] })),
  day('2026-09-20', { Family: [tx('home', 20000, { type: 'Transfer', direction: 'OUT' })] }),
]

const input = { today: '2026-09-28', monthKey: '2026-09', logs, monthlyBudget: 12000 }

describe('buildBurndown', () => {
  it('forecasts the everyday pace forward and never extrapolates rent', () => {
    const b = buildBurndown(input)!
    expect(b.spent).toBe(22000)
    // 6,000 of everyday spending over 28 days, carried over the 2 days left.
    expect(b.dailyRate).toBeCloseTo(6000 / 28, 5)
    expect(b.projectedTotal).toBeCloseTo(22000 + (6000 / 28) * 2, 5)
    expect(b.projectedTotal).toBeGreaterThan(b.spent)
  })

  it('never counts money sent home as spending', () => {
    expect(buildBurndown(input)!.spent).toBe(22000)
  })

  it('measures only everyday spending under a FLEX budget', () => {
    const b = buildBurndown({ ...input, budgetScope: 'FLEX' })!
    expect(b.spent).toBe(6000)
    expect(b.flex).toBe(true)
  })

  it('reserves bills still due this month under an ALL budget', () => {
    const b = buildBurndown({
      ...input,
      subscriptions: [{ id: 's', name: 'Netflix', cost: 199, billingDate: '2026-08-30', intervalUnit: 'MONTH', intervalCount: 1 }],
    })!
    expect(b.committed).toBe(199)
    expect(b.projectedTotal).toBeCloseTo(22000 + (6000 / 28) * 2 + 199, 5)
  })
})

describe('insights', () => {
  it('does not flag a scheduled rent payment as an anomaly', () => {
    const ids = financeInsights(input).map((i) => i.id)
    expect(ids).not.toContain('fin-anomaly')
  })

  it('offers to move legacy "To Home" spending to transfers', () => {
    const legacy = legacyTransferBuckets({ ...input, logs: [day('2026-03-17', { 'To Home': [tx('gold', 30000)] })] })
    expect(legacy).toEqual([expect.objectContaining({ category: 'To Home', target: 'Family', total: 30000, count: 1 })])
  })
})
