import type { Budget, Category, RecurrenceRule, Transaction, UserProfile } from '@/src/shared/types';

export interface RemoteTables {
  profiles: UserProfile;
  categories: Category;
  transactions: Transaction;
  budgets: Budget;
  recurrence_rules: RecurrenceRule;
}
