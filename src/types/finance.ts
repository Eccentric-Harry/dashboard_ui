// Finance domain types — single source of truth.

/**
 * What a transaction counts toward (backend `MoneyFlow`):
 * - Expense  — your own spending; counts toward the budget and the breakdown.
 * - Income   — money earned / received to spend.
 * - Transfer — money that moves but isn't consumption (sent home, lent, saved,
 *              a loan paid back). Moves the balance; excluded from spending and income.
 */
export type TransactionType = 'Expense' | 'Income' | 'Transfer';
export type TransferDirection = 'OUT' | 'IN';
/** Budget coverage: every spending row, or flexible spending only (fixed costs planned separately). */
export type BudgetScope = 'ALL' | 'FLEX';

export interface FinancialTotals {
  totalExpense: number;
  totalIncome: number;
  /** Absent on days written before transfers existed. */
  totalTransferOut?: number;
  totalTransferIn?: number;
}

export interface FinancialTransaction {
  id: string;
  description: string;
  amount: number;
  /** Null/absent on legacy rows — those are spending. */
  type: TransactionType | string | null;
  /** Transfers only. */
  direction?: TransferDirection | null;
  /** Set when this row is a payment against a recurring bill. */
  subscriptionId?: string | null;
  timestamp: string;
}

export interface DailyFinancialLog {
  id: string;
  /** The day this log holds, 'YYYY-MM-DD' (local). Prefer over `date` for bucketing. */
  dateString?: string;
  /** Instant of the day's first transaction — NOT reliable for day/month bucketing. */
  date: string;
  dailyTotals: FinancialTotals;
  transactions: Record<string, FinancialTransaction[]>;
}

export interface FinanceAccount {
  balance: number;
  monthlyBudget: number;
  budgetScope?: BudgetScope;
  fixedCategories?: string[];
}

export interface RepaymentInstallment {
  id: string;
  dueDate: string;
  amount: string;
  status: string;
}

export type BillingUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

/** A recurring bill or subscription. Payments are ledger rows carrying its id. */
export interface SubscriptionDTO {
  id: string;
  name: string;
  cost: number;
  /** Anchor due date, 'YYYY-MM-DD'; null when never set. */
  billingDate: string | null;
  category?: string;
  intervalUnit?: BillingUnit;
  intervalCount?: number;
  /** Cost normalised to one month. */
  monthlyCost?: number;
}

export interface LendingRecord {
  id: string;
  borrower: string;
  amount: number;
  date: string;
  dueDate?: string;
  status: 'Pending' | 'Repaid';
  notes?: string;
}

/** Shape of GET /dashboard/spending-summary (DashboardService.getSpendingSummary). */
export interface SpendingSummary {
  month: string;
  /** All spending (transfers excluded). */
  totalSpent: number;
  /** Spending measured against the budget — equals totalSpent under an ALL budget. */
  budgetedSpent?: number;
  fixedSpent?: number;
  transferredOut?: number;
  budgetScope?: BudgetScope;
  fixedCategories?: string[];
  monthlyBudget: number;
  budgetRemaining: number;
  budgetUtilization: number;
  categoryBreakdown: Record<string, number>;
}

// ── Request DTOs ──
export interface TransactionRequest {
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  /** Transfers only; defaults to OUT. */
  direction?: TransferDirection;
  /** Omitted on edit keeps the existing bill link. */
  subscriptionId?: string;
  date: string;
}

export interface SubscriptionRequest {
  name: string;
  cost: number;
  billingDate?: string;
  category?: string;
  intervalUnit?: BillingUnit;
  intervalCount?: number;
}

export interface SubscriptionPaymentRequest {
  /** Defaults to today. */
  date?: string;
  /** Defaults to the bill's cost. */
  amount?: number;
}

export interface BudgetUpdateRequest {
  monthlyBudget: number;
  budgetScope?: BudgetScope;
  fixedCategories?: string[];
}

/** Bulk move one category: merge into another and/or retype (e.g. "To Home" → Transfer "Family"). */
export interface CategoryReclassifyRequest {
  category: string;
  targetCategory?: string;
  type?: TransactionType;
  direction?: TransferDirection;
}

export interface ReclassifyResult {
  updated: number;
  balanceDelta: number;
}

/** Shape the transaction endpoints return. */
export interface TransactionDTO {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: TransactionType | string | null;
  direction?: TransferDirection | null;
  subscriptionId?: string | null;
  date: string;
}

export type LendingRequest = Omit<LendingRecord, 'id'>;
