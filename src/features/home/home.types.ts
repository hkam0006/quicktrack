import type { BudgetProgress, CategorySpendSlice, DailyTrendPoint, MonthSummary } from '@/src/shared/types';

export interface HomeScreenData {
  summary: MonthSummary;
  totalBudget: BudgetProgress | null;
  topCategories: CategorySpendSlice[];
  dailyTrend: DailyTrendPoint[];
}
