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
  /** Set when this row moves money into / out of a savings goal, or is a purchase made from one. */
  goalId?: string | null;
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
  /** Declared monthly take-home pay — what savings goals plan against. Null when not set. */
  takeHomeMonthly?: number | null;
  /** Day of the month pay lands (1–31). Null when not set. */
  payday?: number | null;
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
  /** Omitted on edit keeps the existing goal link. */
  goalId?: string;
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
  goalId?: string | null;
  date: string;
}

export type LendingRequest = Omit<LendingRecord, 'id'>;

// ── Savings goals ("Saving for" on /finance; distinct from /goals habits) ──

/** Something to buy, a trip or event, a safety net, or open-ended saving with no target. */
export type SavingsGoalKind = 'PURCHASE' | 'TRIP' | 'SAFETY_NET' | 'OPEN';
/** "Ready" (saved ≥ target) is derived, never stored. ARCHIVED is the soft-delete. */
export type SavingsGoalStatus = 'ACTIVE' | 'PAUSED' | 'BOUGHT' | 'ARCHIVED';

/**
 * A savings goal: the stored plan plus its money, which the server derives from ledger
 * rows carrying the goal's id (Transfer OUT = set aside, IN = taken out, Expense = bought).
 */
export interface SavingsGoal {
  id: string;
  name: string;
  kind: SavingsGoalKind;
  /** Icon key — see features/finance/goal-icons.ts (Lucide, like the category icons). */
  icon: string | null;
  /** Palette key — see GOAL_COLORS in lib/finance-goals.ts. */
  color: string | null;
  /** Null for OPEN goals. */
  targetAmount: number | null;
  listPrice: number | null;
  exchangeValue: number | null;
  cardOffer: number | null;
  /** 'YYYY-MM-DD', or null when the plan runs on plannedMonthly. */
  targetDate: string | null;
  plannedMonthly: number | null;
  /** Where the money sits ("SBI savings", "HDFC RD"). */
  keptAt: string | null;
  startDate: string | null;
  priority: number;
  status: SavingsGoalStatus;
  boughtOn: string | null;
  boughtFor: number | null;
  /** Photos, highlights and the user's reasons — what it looks like. Null until found or added. */
  showcase: GoalShowcase | null;
  /** Still set aside (set aside − taken out). */
  saved: number;
  setAside: number;
  takenOut: number;
  spent: number;
  contributions: number;
  firstContributionDate: string | null;
  lastContributionDate: string | null;
}

/** One showcase photo, hotlinked from where it was found; size and edge tone measured server-side. */
export interface GoalPhoto {
  url: string;
  width: number | null;
  height: number | null;
  /** The colour of the photo's edges — sets the backdrop when it's shown whole. */
  tone: 'DARK' | 'LIGHT' | null;
}

/** What a savings goal looks like (GoalShowcase.java). Never touched by the plan's PUT. */
export interface GoalShowcase {
  /** The product page the photos came from; null when every photo was added by link. */
  sourceUrl: string | null;
  /** "apple.com" */
  sourceName: string | null;
  title: string | null;
  /** Short lines from the page's description. */
  highlights: string[];
  /** In display order; the first is the cover. */
  photos: GoalPhoto[];
  /** The user's own words for why they want it. */
  reasons: string[];
  fetchedAt: string | null;
}

/** Curate the showcase; an omitted list stays as it is. Photos and highlights can only be reordered or removed. */
export interface ShowcaseUpdateRequest {
  photos?: string[];
  highlights?: string[];
  reasons?: string[];
}

export interface SavingsGoalRequest {
  name: string;
  kind?: SavingsGoalKind;
  icon?: string | null;
  color?: string | null;
  /** Optional when listPrice is given (target = list − exchange − card offer) or for OPEN. */
  targetAmount?: number | null;
  listPrice?: number | null;
  exchangeValue?: number | null;
  cardOffer?: number | null;
  targetDate?: string | null;
  plannedMonthly?: number | null;
  keptAt?: string | null;
  startDate?: string;
  priority?: number;
  /** Update only: ACTIVE also reopens a bought or archived goal. */
  status?: 'ACTIVE' | 'PAUSED';
}

/** Set aside / take out. */
export interface GoalMoneyRequest {
  amount: number;
  /** Defaults to today. */
  date?: string;
  /** For a take-out, the reason. */
  note?: string;
}

export interface GoalPurchaseRequest {
  price: number;
  /** Defaults to Shopping. */
  category?: string;
  description?: string;
  date?: string;
}

export interface IncomePlanRequest {
  takeHomeMonthly: number | null;
  payday: number | null;
}
