import type { Budget, Category, OutboxMutation, RecurrenceRule, Transaction, UserProfile } from '@/src/shared/types';

export interface LocalDatabase {
  profiles: UserProfile[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  recurrenceRules: RecurrenceRule[];
  outbox: OutboxMutation[];
}
