import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createLocalDataRepository,
} from '@/src/data/local/database';
import { subscribeLocalDataChanges } from '@/src/data/local/events';
import { useAuth } from '@/src/features/auth/auth.context';
import type { HomeScreenData } from '@/src/features/home/home.types';

const defaultHomeData: HomeScreenData = {
  summary: {
    monthStart: new Date().toISOString(),
    monthEnd: new Date().toISOString(),
    spentCents: 0 as HomeScreenData['summary']['spentCents'],
    incomeCents: 0 as HomeScreenData['summary']['incomeCents'],
    netCents: 0 as HomeScreenData['summary']['netCents'],
  },
  totalBudget: null,
  topCategories: [],
  dailyTrend: [],
};

export function useHomeData() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeScreenData>(defaultHomeData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const repository = useMemo(
    () => (user?.id ? createLocalDataRepository(user.id) : null),
    [user?.id]
  );

  const load = useCallback(async () => {
    if (!repository) {
      setData(defaultHomeData);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      await repository.initLocalDatabase();

      const [summary, topCategories, dailyTrend, monthlyBudgets] = await Promise.all([
        repository.getHomeSummary(),
        repository.getTopCategorySpending(),
        repository.getDailyTrendData(),
        repository.getBudgetProgress('monthly'),
      ]);

      const totalBudget = monthlyBudgets.find((budget) => budget.categoryId === null) ?? null;

      setData({
        summary,
        topCategories,
        dailyTrend,
        totalBudget,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load home data');
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void load();

    const unsubscribe = subscribeLocalDataChanges(() => {
      void load();
    });

    return unsubscribe;
  }, [load]);

  return {
    data,
    loading,
    error,
    refresh: load,
  };
}
