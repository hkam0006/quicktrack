import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createLocalDataRepository,
  type TransactionInput,
} from '@/src/data/local/database';
import { notifyLocalDataChanged } from '@/src/data/local/events';
import { triggerSyncNow } from '@/src/data/sync/sync.service';
import { useAuth } from '@/src/features/auth/auth.context';

export interface CategoryOption {
  id: string;
  name: string;
}

export interface AddTransactionFormState {
  type: 'expense' | 'income';
  amount: string;
  categoryId: string | null;
  date: string;
  paymentMethod: 'cash' | 'card' | 'bank';
  note: string;
}

const initialState: AddTransactionFormState = {
  type: 'expense',
  amount: '',
  categoryId: null,
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'card',
  note: '',
};

interface UseAddTransactionOptions {
  transactionId?: string;
}

export function useAddTransaction(options: UseAddTransactionOptions = {}) {
  const { transactionId } = options;
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const isEditing = Boolean(transactionId);
  const [form, setForm] = useState<AddTransactionFormState>(initialState);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const repository = useMemo(
    () => (userId ? createLocalDataRepository(userId) : null),
    [userId]
  );

  useEffect(() => {
    async function load() {
      if (!repository) {
        setCategories([]);
        return;
      }

      await repository.initLocalDatabase();
      const options = await repository.getCategoryOptions();
      setCategories(options);

      if (transactionId) {
        const existing = await repository.getTransactionById(transactionId);
        if (!existing) {
          setError('Transaction not found.');
          return;
        }

        setForm({
          type: existing.type,
          amount: (existing.amount_cents / 100).toFixed(2),
          categoryId: existing.category_id,
          date: existing.occurred_at.slice(0, 10),
          paymentMethod: existing.payment_method,
          note: existing.note ?? '',
        });
        return;
      }

      const firstCategoryId = options[0]?.id ?? null;
      setForm((prev) => ({ ...prev, categoryId: prev.categoryId ?? firstCategoryId }));
    }

    void load();
  }, [repository, transactionId]);

  const update = useCallback((patch: Partial<AddTransactionFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const save = useCallback(async () => {
    const parsedAmount = Number.parseFloat(form.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount greater than zero.');
      return false;
    }

    const occurredAt = new Date(`${form.date}T08:00:00.000Z`).toISOString();

    const payload: TransactionInput = {
      type: form.type,
      amountCents: Math.round(parsedAmount * 100),
      occurredAt,
      categoryId: form.categoryId,
      paymentMethod: form.paymentMethod,
      note: form.note.trim() ? form.note.trim() : null,
    };

    setSaving(true);
    setError(null);

    if (!repository || !userId) {
      setError('You must be signed in to add a transaction.');
      setSaving(false);
      return false;
    }

    try {
      if (transactionId) {
        await repository.updateTransaction(transactionId, payload);
      } else {
        await repository.insertTransaction(payload);
        setForm(initialState);
      }
      notifyLocalDataChanged();
      void triggerSyncNow(userId);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save transaction');
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, repository, transactionId, userId]);

  return {
    form,
    categories,
    saving,
    error,
    isEditing,
    update,
    save,
  };
}
