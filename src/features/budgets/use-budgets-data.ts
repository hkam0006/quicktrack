import { useCallback, useEffect, useMemo, useState } from 'react';

import { createLocalDataRepository, formatCurrency } from '@/src/data/local/database';
import { subscribeLocalDataChanges } from '@/src/data/local/events';
import { triggerSyncNow } from '@/src/data/sync/sync.service';
import { useAuth } from '@/src/features/auth/auth.context';
import type { BudgetProgress } from '@/src/shared/types';

export interface BudgetsData {
  monthly: BudgetProgress[];
  yearly: BudgetProgress[];
}

export function useBudgetsData() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [data, setData] = useState<BudgetsData>({ monthly: [], yearly: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const repository = useMemo(
    () => (userId ? createLocalDataRepository(userId) : null),
    [userId]
  );

  const load = useCallback(async () => {
    if (!repository || !userId) {
      setData({ monthly: [], yearly: [] });
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      await repository.initLocalDatabase();
      await triggerSyncNow(userId);

      const [monthly, yearly] = await Promise.all([
        repository.getBudgetProgress('monthly'),
        repository.getBudgetProgress('yearly'),
      ]);
      setData({ monthly, yearly });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, [repository, userId]);

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
