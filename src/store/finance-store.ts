// Finance store — the frozen reference for every other domain store.
// Server state lives here as RemoteDataStatus slices; actions delegate the async
// lifecycle to requestAndSet. Pure state edits (optimistic balance/budget) use
// plain immer set. Ephemeral UI state (modals, filters) stays in the component.

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  requestAndSet,
  createSelectors,
  remoteStateWith,
  emptyRemoteStateWithArray,
  type RemoteDataStatus,
} from './zustand-utils';
import { financeService } from '../services/finance-service';
import type {
  DailyFinancialLog,
  FinanceAccount,
  LendingRecord,
  RepaymentInstallment,
  SubscriptionDTO,
} from '../types/finance';

interface FinanceState {
  dailyLogs: RemoteDataStatus<DailyFinancialLog[]>;
  account: RemoteDataStatus<FinanceAccount | null>;
  budget: RemoteDataStatus<FinanceAccount | null>;
  subscriptions: RemoteDataStatus<SubscriptionDTO[]>;
  lending: RemoteDataStatus<LendingRecord[]>;
  repayments: RemoteDataStatus<RepaymentInstallment[]>;
}

interface FinanceActions {
  actions: {
    loadDailyLogs: (days?: number) => Promise<void>;
    loadAccount: () => Promise<void>;
    loadBudget: () => Promise<void>;
    /** Refresh the ledger + balance/budget slices (the "a transaction changed" refresh). */
    loadAll: (days?: number) => Promise<void>;
    loadSubscriptions: () => Promise<void>;
    loadLending: () => Promise<void>;
    loadRepayments: () => Promise<void>;
    /** Refresh subscriptions, lending and repayments together. */
    loadCommitments: () => Promise<void>;
    /** Optimistic local updates after a successful edit-modal save. */
    applyBalance: (balance: number) => void;
    applyBudget: (monthlyBudget: number) => void;
  };
}

type FinanceStore = FinanceState & FinanceActions;

const initialState: FinanceState = {
  dailyLogs: emptyRemoteStateWithArray<DailyFinancialLog>(),
  account: remoteStateWith<FinanceAccount | null>(null),
  budget: remoteStateWith<FinanceAccount | null>(null),
  subscriptions: emptyRemoteStateWithArray<SubscriptionDTO>(),
  lending: emptyRemoteStateWithArray<LendingRecord>(),
  repayments: emptyRemoteStateWithArray<RepaymentInstallment>(),
};

const useFinanceStoreBase = create<FinanceStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      actions: {
        loadDailyLogs: async (days) => {
          await requestAndSet<FinanceStore, 'dailyLogs'>(
            'dailyLogs',
            () => financeService.getDailyLogs(days),
            set,
          );
        },
        loadAccount: async () => {
          await requestAndSet<FinanceStore, 'account'>('account', financeService.getAccount, set);
        },
        loadBudget: async () => {
          await requestAndSet<FinanceStore, 'budget'>('budget', financeService.getBudget, set);
        },
        loadAll: async (days) => {
          await Promise.all([
            get().actions.loadDailyLogs(days),
            get().actions.loadAccount(),
            get().actions.loadBudget(),
          ]);
        },
        loadSubscriptions: async () => {
          await requestAndSet<FinanceStore, 'subscriptions'>('subscriptions', financeService.getSubscriptions, set);
        },
        loadLending: async () => {
          await requestAndSet<FinanceStore, 'lending'>('lending', financeService.getLending, set);
        },
        loadRepayments: async () => {
          await requestAndSet<FinanceStore, 'repayments'>('repayments', financeService.getSliceRepayments, set);
        },
        loadCommitments: async () => {
          await Promise.all([
            get().actions.loadSubscriptions(),
            get().actions.loadLending(),
            get().actions.loadRepayments(),
          ]);
        },
        applyBalance: (balance) =>
          set((state) => {
            const prev = state.account.data;
            state.account.data = { balance, monthlyBudget: prev?.monthlyBudget ?? 0 };
            state.account.loaded = true;
          }),
        applyBudget: (monthlyBudget) =>
          set((state) => {
            const prev = state.budget.data;
            state.budget.data = { balance: prev?.balance ?? 0, monthlyBudget };
            state.budget.loaded = true;
          }),
      },
    })),
    { name: 'FinanceStore' },
  ),
);

export const useFinanceStore = createSelectors(useFinanceStoreBase);

/** Stable module-level handle — safe to call without listing as a dependency. */
export const financeActions = useFinanceStoreBase.getState().actions;
