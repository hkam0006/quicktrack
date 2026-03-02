import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { defaultCategoryDrafts } from '@/src/shared/lib/default-categories';
import type { BudgetProgress, CategorySpendSlice, DailyTrendPoint, MonthSummary } from '@/src/shared/types';
import { toCents } from '@/src/shared/types';

const DB_NAME = 'quick-track.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;
const initByUserId = new Map<string, Promise<void>>();

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

export interface LocalDataRepository {
  initLocalDatabase: () => Promise<void>;
  getHomeSummary: () => Promise<MonthSummary>;
  getTopCategorySpending: (limit?: number) => Promise<CategorySpendSlice[]>;
  getDailyTrendData: () => Promise<DailyTrendPoint[]>;
  getBudgetProgress: (period: 'monthly' | 'yearly') => Promise<BudgetProgress[]>;
  getTransactions: (limit?: number) => Promise<TransactionRow[]>;
  getCategoryOptions: () => Promise<CategoryOptionRow[]>;
  insertTransaction: (input: TransactionInput) => Promise<void>;
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

function assertUserId(userId: string): string {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error('A valid authenticated user id is required for local data access.');
  }

  return normalized;
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

async function dedupeCategories(db: SQLiteDatabase, userId: string): Promise<void> {
  const duplicateNames = await db.getAllAsync<{ name: string }>(
    `SELECT name
     FROM categories
     WHERE user_id = ?
       AND deleted_at IS NULL
     GROUP BY name
     HAVING COUNT(*) > 1`,
    userId
  );

  if (duplicateNames.length === 0) {
    return;
  }

  const now = new Date().toISOString();

  for (const duplicateName of duplicateNames) {
    const rows = await db.getAllAsync<{ id: string }>(
      `SELECT id
       FROM categories
       WHERE user_id = ?
         AND name = ?
         AND deleted_at IS NULL
       ORDER BY created_at ASC, id ASC`,
      userId,
      duplicateName.name
    );

    const [canonical, ...duplicates] = rows;
    if (!canonical || duplicates.length === 0) {
      continue;
    }

    for (const duplicate of duplicates) {
      await db.runAsync(
        'UPDATE transactions SET category_id = ? WHERE user_id = ? AND category_id = ?',
        canonical.id,
        userId,
        duplicate.id
      );
      await db.runAsync(
        'UPDATE budgets SET category_id = ? WHERE user_id = ? AND category_id = ?',
        canonical.id,
        userId,
        duplicate.id
      );
      await db.runAsync(
        'UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ?',
        now,
        now,
        duplicate.id
      );
    }
  }
}

async function seedDefaultCategoriesIfNeeded(db: SQLiteDatabase, userId: string): Promise<void> {
  await dedupeCategories(db, userId);

  const categoryCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE user_id = ? AND deleted_at IS NULL',
    userId
  );

  if ((categoryCount?.count ?? 0) > 0) {
    return;
  }

  const now = new Date().toISOString();

  // Seed only baseline categories for authenticated users.
  // No sample/demo transactions or budgets are auto-created.
  for (const category of defaultCategoryDrafts) {
    const existingCategory = await db.getFirstAsync<{ id: string }>(
      `SELECT id
       FROM categories
       WHERE user_id = ?
         AND name = ?
         AND deleted_at IS NULL
       LIMIT 1`,
      userId,
      category.name
    );

    if (existingCategory) {
      continue;
    }

    await db.runAsync(
      `INSERT INTO categories (id, user_id, name, color, icon, is_default, is_archived, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, NULL)`,
      makeId('cat'),
      userId,
      category.name,
      category.color,
      category.icon,
      now,
      now
    );
  }
}

async function initLocalDatabaseForUser(userId: string): Promise<void> {
  const existingInit = initByUserId.get(userId);
  if (existingInit) {
    await existingInit;
    return;
  }

  const initialize = (async () => {
    const db = await getDbAsync();
    await db.execAsync(createSchemaSql);
    await seedDefaultCategoriesIfNeeded(db, userId);
  })();

  initByUserId.set(userId, initialize);

  try {
    await initialize;
  } finally {
    initByUserId.delete(userId);
  }
}

async function getHomeSummaryForUser(userId: string): Promise<MonthSummary> {
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
    userId,
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

async function getTopCategorySpendingForUser(userId: string, limit = 5): Promise<CategorySpendSlice[]> {
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
    userId,
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

async function getDailyTrendDataForUser(userId: string): Promise<DailyTrendPoint[]> {
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
    userId,
    startIso,
    endIso
  );

  return rows.map((row) => ({
    date: `${row.day}T00:00:00.000Z`,
    spentCents: toCents(row.spent_cents),
    incomeCents: toCents(row.income_cents),
  }));
}

async function getBudgetProgressForUser(userId: string, period: 'monthly' | 'yearly'): Promise<BudgetProgress[]> {
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
    userId,
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

async function getTransactionsForUser(userId: string, limit = 100): Promise<TransactionRow[]> {
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
    userId,
    limit
  );
}

async function getCategoryOptionsForUser(userId: string): Promise<CategoryOptionRow[]> {
  const db = await getDbAsync();

  return db.getAllAsync<CategoryOptionRow>(
    `SELECT id, name
     FROM categories
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND is_archived = 0
     ORDER BY is_default DESC, name ASC`,
    userId
  );
}

async function insertTransactionForUser(userId: string, input: TransactionInput): Promise<void> {
  const db = await getDbAsync();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO transactions (id, user_id, type, amount_cents, occurred_at, category_id, payment_method, note, recurrence_rule_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL)`,
    makeId('txn'),
    userId,
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

export function createLocalDataRepository(userId: string): LocalDataRepository {
  const scopedUserId = assertUserId(userId);

  return {
    initLocalDatabase: () => initLocalDatabaseForUser(scopedUserId),
    getHomeSummary: () => getHomeSummaryForUser(scopedUserId),
    getTopCategorySpending: (limit) => getTopCategorySpendingForUser(scopedUserId, limit),
    getDailyTrendData: () => getDailyTrendDataForUser(scopedUserId),
    getBudgetProgress: (period) => getBudgetProgressForUser(scopedUserId, period),
    getTransactions: (limit) => getTransactionsForUser(scopedUserId, limit),
    getCategoryOptions: () => getCategoryOptionsForUser(scopedUserId),
    insertTransaction: (input) => insertTransactionForUser(scopedUserId, input),
  };
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
