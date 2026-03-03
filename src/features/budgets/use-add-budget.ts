import { useCallback, useEffect, useMemo, useState } from 'react';

import { createLocalDataRepository, type BudgetInput } from '@/src/data/local/database';
import { notifyLocalDataChanged } from '@/src/data/local/events';
import { triggerSyncNow } from '@/src/data/sync/sync.service';
import { useAuth } from '@/src/features/auth/auth.context';

export interface BudgetCategoryOption {
  id: string;
  name: string;
}

export interface AddBudgetFormState {
  period: 'monthly' | 'yearly';
  amount: string;
  categoryId: string | null;
  monthKey: string;
  yearKey: string;
  alertAt80Percent: boolean;
  alertAt100Percent: boolean;
}

function formatMonthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function getInitialMonthKey(anchor = new Date()): string {
  return formatMonthKey(anchor.getUTCFullYear(), anchor.getUTCMonth());
}

function getMonthlyRange(monthKey: string): { startDate: Date; endDate: Date } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthKey);
  if (!match) {
    return null;
  }
  const year = Number.parseInt(match[1], 10);
  const monthNumber = Number.parseInt(match[2], 10);
  const monthIndex = monthNumber - 1;

  const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return { startDate, endDate };
}

function getYearlyRange(yearKey: string): { startDate: Date; endDate: Date } | null {
  if (!/^\d{4}$/.test(yearKey)) {
    return null;
  }
  const year = Number.parseInt(yearKey, 10);
  const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  return {
    startDate,
    endDate,
  };
}

const now = new Date();
const initialState: AddBudgetFormState = {
  period: 'monthly',
  amount: '',
  categoryId: null,
  monthKey: getInitialMonthKey(now),
  yearKey: String(now.getUTCFullYear()),
  alertAt80Percent: true,
  alertAt100Percent: true,
};

interface UseAddBudgetOptions {
  budgetId?: string;
}

export function useAddBudget(options: UseAddBudgetOptions = {}) {
  const { budgetId } = options;
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const isEditing = Boolean(budgetId);
  const [form, setForm] = useState<AddBudgetFormState>(initialState);
  const [categories, setCategories] = useState<BudgetCategoryOption[]>([]);
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

      if (budgetId) {
        const existing = await repository.getBudgetById(budgetId);
        if (!existing) {
          setError('Budget not found.');
          return;
        }

        setForm({
          period: existing.period,
          amount: (existing.amount_cents / 100).toFixed(2),
          categoryId: existing.category_id,
          monthKey: formatMonthKey(
            new Date(existing.start_date).getUTCFullYear(),
            new Date(existing.start_date).getUTCMonth()
          ),
          yearKey: String(new Date(existing.start_date).getUTCFullYear()),
          alertAt80Percent: Boolean(existing.alert_at_80_percent),
          alertAt100Percent: Boolean(existing.alert_at_100_percent),
        });
        return;
      }
    }

    void load();
  }, [budgetId, repository]);

  const update = useCallback((patch: Partial<AddBudgetFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const updatePeriod = useCallback((period: 'monthly' | 'yearly') => {
    setForm((prev) => ({
      ...prev,
      period,
    }));
  }, []);

  const save = useCallback(async () => {
    const parsedAmount = Number.parseFloat(form.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid budget amount greater than zero.');
      return false;
    }

    const range =
      form.period === 'monthly' ? getMonthlyRange(form.monthKey) : getYearlyRange(form.yearKey);
    if (!range) {
      setError(form.period === 'monthly' ? 'Select a valid month.' : 'Select a valid year.');
      return false;
    }

    const payload: BudgetInput = {
      period: form.period,
      amountCents: Math.round(parsedAmount * 100),
      categoryId: form.categoryId,
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
      alertAt80Percent: form.alertAt80Percent,
      alertAt100Percent: form.alertAt100Percent,
    };

    setSaving(true);
    setError(null);

    if (!repository || !userId) {
      setError('You must be signed in to manage budgets.');
      setSaving(false);
      return false;
    }

    try {
      if (budgetId) {
        await repository.updateBudget(budgetId, payload);
      } else {
        await repository.insertBudget(payload);
        setForm(initialState);
      }
      notifyLocalDataChanged();
      void triggerSyncNow(userId);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save budget');
      return false;
    } finally {
      setSaving(false);
    }
  }, [budgetId, form, repository, userId]);

  return {
    form,
    categories,
    saving,
    error,
    isEditing,
    update,
    updatePeriod,
    save,
  };
}
