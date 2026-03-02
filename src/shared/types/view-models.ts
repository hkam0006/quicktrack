import type { Cents, ISODateString, UUID } from './primitives';

export interface MonthSummary {
  monthStart: ISODateString;
  monthEnd: ISODateString;
  spentCents: Cents;
  incomeCents: Cents;
  netCents: Cents;
}

export interface CategorySpendSlice {
  categoryId: UUID | null;
  categoryName: string;
  color: string;
  spentCents: Cents;
  percentOfTotal: number;
}

export interface DailyTrendPoint {
  date: ISODateString;
  spentCents: Cents;
  incomeCents: Cents;
}

export interface BudgetProgress {
  budgetId: UUID;
  categoryId: UUID | null;
  period: 'monthly' | 'yearly';
  budgetCents: Cents;
  spentCents: Cents;
  remainingCents: Cents;
  progressRatio: number;
  thresholdState: 'safe' | 'warning80' | 'warning100';
}
