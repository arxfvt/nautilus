export type TransactionType = "income" | "expense" | "transfer";
export type AccountType =
  | "cash"
  | "checking"
  | "savings"
  | "credit_card"
  | "investment"
  | "loan"
  | "other";
export type BudgetPeriod = "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
export type RuleFrequency =
  | "once"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface AccountWithBalance {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  color?: string | null;
  icon?: string | null;
  includeInTotal: boolean;
  isArchived: boolean;
  sortOrder: number;
  balance: number; // computed, in minor units
}

export interface TransactionWithRelations {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: Date;
  note?: string | null;
  isPending: boolean;
  account: { id: string; name: string; color?: string | null };
  toAccount?: { id: string; name: string } | null;
  category?: { id: string; name: string; icon?: string | null; color?: string | null } | null;
  labels: { id: string; name: string; color?: string | null }[];
}

export interface BudgetWithProgress {
  id: string;
  name: string;
  amount: number;
  currency: string;
  period: BudgetPeriod;
  spent: number;
  percentage: number;
  status: "ok" | "warning" | "exceeded";
  categories: { id: string; name: string; icon?: string | null; color?: string | null }[];
}

export interface StatsPeriod {
  start: Date;
  end: Date;
  label: string;
}

export interface DashboardData {
  accounts: AccountWithBalance[];
  recentTransactions: TransactionWithRelations[];
  netWorth: number;
  currency: string;
}
