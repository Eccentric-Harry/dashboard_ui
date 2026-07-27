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
  TransactionRequest,
  SubscriptionRequest,
  LendingRequest,
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
  getSpendingSummary(month?: string): Promise<SafeResult<unknown>>;
  // Mutations
  updateBalance(balance: number): Promise<SafeResult<FinanceAccount>>;
  updateBudget(monthlyBudget: number): Promise<SafeResult<FinanceAccount>>;
  addTransaction(dto: TransactionRequest): Promise<SafeResult<unknown>>;
  updateTransaction(id: string, dto: TransactionRequest): Promise<SafeResult<unknown>>;
  deleteTransaction(id: string): Promise<SafeResult<void>>;
  addSubscription(dto: SubscriptionRequest): Promise<SafeResult<SubscriptionDTO>>;
  deleteSubscription(id: string): Promise<SafeResult<void>>;
  addLending(dto: LendingRequest): Promise<SafeResult<LendingRecord>>;
  updateLending(id: string, dto: LendingRequest): Promise<SafeResult<LendingRecord>>;
  toggleLending(id: string): Promise<SafeResult<LendingRecord>>;
  deleteLending(id: string): Promise<SafeResult<void>>;
}

export const financeService: FinanceServiceInterface = {
  getDailyLogs: (days = 365) =>
    instance.safeCall<DailyFinancialLog[]>(E.API_GET_FINANCE_DAILY_LOGS, { query: { days } }),
  getAccount: () => instance.safeCall<FinanceAccount>(E.API_GET_FINANCE_ACCOUNT),
  getBudget: () => instance.safeCall<FinanceAccount>(E.API_GET_FINANCE_BUDGET),
  getSliceRepayments: () => instance.safeCall<RepaymentInstallment[]>(E.API_GET_SLICE_REPAYMENTS),
  getSubscriptions: () => instance.safeCall<SubscriptionDTO[]>(E.API_GET_SUBSCRIPTIONS),
  getLending: () => instance.safeCall<LendingRecord[]>(E.API_GET_LENDING),
  getSpendingSummary: (month) => instance.safeCall(E.API_GET_SPENDING_SUMMARY, { query: { month } }),

  updateBalance: (balance) =>
    instance.safeCall<FinanceAccount>(E.API_UPDATE_FINANCE_BALANCE, { body: { balance } }),
  updateBudget: (monthlyBudget) =>
    instance.safeCall<FinanceAccount>(E.API_UPDATE_FINANCE_BUDGET, { body: { monthlyBudget } }),
  addTransaction: (dto) => instance.safeCall(E.API_ADD_TRANSACTION, { body: dto }),
  updateTransaction: (id, dto) =>
    instance.safeCall(E.API_UPDATE_TRANSACTION, { params: { id }, body: dto }),
  deleteTransaction: (id) => instance.safeCall<void>(E.API_DELETE_TRANSACTION, { params: { id } }),
  addSubscription: (dto) => instance.safeCall<SubscriptionDTO>(E.API_ADD_SUBSCRIPTION, { body: dto }),
  deleteSubscription: (id) => instance.safeCall<void>(E.API_DELETE_SUBSCRIPTION, { params: { id } }),
  addLending: (dto) => instance.safeCall<LendingRecord>(E.API_ADD_LENDING, { body: dto }),
  updateLending: (id, dto) =>
    instance.safeCall<LendingRecord>(E.API_UPDATE_LENDING, { params: { id }, body: dto }),
  toggleLending: (id) => instance.safeCall<LendingRecord>(E.API_TOGGLE_LENDING, { params: { id } }),
  deleteLending: (id) => instance.safeCall<void>(E.API_DELETE_LENDING, { params: { id } }),
};
