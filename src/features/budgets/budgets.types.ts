import type { Budget, BudgetPeriod, Cents, UUID } from '@/src/shared/types';

export interface BudgetDraft {
  period: BudgetPeriod;
  amountInput: string;
  categoryId: UUID | null;
  startDate: string;
  endDate: string;
}

export interface BudgetAlert {
  budgetId: UUID;
  threshold: 80 | 100;
  spentCents: Cents;
  budgetCents: Cents;
}

export interface BudgetListState {
  overall: Budget | null;
  byCategory: Budget[];
}
