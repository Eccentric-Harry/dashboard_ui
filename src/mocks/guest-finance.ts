// Guest-mode finance API: the in-memory mirror of FinanceController, SubscriptionController
// and the spending summary. Same semantics as the backend (`util/MoneyFlow.java`): transfers
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
  SubscriptionDTO,
  TransactionDTO,
} from '@/types/finance';

interface Response {
  status: number;
  body: unknown;
}

const logs: DailyFinancialLog[] = dummyFinanceLogs;
let subscriptions: SubscriptionDTO[] = dummySubscriptions.map((s) => ({ ...s }));
const account: { balance: number; monthlyBudget: number; budgetScope: BudgetScope; fixedCategories: string[] } = {
  balance: 245080,
  monthlyBudget: 30000,
  budgetScope: 'FLEX',
  fixedCategories: [...DEFAULT_FIXED_CATEGORIES],
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
        { ...next, subscriptionId: next.subscriptionId ?? old.subscriptionId ?? undefined },
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
