import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { defaultCategoryDrafts } from '@/src/shared/lib/default-categories';
import type { BudgetProgress, CategorySpendSlice, DailyTrendPoint, MonthSummary } from '@/src/shared/types';
import { toCents } from '@/src/shared/types';

const DB_NAME = 'quick-track.db';
const LOCAL_USER_ID = 'local-user';

let dbPromise: Promise<SQLiteDatabase> | null = null;

export interface TransactionInput {
  type: 'expense' | 'income';
  amountCents: number;
  occurredAt: string;
  categoryId: string | null;
  paymentMethod: 'cash' | 'card' | 'bank';
  note: string | null;
}

interface SumRow {
  spent_cents: number;
  income_cents: number;
}

interface CategorySpendRow {
  category_id: string | null;
  category_name: string;
  color: string;
  spent_cents: number;
}

interface DailyRow {
  day: string;
  spent_cents: number;
  income_cents: number;
}

interface BudgetProgressRow {
  id: string;
  category_id: string | null;
  category_name: string;
  period: 'monthly' | 'yearly';
  amount_cents: number;
  spent_cents: number;
}

interface TransactionRow {
  id: string;
  type: 'expense' | 'income';
  amount_cents: number;
  occurred_at: string;
  category_name: string;
  payment_method: 'cash' | 'card' | 'bank';
  note: string | null;
}

interface CategoryOptionRow {
  id: string;
  name: string;
}

const createSchemaSql = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount_cents INTEGER NOT NULL,
  occurred_at TEXT NOT NULL,
  category_id TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank')),
  note TEXT,
  recurrence_rule_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('monthly', 'yearly')),
  amount_cents INTEGER NOT NULL,
  category_id TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  alert_at_80_percent INTEGER NOT NULL DEFAULT 1,
  alert_at_100_percent INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);
`;

function getDbAsync(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthBounds(date = new Date()): { startIso: string; endIso: string } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function getYearBounds(date = new Date()): { startIso: string; endIso: string } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

async function seedIfNeeded(db: SQLiteDatabase): Promise<void> {
  const categoryCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE user_id = ? AND deleted_at IS NULL',
    LOCAL_USER_ID
  );

  if ((categoryCount?.count ?? 0) === 0) {
    const now = new Date().toISOString();

    for (const category of defaultCategoryDrafts) {
      await db.runAsync(
        `INSERT INTO categories (id, user_id, name, color, icon, is_default, is_archived, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, NULL)`,
        makeId('cat'),
        LOCAL_USER_ID,
        category.name,
        category.color,
        category.icon,
        now,
        now
      );
    }

    const categories = await db.getAllAsync<CategoryOptionRow>(
      'SELECT id, name FROM categories WHERE user_id = ? AND deleted_at IS NULL',
      LOCAL_USER_ID
    );

    const categoryByName = new Map(categories.map((item) => [item.name, item.id]));

    const nowDate = new Date();
    const monthBounds = getMonthBounds(nowDate);
    const yearBounds = getYearBounds(nowDate);

    await db.runAsync(
      `INSERT INTO budgets (id, user_id, period, amount_cents, category_id, start_date, end_date, alert_at_80_percent, alert_at_100_percent, created_at, updated_at, deleted_at)
       VALUES (?, ?, 'monthly', ?, NULL, ?, ?, 1, 1, ?, ?, NULL)`,
      makeId('budget'),
      LOCAL_USER_ID,
      320000,
      monthBounds.startIso,
      monthBounds.endIso,
      now,
      now
    );

    for (const [name, cents] of [
      ['Food', 120000],
      ['Transport', 45000],
      ['Bills', 80000],
      ['Fun', 50000],
    ] as const) {
      const categoryId = categoryByName.get(name);
      if (!categoryId) {
        continue;
      }

      await db.runAsync(
        `INSERT INTO budgets (id, user_id, period, amount_cents, category_id, start_date, end_date, alert_at_80_percent, alert_at_100_percent, created_at, updated_at, deleted_at)
         VALUES (?, ?, 'monthly', ?, ?, ?, ?, 1, 1, ?, ?, NULL)`,
        makeId('budget'),
        LOCAL_USER_ID,
        cents,
        categoryId,
        monthBounds.startIso,
        monthBounds.endIso,
        now,
        now
      );
    }

    await db.runAsync(
      `INSERT INTO budgets (id, user_id, period, amount_cents, category_id, start_date, end_date, alert_at_80_percent, alert_at_100_percent, created_at, updated_at, deleted_at)
       VALUES (?, ?, 'yearly', ?, NULL, ?, ?, 1, 1, ?, ?, NULL)`,
      makeId('budget'),
      LOCAL_USER_ID,
      4800000,
      yearBounds.startIso,
      yearBounds.endIso,
      now,
      now
    );

    const sampleTransactions = [
      {
        type: 'income' as const,
        amount_cents: 420000,
        dayOffset: 0,
        categoryName: null,
        payment_method: 'bank' as const,
        note: 'Salary',
      },
      {
        type: 'expense' as const,
        amount_cents: 2300,
        dayOffset: 1,
        categoryName: 'Food',
        payment_method: 'card' as const,
        note: 'Coffee',
      },
      {
        type: 'expense' as const,
        amount_cents: 12800,
        dayOffset: 2,
        categoryName: 'Food',
        payment_method: 'card' as const,
        note: 'Groceries',
      },
      {
        type: 'expense' as const,
        amount_cents: 7500,
        dayOffset: 4,
        categoryName: 'Transport',
        payment_method: 'card' as const,
        note: 'Ride share',
      },
      {
        type: 'expense' as const,
        amount_cents: 41000,
        dayOffset: 7,
        categoryName: 'Bills',
        payment_method: 'bank' as const,
        note: 'Electricity bill',
      },
      {
        type: 'expense' as const,
        amount_cents: 18500,
        dayOffset: 10,
        categoryName: 'Fun',
        payment_method: 'card' as const,
        note: 'Concert ticket',
      },
    ];

    for (const tx of sampleTransactions) {
      const occurredAtDate = new Date();
      occurredAtDate.setUTCDate(occurredAtDate.getUTCDate() - tx.dayOffset);
      occurredAtDate.setUTCHours(8, 30, 0, 0);

      const categoryId = tx.categoryName ? categoryByName.get(tx.categoryName) ?? null : null;

      await db.runAsync(
        `INSERT INTO transactions (id, user_id, type, amount_cents, occurred_at, category_id, payment_method, note, recurrence_rule_id, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL)`,
        makeId('txn'),
        LOCAL_USER_ID,
        tx.type,
        tx.amount_cents,
        occurredAtDate.toISOString(),
        categoryId,
        tx.payment_method,
        tx.note,
        now,
        now
      );
    }
  }
}

export async function initLocalDatabase(): Promise<void> {
  const db = await getDbAsync();
  await db.execAsync(createSchemaSql);
  await seedIfNeeded(db);
}

export async function getHomeSummary(): Promise<MonthSummary> {
  const db = await getDbAsync();
  const { startIso, endIso } = getMonthBounds();

  const result = await db.getFirstAsync<SumRow>(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) as spent_cents,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) as income_cents
     FROM transactions
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND occurred_at BETWEEN ? AND ?`,
    LOCAL_USER_ID,
    startIso,
    endIso
  );

  const spent = result?.spent_cents ?? 0;
  const income = result?.income_cents ?? 0;

  return {
    monthStart: startIso,
    monthEnd: endIso,
    spentCents: toCents(spent),
    incomeCents: toCents(income),
    netCents: toCents(income - spent),
  };
}

export async function getTopCategorySpending(limit = 5): Promise<CategorySpendSlice[]> {
  const db = await getDbAsync();
  const { startIso, endIso } = getMonthBounds();

  const rows = await db.getAllAsync<CategorySpendRow>(
    `SELECT
      t.category_id as category_id,
      COALESCE(c.name, 'Uncategorized') as category_name,
      COALESCE(c.color, '#6B7280') as color,
      COALESCE(SUM(t.amount_cents), 0) as spent_cents
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ?
       AND t.deleted_at IS NULL
       AND t.type = 'expense'
       AND t.occurred_at BETWEEN ? AND ?
     GROUP BY t.category_id, c.name, c.color
     ORDER BY spent_cents DESC
     LIMIT ?`,
    LOCAL_USER_ID,
    startIso,
    endIso,
    limit
  );

  const total = rows.reduce((sum, row) => sum + row.spent_cents, 0);

  return rows.map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    color: row.color,
    spentCents: toCents(row.spent_cents),
    percentOfTotal: total > 0 ? (row.spent_cents / total) * 100 : 0,
  }));
}

export async function getDailyTrendData(): Promise<DailyTrendPoint[]> {
  const db = await getDbAsync();
  const { startIso, endIso } = getMonthBounds();

  const rows = await db.getAllAsync<DailyRow>(
    `SELECT
      substr(occurred_at, 1, 10) as day,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) as spent_cents,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) as income_cents
     FROM transactions
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND occurred_at BETWEEN ? AND ?
     GROUP BY day
     ORDER BY day ASC`,
    LOCAL_USER_ID,
    startIso,
    endIso
  );

  return rows.map((row) => ({
    date: `${row.day}T00:00:00.000Z`,
    spentCents: toCents(row.spent_cents),
    incomeCents: toCents(row.income_cents),
  }));
}

export async function getBudgetProgress(period: 'monthly' | 'yearly'): Promise<BudgetProgress[]> {
  const db = await getDbAsync();

  const rows = await db.getAllAsync<BudgetProgressRow>(
    `SELECT
      b.id,
      b.category_id,
      COALESCE(c.name, 'Overall') as category_name,
      b.period,
      b.amount_cents,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) as spent_cents
     FROM budgets b
     LEFT JOIN categories c ON c.id = b.category_id
     LEFT JOIN transactions t
       ON t.user_id = b.user_id
      AND t.deleted_at IS NULL
      AND t.occurred_at BETWEEN b.start_date AND b.end_date
      AND (b.category_id IS NULL OR t.category_id = b.category_id)
     WHERE b.user_id = ?
       AND b.deleted_at IS NULL
       AND b.period = ?
     GROUP BY b.id, b.category_id, c.name, b.period, b.amount_cents
     ORDER BY CASE WHEN b.category_id IS NULL THEN 0 ELSE 1 END, spent_cents DESC`,
    LOCAL_USER_ID,
    period
  );

  return rows.map((row) => {
    const ratio = row.amount_cents > 0 ? row.spent_cents / row.amount_cents : 0;

    return {
      budgetId: row.id,
      categoryId: row.category_id,
      period: row.period,
      budgetCents: toCents(row.amount_cents),
      spentCents: toCents(row.spent_cents),
      remainingCents: toCents(Math.max(row.amount_cents - row.spent_cents, 0)),
      progressRatio: ratio,
      thresholdState: ratio >= 1 ? 'warning100' : ratio >= 0.8 ? 'warning80' : 'safe',
    };
  });
}

export async function getTransactions(limit = 100): Promise<TransactionRow[]> {
  const db = await getDbAsync();

  return db.getAllAsync<TransactionRow>(
    `SELECT
      t.id,
      t.type,
      t.amount_cents,
      t.occurred_at,
      COALESCE(c.name, 'Uncategorized') as category_name,
      t.payment_method,
      t.note
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ?
       AND t.deleted_at IS NULL
     ORDER BY t.occurred_at DESC
     LIMIT ?`,
    LOCAL_USER_ID,
    limit
  );
}

export async function getCategoryOptions(): Promise<CategoryOptionRow[]> {
  const db = await getDbAsync();

  return db.getAllAsync<CategoryOptionRow>(
    `SELECT id, name
     FROM categories
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND is_archived = 0
     ORDER BY is_default DESC, name ASC`,
    LOCAL_USER_ID
  );
}

export async function insertTransaction(input: TransactionInput): Promise<void> {
  const db = await getDbAsync();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO transactions (id, user_id, type, amount_cents, occurred_at, category_id, payment_method, note, recurrence_rule_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL)`,
    makeId('txn'),
    LOCAL_USER_ID,
    input.type,
    input.amountCents,
    input.occurredAt,
    input.categoryId,
    input.paymentMethod,
    input.note,
    now,
    now
  );
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatShortDay(iso: string): string {
  const date = new Date(iso);
  return toIsoDay(date).slice(-2);
}
