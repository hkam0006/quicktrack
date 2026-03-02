import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createLocalDataRepository,
  type TransactionInput,
} from '@/src/data/local/database';
import { notifyLocalDataChanged } from '@/src/data/local/events';
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

export function useAddTransaction() {
  const { user } = useAuth();
  const [form, setForm] = useState<AddTransactionFormState>(initialState);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const repository = useMemo(
    () => (user?.id ? createLocalDataRepository(user.id) : null),
    [user?.id]
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
      if (!form.categoryId && options.length > 0) {
        setForm((prev) => ({ ...prev, categoryId: options[0].id }));
      }
    }

    void load();
  }, [form.categoryId, repository]);

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

    if (!repository) {
      setError('You must be signed in to add a transaction.');
      setSaving(false);
      return false;
    }

    try {
      await repository.insertTransaction(payload);
      notifyLocalDataChanged();
      setForm(initialState);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save transaction');
      return false;
    } finally {
      setSaving(false);
    }
  }, [form, repository]);

  return {
    form,
    categories,
    saving,
    error,
    update,
    save,
  };
}
