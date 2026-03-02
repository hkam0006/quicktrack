import { useCallback, useEffect, useMemo, useState } from 'react';

import { createLocalDataRepository, formatCurrency } from '@/src/data/local/database';
import { subscribeLocalDataChanges } from '@/src/data/local/events';
import { triggerSyncNow } from '@/src/data/sync/sync.service';
import { useAuth } from '@/src/features/auth/auth.context';

export interface TransactionListItem {
  id: string;
  type: 'expense' | 'income';
  amountCents: number;
  occurredAt: string;
  categoryName: string;
  paymentMethod: 'cash' | 'card' | 'bank';
  note: string | null;
}

export function useTransactionsData(query: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [items, setItems] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const repository = useMemo(
    () => (userId ? createLocalDataRepository(userId) : null),
    [userId]
  );

  const load = useCallback(async () => {
    if (!repository || !userId) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      await repository.initLocalDatabase();
      await triggerSyncNow(userId);
      const rows = await repository.getTransactions(200);

      setItems(
        rows.map((row) => ({
          id: row.id,
          type: row.type,
          amountCents: row.amount_cents,
          occurredAt: row.occurred_at,
          categoryName: row.category_name,
          paymentMethod: row.payment_method,
          note: row.note,
        }))
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load transactions');
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

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items;
    }

    return items.filter((item) => {
      const note = item.note?.toLowerCase() ?? '';
      return item.categoryName.toLowerCase().includes(normalized) || note.includes(normalized);
    });
  }, [items, query]);

  return {
    items: filtered,
    loading,
    error,
    refresh: load,
    formatCurrency,
  };
}
