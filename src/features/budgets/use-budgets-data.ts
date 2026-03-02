import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatCurrency, getBudgetProgress, initLocalDatabase } from '@/src/data/local/database';
import { subscribeLocalDataChanges } from '@/src/data/local/events';
import type { BudgetProgress } from '@/src/shared/types';

export interface BudgetsData {
  monthly: BudgetProgress[];
  yearly: BudgetProgress[];
}

export function useBudgetsData() {
  const [data, setData] = useState<BudgetsData>({ monthly: [], yearly: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      await initLocalDatabase();

      const [monthly, yearly] = await Promise.all([getBudgetProgress('monthly'), getBudgetProgress('yearly')]);
      setData({ monthly, yearly });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const unsubscribe = subscribeLocalDataChanges(() => {
      void load();
    });

    return unsubscribe;
  }, [load]);

  const monthlyOverall = useMemo(() => data.monthly.find((item) => item.categoryId === null) ?? null, [data.monthly]);

  return {
    data,
    monthlyOverall,
    loading,
    error,
    refresh: load,
    formatCurrency,
  };
}
