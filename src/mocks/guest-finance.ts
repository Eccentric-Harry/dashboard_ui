// Guest-mode finance API: the in-memory mirror of FinanceController, SubscriptionController,
// SavingsGoalController and the spending summary. Same semantics as the backend (`util/MoneyFlow.java`): transfers
// move the balance but are never spending or income; a FLEX budget skips fixed costs.
// Pure over module state — `resolveGuestFinance` returns null for anything it doesn't own.

import { dummyFinanceLogs, dummySubscriptions } from './dummy-data';
import {
  budgetConfigOf,
  countsTowardBudget,
  DEFAULT_FIXED_CATEGORIES,
  flattenLogs,
  isFixedEntry,
  localToday,
  txKind,
} from '@/lib/finance-ledger';
import type {
  BudgetScope,
  DailyFinancialLog,
  FinancialTransaction,
  GoalShowcase,
  SavingsGoal,
  SavingsGoalRequest,
  ShowcaseUpdateRequest,
  SubscriptionDTO,
  TransactionDTO,
} from '@/types/finance';

interface Response {
  status: number;
  body: unknown;
}

const logs: DailyFinancialLog[] = dummyFinanceLogs;
let subscriptions: SubscriptionDTO[] = dummySubscriptions.map((s) => ({ ...s }));
const account: {
  balance: number;
  monthlyBudget: number;
  budgetScope: BudgetScope;
  fixedCategories: string[];
  takeHomeMonthly: number | null;
  payday: number | null;
} = {
  balance: 245080,
  monthlyBudget: 30000,
  budgetScope: 'FLEX',
  fixedCategories: [...DEFAULT_FIXED_CATEGORIES],
  takeHomeMonthly: 95000,
  payday: 1,
};

const ok = (data: unknown): Response => ({ status: 200, body: { data } });
const bad = (message: string): Response => ({ status: 400, body: { message } });

const accountDto = () => ({ ...account, fixedCategories: [...account.fixedCategories] });

/** + for money in, − for money out. */
const effect = (tx: Pick<FinancialTransaction, 'type' | 'direction' | 'amount'>, category: string): number => {
  const kind = txKind(tx, category);
  return kind === 'income' || kind === 'transfer-in' ? tx.amount : -tx.amount;
};

function recomputeTotals(log: DailyFinancialLog) {
  const totals = { totalExpense: 0, totalIncome: 0, totalTransferOut: 0, totalTransferIn: 0 };
  for (const [category, txs] of Object.entries(log.transactions)) {
    for (const tx of txs) {
      const kind = txKind(tx, category);
      if (kind === 'income') totals.totalIncome += tx.amount;
      else if (kind === 'transfer-out') totals.totalTransferOut += tx.amount;
      else if (kind === 'transfer-in') totals.totalTransferIn += tx.amount;
      else totals.totalExpense += tx.amount;
    }
    if (txs.length === 0) delete log.transactions[category];
  }
  log.dailyTotals = totals;
}

function logFor(day: string): DailyFinancialLog {
  let log = logs.find((l) => (l.dateString ?? l.date) === day);
  if (!log) {
    log = { id: `fl-${day}`, dateString: day, date: day, dailyTotals: { totalExpense: 0, totalIncome: 0 }, transactions: {} };
    logs.push(log);
  }
  return log;
}

function findTx(id: string): { log: DailyFinancialLog; category: string; index: number } | null {
  for (const log of logs) {
    for (const [category, txs] of Object.entries(log.transactions)) {
      const index = txs.findIndex((t) => t.id === id);
      if (index !== -1) return { log, category, index };
    }
  }
  return null;
}

interface TxBody {
  description: string;
  amount: number;
  category: string;
  type: 'Expense' | 'Income' | 'Transfer';
  direction?: 'OUT' | 'IN';
  subscriptionId?: string;
  goalId?: string;
  date: string;
}

function insert(body: TxBody, id: string, timestamp: string): TransactionDTO {
  const tx: FinancialTransaction = {
    id,
    description: body.description,
    amount: Number(body.amount),
    type: body.type,
    direction: body.type === 'Transfer' ? (body.direction === 'IN' ? 'IN' : 'OUT') : null,
    subscriptionId: body.subscriptionId ?? null,
    goalId: body.goalId || null,
    timestamp,
  };
  const log = logFor(body.date);
  (log.transactions[body.category] ??= []).push(tx);
  recomputeTotals(log);
  account.balance += effect(tx, body.category);
  return { ...tx, category: body.category, date: timestamp };
}

/** `day` at the local time-of-day of `source` (default now) — what the backend stamps. */
const stampFor = (day: string, source: Date = new Date()): string => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, source.getHours(), source.getMinutes()).toISOString();
};

/**
 * Gives a guest goal its first photo — the wishlist's "Save up for it" in guest mode, where the
 * showcase can't be fetched from the web. The photo is the wish's own image URL, never stored bytes.
 */
export function attachGuestGoalPhoto(goalId: string, url: string): void {
  const goal = goals.find((g) => g.id === goalId);
  if (!goal || goal.showcase?.photos.length) return;
  goal.showcase = {
    sourceUrl: null, sourceName: null, title: null, highlights: [], reasons: goal.showcase?.reasons ?? [], fetchedAt: null,
    photos: [{ url, width: null, height: null, tone: null }],
  };
}

export function resolveGuestFinance(url: URL, method: string, rawBody?: string): Response | null {
  const path = url.pathname;
  const body = () => JSON.parse(rawBody || '{}');

  if (path.endsWith('/api/v1/finance/daily-logs')) {
    const days = Number(url.searchParams.get('days'));
    if (!days) return ok(logs);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDay = cutoff.toISOString().slice(0, 10);
    return ok(logs.filter((l) => (l.dateString ?? l.date) >= cutoffDay));
  }

  const txMatch = path.match(/\/api\/v1\/finance\/transactions\/([^/]+)$/);
  if (txMatch) {
    const found = findTx(txMatch[1]);
    if (!found) return bad(`Transaction not found: ${txMatch[1]}`);
    const [old] = found.log.transactions[found.category].splice(found.index, 1);
    account.balance -= effect(old, found.category);
    recomputeTotals(found.log);
    if (method === 'DELETE') return ok(null);
    if (method === 'PUT') {
      const next = body() as TxBody;
      return ok(insert(
        {
          ...next,
          subscriptionId: next.subscriptionId ?? old.subscriptionId ?? undefined,
          // Omitted keeps the goal link; '' unlinks it (FinanceService.updateTransaction).
          goalId: next.goalId !== undefined ? next.goalId : old.goalId ?? undefined,
        },
        old.id,
        stampFor(next.date, new Date(old.timestamp)),
      ));
    }
  }

  if (path.endsWith('/api/v1/finance/transactions') && method === 'POST') {
    const next = body() as TxBody;
    return ok(insert(next, `ftx-guest-${Date.now()}`, stampFor(next.date || localToday())));
  }

  if (path.endsWith('/api/v1/finance/categories/reclassify') && method === 'POST') {
    const { category, targetCategory, type, direction } = body();
    const target = targetCategory || category;
    let updated = 0;
    let balanceDelta = 0;
    for (const log of logs) {
      const moving = log.transactions[category];
      if (!moving?.length) continue;
      delete log.transactions[category];
      for (const tx of moving) {
        const before = effect(tx, category);
        if (type) {
          tx.type = type;
          tx.direction = type === 'Transfer' ? (direction === 'IN' ? 'IN' : 'OUT') : null;
        }
        balanceDelta += effect(tx, target) - before;
        updated++;
      }
      (log.transactions[target] ??= []).push(...moving);
      recomputeTotals(log);
    }
    account.balance += balanceDelta;
    return ok({ updated, balanceDelta });
  }

  if (path.endsWith('/api/v1/finance/budget')) {
    if (method === 'PUT') {
      const next = body();
      if (typeof next.monthlyBudget === 'number') account.monthlyBudget = next.monthlyBudget;
      if (next.budgetScope) account.budgetScope = next.budgetScope === 'FLEX' ? 'FLEX' : 'ALL';
      if (Array.isArray(next.fixedCategories)) account.fixedCategories = next.fixedCategories;
    }
    return ok(accountDto());
  }

  if (path.endsWith('/api/v1/finance/account/income') && method === 'PUT') {
    const next = body();
    account.takeHomeMonthly = typeof next.takeHomeMonthly === 'number' ? next.takeHomeMonthly : null;
    account.payday = typeof next.payday === 'number' ? next.payday : null;
    return ok(accountDto());
  }

  const goals = resolveGuestGoals(path, method, body);
  if (goals) return goals;

  if (path.endsWith('/api/v1/finance/account/balance') || path.endsWith('/api/v1/finance/account')) {
    if (method === 'PUT') {
      const next = body();
      if (typeof next.balance === 'number') account.balance = next.balance;
    }
    return ok(accountDto());
  }

  const payMatch = path.match(/\/api\/v1\/subscriptions\/([^/]+)\/payments$/);
  if (payMatch && method === 'POST') {
    const sub = subscriptions.find((s) => s.id === payMatch[1]);
    if (!sub) return bad('Subscription not found');
    const next = body();
    const day = next.date || localToday();
    return ok(insert({
      description: sub.name,
      amount: next.amount ?? sub.cost,
      category: sub.category ?? 'Subscriptions',
      type: 'Expense',
      subscriptionId: sub.id,
      date: day,
    }, `ftx-guest-${Date.now()}`, stampFor(day)));
  }

  const subMatch = path.match(/\/api\/v1\/subscriptions\/([^/]+)$/);
  if (subMatch) {
    const index = subscriptions.findIndex((s) => s.id === subMatch[1]);
    if (index === -1) return bad('Subscription not found');
    if (method === 'DELETE') {
      subscriptions = subscriptions.filter((s) => s.id !== subMatch[1]);
      return ok(null);
    }
    if (method === 'PUT') {
      subscriptions[index] = toSubscription(subMatch[1], body());
      return ok(subscriptions[index]);
    }
  }

  if (path.endsWith('/api/v1/subscriptions')) {
    if (method === 'POST') {
      const created = toSubscription(`sub-guest-${Date.now()}`, body());
      subscriptions.push(created);
      return ok(created);
    }
    return ok(subscriptions);
  }

  if (path.endsWith('/api/v1/dashboard/spending-summary')) {
    const month = url.searchParams.get('month') || localToday().slice(0, 7);
    const config = budgetConfigOf(account);
    const entries = flattenLogs(logs).filter((e) => e.day.startsWith(month));
    const spending = entries.filter((e) => e.kind === 'spending');
    const sumOf = (rows: typeof entries) => rows.reduce((s, e) => s + e.amount, 0);
    const totalSpent = sumOf(spending);
    const budgetedSpent = sumOf(spending.filter((e) => countsTowardBudget(e, config)));
    const categoryBreakdown: Record<string, number> = {};
    for (const e of spending) categoryBreakdown[e.category] = (categoryBreakdown[e.category] ?? 0) + e.amount;
    return ok({
      month,
      totalSpent,
      budgetedSpent,
      fixedSpent: sumOf(spending.filter((e) => isFixedEntry(e, config))),
      transferredOut: sumOf(entries.filter((e) => e.kind === 'transfer-out')),
      budgetScope: account.budgetScope,
      fixedCategories: account.fixedCategories,
      monthlyBudget: account.monthlyBudget,
      budgetRemaining: account.monthlyBudget - budgetedSpent,
      budgetUtilization: (budgetedSpent / account.monthlyBudget) * 100,
      categoryBreakdown,
    });
  }

  return null;
}

function toSubscription(id: string, next: Partial<SubscriptionDTO>): SubscriptionDTO {
  const unit = next.intervalUnit ?? 'MONTH';
  const count = Math.max(1, next.intervalCount ?? 1);
  const cost = Number(next.cost) || 0;
  const days = { DAY: count, WEEK: 7 * count, MONTH: 30.4375 * count, YEAR: 365.25 * count }[unit];
  return {
    id,
    name: String(next.name ?? '').trim(),
    cost,
    billingDate: next.billingDate || null,
    category: next.category || 'Subscriptions',
    intervalUnit: unit,
    intervalCount: count,
    monthlyCost: Math.round(((cost * 30.4375) / days) * 100) / 100,
  };
}

// ── Savings goals (SavingsGoalService mirror) ────────────────────────────────
// Only the plan is stored; a goal's money is derived from ledger rows carrying its id.

type GuestGoal = Omit<SavingsGoal, 'saved' | 'setAside' | 'takenOut' | 'spent' | 'contributions' | 'firstContributionDate' | 'lastContributionDate'>;

const isoShift = (months: number, day = 1): string => {
  const t = new Date();
  const d = new Date(t.getFullYear(), t.getMonth() + months, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** "To Safety net · September leftover" — the same ledger line SavingsGoalService.describe writes. */
const describe = (direction: 'OUT' | 'IN', goal: Pick<GuestGoal, 'name'>, note?: string | null): string =>
  `${direction === 'IN' ? 'From' : 'To'} ${goal.name}${note?.trim() ? ` · ${note.trim()}` : ''}`;

const baseGoal = (over: Partial<GuestGoal> & Pick<GuestGoal, 'id' | 'name' | 'kind'>): GuestGoal => ({
  icon: null,
  color: null,
  targetAmount: null,
  listPrice: null,
  exchangeValue: null,
  cardOffer: null,
  targetDate: null,
  plannedMonthly: null,
  keptAt: null,
  startDate: localToday(),
  priority: 0,
  status: 'ACTIVE',
  boughtOn: null,
  boughtFor: null,
  showcase: null,
  ...over,
});

// The iPhone's photos are built into the app (features/finance/goal-presets.ts), so the
// guest goal only carries reasons — the server-side part of a showcase.
const reasonsOnly = (reasons: string[]): GoalShowcase => ({
  sourceUrl: null,
  sourceName: null,
  title: null,
  highlights: [],
  photos: [],
  reasons,
  fetchedAt: null,
});

let goals: GuestGoal[] = [
  baseGoal({
    id: 'goal-guest-safety', name: 'Safety net', kind: 'SAFETY_NET', icon: 'shield', color: 'sage',
    targetAmount: 150000, plannedMonthly: 6000, keptAt: 'Liquid fund', startDate: isoShift(-4), priority: 0,
  }),
  baseGoal({
    id: 'goal-guest-phone', name: 'iPhone 18 Pro', kind: 'PURCHASE', icon: 'phone', color: 'sky',
    listPrice: 164900, exchangeValue: 30000, cardOffer: 5000, targetAmount: 129900,
    targetDate: isoShift(5), keptAt: 'SBI RD', startDate: isoShift(-2), priority: 1,
    showcase: reasonsOnly(['Shoot the December trip properly — in the dark too', 'My phone is on its last legs']),
  }),
  baseGoal({
    id: 'goal-guest-goa', name: 'Goa in December', kind: 'TRIP', icon: 'beach', color: 'sand',
    targetAmount: 24000, targetDate: isoShift(3, 15), keptAt: 'Savings account', startDate: isoShift(-1), priority: 2,
  }),
];

// Seed the set-asides into the ledger, on past paydays, the way the real API writes them.
const SEED: [string, number, number][] = [
  ['goal-guest-safety', -4, 6000], ['goal-guest-safety', -3, 6000], ['goal-guest-safety', -2, 6000], ['goal-guest-safety', -1, 6000],
  ['goal-guest-phone', -2, 18000], ['goal-guest-phone', -1, 18000],
  ['goal-guest-goa', -1, 6000],
];
for (const [goalId, months, amount] of SEED) {
  const goal = goals.find((g) => g.id === goalId)!;
  const day = isoShift(months);
  insert(
    { description: describe('OUT', goal, null), amount, category: 'Savings', type: 'Transfer', direction: 'OUT', goalId, date: day },
    `ftx-guest-seed-${goalId}-${months}`,
    stampFor(day),
  );
}

function tally(goalId: string) {
  let setAside = 0;
  let takenOut = 0;
  let spent = 0;
  let contributions = 0;
  let first: string | null = null;
  let last: string | null = null;
  for (const e of flattenLogs(logs)) {
    if (e.goalId !== goalId) continue;
    if (e.kind === 'transfer-out') {
      setAside += e.amount;
      contributions++;
      if (!first || e.day < first) first = e.day;
      if (!last || e.day > last) last = e.day;
    } else if (e.kind === 'transfer-in') takenOut += e.amount;
    else if (e.kind === 'spending') spent += e.amount;
  }
  return {
    saved: Math.max(0, setAside - takenOut),
    setAside,
    takenOut,
    spent,
    contributions,
    firstContributionDate: first,
    lastContributionDate: last,
  };
}

const goalDto = (g: GuestGoal): SavingsGoal => ({ ...g, ...tally(g.id) });

function applyGoal(goal: GuestGoal, next: SavingsGoalRequest): GuestGoal | string {
  const kind = next.kind ?? 'PURCHASE';
  let target = next.targetAmount ?? null;
  if (target == null && next.listPrice) target = next.listPrice - (next.exchangeValue ?? 0) - (next.cardOffer ?? 0);
  if (target != null && target <= 0) return 'The exchange and offer cover the whole price — nothing to save';
  if (target == null && kind !== 'OPEN') return 'Set how much this goal needs';
  return {
    ...goal,
    name: next.name.trim(),
    kind,
    icon: next.icon ?? null,
    color: next.color ?? null,
    targetAmount: target,
    listPrice: next.listPrice ?? null,
    exchangeValue: next.exchangeValue ?? null,
    cardOffer: next.cardOffer ?? null,
    targetDate: next.targetDate || null,
    plannedMonthly: next.plannedMonthly ?? null,
    keptAt: next.keptAt?.trim() || null,
    startDate: next.startDate ?? goal.startDate,
    priority: next.priority ?? goal.priority,
  };
}

const goalTransfer = (goal: GuestGoal, direction: 'OUT' | 'IN', amount: number, date: string, description: string) =>
  insert(
    { description, amount, category: 'Savings', type: 'Transfer', direction, goalId: goal.id, date },
    `ftx-guest-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    stampFor(date),
  );

function resolveGuestGoals(path: string, method: string, body: () => Record<string, unknown>): Response | null {
  if (!path.includes('/api/v1/savings-goals')) return null;

  const action = path.match(/\/api\/v1\/savings-goals\/([^/]+)\/(set-aside|take-out|buy|archive)$/);
  if (action && method === 'POST') {
    const goal = goals.find((g) => g.id === action[1]);
    if (!goal) return bad('Savings goal not found');
    const next = body() as { amount?: number; price?: number; date?: string; note?: string; category?: string; description?: string; release?: boolean };
    const date = next.date || localToday();
    const held = tally(goal.id).saved;
    if (action[2] === 'set-aside') {
      if (goal.status === 'BOUGHT' || goal.status === 'ARCHIVED') return bad(`Can't set money aside for ${goal.name}`);
      goalTransfer(goal, 'OUT', Number(next.amount), date, describe('OUT', goal, next.note));
    } else if (action[2] === 'take-out') {
      if (Number(next.amount) > held) return bad(`Only ${held} is set aside for ${goal.name}`);
      goalTransfer(goal, 'IN', Number(next.amount), date, describe('IN', goal, next.note));
    } else if (action[2] === 'buy') {
      const price = Number(next.price);
      const fromGoal = Math.min(held, price);
      if (fromGoal > 0) goalTransfer(goal, 'IN', fromGoal, date, describe('IN', goal, 'paid for it'));
      insert(
        { description: next.description || goal.name, amount: price, category: next.category || 'Shopping', type: 'Expense', goalId: goal.id, date },
        `ftx-guest-${Date.now()}-buy`,
        stampFor(date),
      );
      goal.status = 'BOUGHT';
      goal.boughtOn = date;
      goal.boughtFor = price;
    } else {
      if (next.release && held > 0) goalTransfer(goal, 'IN', held, localToday(), describe('IN', goal, 'goal archived'));
      goal.status = 'ARCHIVED';
    }
    return ok(goalDto(goal));
  }

  const showcase = path.match(/\/api\/v1\/savings-goals\/([^/]+)\/showcase(\/find)?$/);
  if (showcase) {
    const goal = goals.find((g) => g.id === showcase[1]);
    if (!goal) return bad('Savings goal not found');
    if (showcase[2] && method === 'POST') {
      return bad("Guest mode can't reach the web — sign in to pull photos from a link");
    }
    if (!showcase[2] && method === 'PUT') {
      const next = body() as ShowcaseUpdateRequest;
      const current: GoalShowcase = goal.showcase ?? {
        sourceUrl: null, sourceName: null, title: null, highlights: [], photos: [], reasons: [], fetchedAt: null,
      };
      const photos = next.photos
        ? next.photos.map((u) => current.photos.find((p) => p.url === u)).filter((p) => p != null)
        : current.photos;
      const highlights = next.highlights ? next.highlights.filter((h) => current.highlights.includes(h)) : current.highlights;
      const reasons = next.reasons
        ? [...new Set(next.reasons.map((r) => r.trim().replace(/\s+/g, ' ')).filter(Boolean))]
        : current.reasons;
      goal.showcase = photos.length || highlights.length || reasons.length ? { ...current, photos, highlights, reasons } : null;
      return ok(goalDto(goal));
    }
  }

  const one = path.match(/\/api\/v1\/savings-goals\/([^/]+)$/);
  if (one && method === 'PUT') {
    const index = goals.findIndex((g) => g.id === one[1]);
    if (index === -1) return bad('Savings goal not found');
    const next = body() as unknown as SavingsGoalRequest;
    const applied = applyGoal(goals[index], next);
    if (typeof applied === 'string') return bad(applied);
    if (next.status) {
      if (next.status === 'ACTIVE' && applied.status === 'BOUGHT') {
        applied.boughtOn = null;
        applied.boughtFor = null;
      }
      applied.status = next.status;
    }
    goals[index] = applied;
    return ok(goalDto(applied));
  }

  if (path.endsWith('/api/v1/savings-goals')) {
    if (method === 'POST') {
      const next = body() as unknown as SavingsGoalRequest;
      const live = goals.filter((g) => g.status !== 'ARCHIVED').length;
      if (live >= 12) return bad('You already have 12 goals — archive one before adding another');
      const created = applyGoal(
        baseGoal({ id: `goal-guest-${Date.now()}`, name: '', kind: 'PURCHASE', priority: Math.max(-1, ...goals.map((g) => g.priority)) + 1 }),
        next,
      );
      if (typeof created === 'string') return bad(created);
      goals = [...goals, created];
      return ok(goalDto(created));
    }
    return ok(goals.map(goalDto));
  }
  return null;
}
