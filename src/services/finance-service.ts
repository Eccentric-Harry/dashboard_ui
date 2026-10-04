// Strictly-typed Finance service. Every method is a one-liner over
// instance.safeCall<T>() — no fetch, no try/catch, no envelope handling leaks out.

import { instance } from './http/api-request';
import type { SafeResult } from '../types/api';
import type {
  DailyFinancialLog,
  FinanceAccount,
  RepaymentInstallment,
  SubscriptionDTO,
  LendingRecord,
  SpendingSummary,
  TransactionRequest,
  TransactionDTO,
  SubscriptionRequest,
  SubscriptionPaymentRequest,
  LendingRequest,
  BudgetUpdateRequest,
  CategoryReclassifyRequest,
  ReclassifyResult,
  SavingsGoal,
  SavingsGoalRequest,
  GoalMoneyRequest,
  GoalPurchaseRequest,
  IncomePlanRequest,
  ShowcaseUpdateRequest,
} from '../types/finance';
import * as E from './endpoints/finance-endpoints';

export interface FinanceServiceInterface {
  // Reads
  getDailyLogs(days?: number): Promise<SafeResult<DailyFinancialLog[]>>;
  getAccount(): Promise<SafeResult<FinanceAccount>>;
  getBudget(): Promise<SafeResult<FinanceAccount>>;
  getSliceRepayments(): Promise<SafeResult<RepaymentInstallment[]>>;
  getSubscriptions(): Promise<SafeResult<SubscriptionDTO[]>>;
  getLending(): Promise<SafeResult<LendingRecord[]>>;
  getSpendingSummary(month?: string): Promise<SafeResult<SpendingSummary>>;
  // Mutations
  updateBalance(balance: number): Promise<SafeResult<FinanceAccount>>;
  updateBudget(dto: BudgetUpdateRequest): Promise<SafeResult<FinanceAccount>>;
  addTransaction(dto: TransactionRequest): Promise<SafeResult<TransactionDTO>>;
  updateTransaction(id: string, dto: TransactionRequest): Promise<SafeResult<TransactionDTO>>;
  deleteTransaction(id: string): Promise<SafeResult<void>>;
  reclassifyCategory(dto: CategoryReclassifyRequest): Promise<SafeResult<ReclassifyResult>>;
  addSubscription(dto: SubscriptionRequest): Promise<SafeResult<SubscriptionDTO>>;
  updateSubscription(id: string, dto: SubscriptionRequest): Promise<SafeResult<SubscriptionDTO>>;
  deleteSubscription(id: string): Promise<SafeResult<void>>;
  paySubscription(id: string, dto?: SubscriptionPaymentRequest): Promise<SafeResult<TransactionDTO>>;
  addLending(dto: LendingRequest): Promise<SafeResult<LendingRecord>>;
  updateLending(id: string, dto: LendingRequest): Promise<SafeResult<LendingRecord>>;
  toggleLending(id: string): Promise<SafeResult<LendingRecord>>;
  deleteLending(id: string): Promise<SafeResult<void>>;
  // Savings goals
  updateIncomePlan(dto: IncomePlanRequest): Promise<SafeResult<FinanceAccount>>;
  getSavingsGoals(includeArchived?: boolean): Promise<SafeResult<SavingsGoal[]>>;
  addSavingsGoal(dto: SavingsGoalRequest): Promise<SafeResult<SavingsGoal>>;
  updateSavingsGoal(id: string, dto: SavingsGoalRequest): Promise<SafeResult<SavingsGoal>>;
  setAsideForGoal(id: string, dto: GoalMoneyRequest): Promise<SafeResult<SavingsGoal>>;
  takeOutOfGoal(id: string, dto: GoalMoneyRequest): Promise<SafeResult<SavingsGoal>>;
  buyGoal(id: string, dto: GoalPurchaseRequest): Promise<SafeResult<SavingsGoal>>;
  archiveGoal(id: string, release: boolean): Promise<SafeResult<SavingsGoal>>;
  /** A page link brings its photos + highlights, an image link adds one photo, no link searches by name. Slow (seconds). */
  findGoalShowcase(id: string, url?: string): Promise<SafeResult<SavingsGoal>>;
  updateGoalShowcase(id: string, dto: ShowcaseUpdateRequest): Promise<SafeResult<SavingsGoal>>;
}

export const financeService: FinanceServiceInterface = {
  getDailyLogs: (days = 365) =>
    instance.safeCall<DailyFinancialLog[]>(E.API_GET_FINANCE_DAILY_LOGS, { query: { days } }),
  getAccount: () => instance.safeCall<FinanceAccount>(E.API_GET_FINANCE_ACCOUNT),
  getBudget: () => instance.safeCall<FinanceAccount>(E.API_GET_FINANCE_BUDGET),
  getSliceRepayments: () => instance.safeCall<RepaymentInstallment[]>(E.API_GET_SLICE_REPAYMENTS),
  getSubscriptions: () => instance.safeCall<SubscriptionDTO[]>(E.API_GET_SUBSCRIPTIONS),
  getLending: () => instance.safeCall<LendingRecord[]>(E.API_GET_LENDING),
  getSpendingSummary: (month) =>
    instance.safeCall<SpendingSummary>(E.API_GET_SPENDING_SUMMARY, { query: { month } }),

  updateBalance: (balance) =>
    instance.safeCall<FinanceAccount>(E.API_UPDATE_FINANCE_BALANCE, { body: { balance } }),
  updateBudget: (dto) => instance.safeCall<FinanceAccount>(E.API_UPDATE_FINANCE_BUDGET, { body: dto }),
  addTransaction: (dto) => instance.safeCall<TransactionDTO>(E.API_ADD_TRANSACTION, { body: dto }),
  updateTransaction: (id, dto) =>
    instance.safeCall<TransactionDTO>(E.API_UPDATE_TRANSACTION, { params: { id }, body: dto }),
  deleteTransaction: (id) => instance.safeCall<void>(E.API_DELETE_TRANSACTION, { params: { id } }),
  reclassifyCategory: (dto) => instance.safeCall<ReclassifyResult>(E.API_RECLASSIFY_CATEGORY, { body: dto }),
  addSubscription: (dto) => instance.safeCall<SubscriptionDTO>(E.API_ADD_SUBSCRIPTION, { body: dto }),
  updateSubscription: (id, dto) =>
    instance.safeCall<SubscriptionDTO>(E.API_UPDATE_SUBSCRIPTION, { params: { id }, body: dto }),
  deleteSubscription: (id) => instance.safeCall<void>(E.API_DELETE_SUBSCRIPTION, { params: { id } }),
  paySubscription: (id, dto = {}) =>
    instance.safeCall<TransactionDTO>(E.API_PAY_SUBSCRIPTION, { params: { id }, body: dto }),
  addLending: (dto) => instance.safeCall<LendingRecord>(E.API_ADD_LENDING, { body: dto }),
  updateLending: (id, dto) =>
    instance.safeCall<LendingRecord>(E.API_UPDATE_LENDING, { params: { id }, body: dto }),
  toggleLending: (id) => instance.safeCall<LendingRecord>(E.API_TOGGLE_LENDING, { params: { id } }),
  deleteLending: (id) => instance.safeCall<void>(E.API_DELETE_LENDING, { params: { id } }),

  updateIncomePlan: (dto) => instance.safeCall<FinanceAccount>(E.API_UPDATE_INCOME_PLAN, { body: dto }),
  getSavingsGoals: (includeArchived = false) =>
    instance.safeCall<SavingsGoal[]>(E.API_GET_SAVINGS_GOALS, { query: { includeArchived } }),
  addSavingsGoal: (dto) => instance.safeCall<SavingsGoal>(E.API_ADD_SAVINGS_GOAL, { body: dto }),
  updateSavingsGoal: (id, dto) =>
    instance.safeCall<SavingsGoal>(E.API_UPDATE_SAVINGS_GOAL, { params: { id }, body: dto }),
  setAsideForGoal: (id, dto) =>
    instance.safeCall<SavingsGoal>(E.API_SET_ASIDE_FOR_GOAL, { params: { id }, body: dto }),
  takeOutOfGoal: (id, dto) => instance.safeCall<SavingsGoal>(E.API_TAKE_OUT_OF_GOAL, { params: { id }, body: dto }),
  buyGoal: (id, dto) => instance.safeCall<SavingsGoal>(E.API_BUY_GOAL, { params: { id }, body: dto }),
  archiveGoal: (id, release) =>
    instance.safeCall<SavingsGoal>(E.API_ARCHIVE_GOAL, { params: { id }, body: { release } }),
  // A web search plus a page and ~16 photos measured server-side: allow it time.
  findGoalShowcase: (id, url) =>
    instance.safeCall<SavingsGoal>(E.API_FIND_GOAL_SHOWCASE, { params: { id }, body: url ? { url } : {}, timeoutMs: 90_000 }),
  updateGoalShowcase: (id, dto) =>
    instance.safeCall<SavingsGoal>(E.API_UPDATE_GOAL_SHOWCASE, { params: { id }, body: dto }),
};
