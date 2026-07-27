// Finance domain types — the single source of truth. `lib/api.ts` re-exports
// these for back-compat while its finance functions are migrated to the service.

export interface FinancialTotals {
  totalExpense: number;
  totalIncome: number;
}

export interface FinancialTransaction {
  id: string;
  description: string;
  amount: number;
  type: string; // "Income" | "Expense"
  timestamp: string;
}

export interface DailyFinancialLog {
  id: string;
  date: string;
  dailyTotals: FinancialTotals;
  transactions: Record<string, FinancialTransaction[]>;
}

export interface FinanceAccount {
  balance: number;
  monthlyBudget: number;
}

export interface RepaymentInstallment {
  id: string;
  dueDate: string;
  amount: string;
  status: string;
}

export interface SubscriptionDTO {
  id: string;
  name: string;
  cost: number;
  billingDate: string;
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

// ── Request DTOs ──
export interface TransactionRequest {
  description: string;
  amount: number;
  category: string;
  type: string;
  date: string;
}

export interface SubscriptionRequest {
  name: string;
  cost: number;
  billingDate?: string;
}

export type LendingRequest = Omit<LendingRecord, 'id'>;
