import { describe, expect, it } from 'vitest'
import type { SavingsGoal } from '@/types/finance'
import { budgetConfigOf, summarize, countsTowardBudget, type LedgerEntry } from '@/lib/finance-ledger'
import {
  goalDays,
  lastPayday,
  leftoverOffer,
  monthCapacity,
  nthPaydayAfter,
  paydayIn,
  paydayPlan,
  paydaysAfter,
  planGoal,
  roomFor,
} from '@/lib/finance-goals'

const goal = (over: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: 'g1',
  name: 'iPhone 18 Pro',
  kind: 'PURCHASE',
  icon: 'phone',
  color: null,
  targetAmount: 164900,
  listPrice: null,
  exchangeValue: null,
  cardOffer: null,
  targetDate: '2027-04-01',
  plannedMonthly: null,
  keptAt: 'SBI RD',
  startDate: '2026-10-02',
  priority: 0,
  status: 'ACTIVE',
  boughtOn: null,
  boughtFor: null,
  saved: 0,
  setAside: 0,
  takenOut: 0,
  spent: 0,
  contributions: 0,
  firstContributionDate: null,
  lastContributionDate: null,
  ...over,
})

const row = (day: string, amount: number, over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  id: `tx-${day}-${amount}`,
  description: 'To iPhone 18 Pro',
  amount,
  category: 'Savings',
  kind: 'transfer-out',
  type: 'Transfer',
  direction: 'OUT',
  day,
  at: 0,
  time: null,
  subscriptionId: null,
  goalId: 'g1',
  ...over,
})

describe('paydays', () => {
  it('clamps a 31st payday to the month end', () => {
    expect(paydayIn(2027, 1, 31)).toBe('2027-02-28')
    expect(paydayIn(2026, 9, 1)).toBe('2026-10-01')
  })
  it('finds the last payday and the ones after', () => {
    expect(lastPayday('2026-10-02', 1)).toBe('2026-10-01')
    expect(lastPayday('2026-10-02', 5)).toBe('2026-09-05')
    expect(paydaysAfter('2026-10-02', '2027-04-01', 1)).toEqual([
      '2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01', '2027-03-01', '2027-04-01',
    ])
    expect(nthPaydayAfter('2026-10-02', 2, 1)).toBe('2026-12-01')
  })
})

describe('planGoal', () => {
  it('spreads what is left over this cycle and every payday up to the date', () => {
    const plan = planGoal(goal(), { entries: [], today: '2026-10-02', payday: 1 })
    // This cycle + Nov…Apr = 7 set-asides.
    expect(plan.paydaysLeft).toBe(7)
    expect(Math.round(plan.monthlyNeed ?? 0)).toBe(23557)
    expect(Math.round(plan.dueThisCycle)).toBe(23557)
    expect(plan.state).toBe('on-track')
  })

  it("counts this cycle's set-aside as done, not as ahead", () => {
    const plan = planGoal(goal({ saved: 23557 }), { entries: [row('2026-10-02', 23557)], today: '2026-10-05', payday: 1 })
    expect(plan.dueThisCycle).toBeLessThan(1)
    expect(plan.state).toBe('on-track')
  })

  it('reads behind only once a whole payday was missed, with the gap in rupees and days', () => {
    // Started in October, nothing set aside by mid-December: two cycles missed.
    const plan = planGoal(goal(), { entries: [], today: '2026-12-15', payday: 1 })
    expect(plan.state).toBe('behind')
    expect(Math.round(plan.behindBy ?? 0)).toBe(Math.round((164900 * 2) / 7))
    expect(plan.behindDays).toBeGreaterThan(50)
    // The shortfall is re-spread over the five cycles left, never demanded at once.
    expect(plan.paydaysLeft).toBe(5)
    expect(Math.round(plan.monthlyNeed ?? 0)).toBe(32980)
  })

  it('is ready once the target is reached, and bought once bought', () => {
    expect(planGoal(goal({ saved: 165000 }), { entries: [], today: '2027-01-10' }).state).toBe('ready')
    expect(planGoal(goal({ status: 'BOUGHT' }), { entries: [], today: '2027-01-10' }).state).toBe('bought')
  })

  it('runs an undated goal on its monthly amount and projects the landing', () => {
    const plan = planGoal(goal({ targetDate: null, plannedMonthly: 15000 }), { entries: [], today: '2026-10-02', payday: 1 })
    expect(plan.state).toBe('open')
    expect(plan.dueThisCycle).toBe(15000)
    // 11 set-asides: this cycle, then Nov…Aug, landing on the 1 Aug 2027 payday.
    expect(plan.projectedDate).toBe('2027-08-01')
  })

  it('projects from what you actually set aside once there is history', () => {
    const entries = [row('2026-10-01', 10000), row('2026-11-01', 10000), row('2026-12-01', 10000)]
    const plan = planGoal(goal({ saved: 30000, startDate: '2026-10-01' }), { entries, today: '2026-12-20', payday: 1 })
    expect(plan.paceSource).toBe('history')
    expect(plan.pace).toBeGreaterThan(9000)
    expect(plan.projectedDate! > '2027-04-01').toBe(true)
  })
})

describe('pace', () => {
  it('counts whole pay cycles, so a payday set-aside is never cut off by the window', () => {
    const entries = ['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01'].map((d) => row(d, 6000))
    const plan = planGoal(goal({ targetDate: null, plannedMonthly: 6000, saved: 24000, startDate: '2026-06-01' }), {
      entries,
      today: '2026-10-02',
      payday: 1,
    })
    expect(plan.paceSource).toBe('history')
    expect(plan.pace).toBe(6000)
  })
})

describe('capacity', () => {
  const spend = (day: string, amount: number, category = 'Food'): LedgerEntry =>
    row(day, amount, { kind: 'spending', type: 'Expense', direction: undefined, category, goalId: null })

  it('is unknown without a take-home, never zero', () => {
    const cap = monthCapacity({
      account: { monthlyBudget: 12000, takeHomeMonthly: null },
      entries: [],
      config: budgetConfigOf(null),
      plans: [],
      today: '2026-10-02',
    })
    expect(cap.takeHome).toBeNull()
    expect(cap.spare).toBeNull()
  })

  it('takes a typical month of spending and money sent home off the take-home', () => {
    const entries = [
      spend('2026-09-03', 16000, 'Rent'),
      spend('2026-09-10', 9000),
      row('2026-09-05', 10000, { kind: 'transfer-out', category: 'Family', goalId: null }),
      // A purchase from a goal is never "typical spending".
      spend('2026-09-20', 120000, 'Shopping'),
    ]
    entries[3].goalId = 'old-goal'
    const plan = planGoal(goal(), { entries, today: '2026-10-02', payday: 1 })
    const cap = monthCapacity({
      account: { monthlyBudget: 12000, takeHomeMonthly: 70000 },
      entries,
      config: budgetConfigOf({ budgetScope: 'ALL' }),
      plans: [plan],
      today: '2026-10-02',
    })
    expect(cap.spending).toBe(25000)
    expect(cap.sentHome).toBe(10000)
    expect(cap.spare).toBe(35000)
    expect(roomFor(plan, cap)).toBe(35000)
    expect(Math.round(cap.free ?? 0)).toBe(35000 - 23557)
  })
})

describe('the monthly rhythm', () => {
  it('lists what is still due this payday', () => {
    const plan = planGoal(goal(), { entries: [], today: '2026-10-02', payday: 1 })
    expect(paydayPlan([plan]).map((l) => l.amount)).toEqual([23557])
  })

  it('measures a spend in days of goal saving', () => {
    const plan = planGoal(goal(), { entries: [], today: '2026-10-02', payday: 1 })
    expect(Math.round(goalDays(3100, plan) ?? 0)).toBe(4)
  })

  it('offers last month’s leftover once, early in the month', () => {
    const config = budgetConfigOf({ budgetScope: 'ALL' })
    const sept = [row('2026-09-10', 9660, { kind: 'spending', type: 'Expense', category: 'Food', goalId: null })]
    const offer = leftoverOffer({ entries: sept, config, budget: 12000, today: '2026-10-02' })
    expect(offer).toEqual({ monthKey: '2026-09', monthName: 'September', amount: 2340, note: 'September leftover' })
    const swept = [...sept, row('2026-10-02', 2340, { description: 'To Safety net · September leftover' })]
    expect(leftoverOffer({ entries: swept, config, budget: 12000, today: '2026-10-02' })).toBeNull()
    expect(leftoverOffer({ entries: sept, config, budget: 12000, today: '2026-10-14' })).toBeNull()
  })
})

describe('ledger', () => {
  it('keeps a goal purchase off the budget but in spending, and splits goal transfers out', () => {
    const entries: LedgerEntry[] = [
      row('2026-10-02', 164900, { kind: 'spending', type: 'Expense', category: 'Shopping', direction: undefined }),
      row('2026-10-02', 150000, { kind: 'transfer-in', direction: 'IN' }),
      row('2026-10-01', 5000),
    ]
    const config = budgetConfigOf({ budgetScope: 'ALL' })
    expect(countsTowardBudget(entries[0], config)).toBe(false)
    const s = summarize(entries, config)
    expect(s.spending).toBe(164900)
    expect(s.budgeted).toBe(0)
    expect(s.fromSavings).toBe(164900)
    expect(s.setAside).toBe(5000)
    expect(s.takenOut).toBe(150000)
  })
})
