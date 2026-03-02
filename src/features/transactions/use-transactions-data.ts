import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatCurrency, getTransactions, initLocalDatabase } from '@/src/data/local/database';
import { subscribeLocalDataChanges } from '@/src/data/local/events';

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
  const [items, setItems] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      await initLocalDatabase();
      const rows = await getTransactions(200);

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
  }, []);

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
