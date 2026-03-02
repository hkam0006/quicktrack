import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { Database } from '@/src/data/remote/supabase.types';
import { defaultCategoryDrafts } from '@/src/shared/lib/default-categories';
import type {
  BudgetProgress,
  CategorySpendSlice,
  DailyTrendPoint,
  MonthSummary,
  OutboxMutation,
  SyncCheckpoint,
  SyncOperation,
  SyncTableName,
} from '@/src/shared/types';
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

interface LocalOutboxRow {
  id: string;
  table_name: SyncTableName;
  operation: SyncOperation;
  row_id: string;
  payload_json: string;
  created_at: string;
  retry_count: number;
  last_error: string | null;
}

interface LocalCheckpointRow {
  id: string;
  last_pulled_at: string | null;
  last_pushed_at: string | null;
}

const createSchemaSql = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AUD',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

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

CREATE TABLE IF NOT EXISTS recurrence_rules (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  interval INTEGER NOT NULL,
  by_month_day INTEGER,
  next_run_at TEXT NOT NULL,
  end_at TEXT,
  template_note TEXT,
  template_amount_cents INTEGER NOT NULL,
  template_category_id TEXT,
  template_payment_method TEXT NOT NULL CHECK (template_payment_method IN ('cash', 'card', 'bank')),
  template_type TEXT NOT NULL CHECK (template_type IN ('expense', 'income')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY(template_category_id) REFERENCES categories(id)
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
  FOREIGN KEY(category_id) REFERENCES categories(id),
  FOREIGN KEY(recurrence_rule_id) REFERENCES recurrence_rules(id)
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

CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  row_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_attempt_at TEXT,
  processed_at TEXT
);

CREATE TABLE IF NOT EXISTS sync_checkpoints (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  last_pulled_at TEXT,
  last_pushed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_user_deleted ON categories(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_occurred ON transactions(user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, period);
CREATE INDEX IF NOT EXISTS idx_outbox_user_processed_created ON outbox(user_id, processed_at, created_at);
`;

export interface LocalDataRepository {
  initLocalDatabase: () => Promise<void>;
  getHomeSummary: () => Promise<MonthSummary>;
  getTopCategorySpending: (limit?: number) => Promise<CategorySpendSlice[]>;
  getDailyTrendData: () => Promise<DailyTrendPoint[]>;
  getBudgetProgress: (period: 'monthly' | 'yearly') => Promise<BudgetProgress[]>;
  getTransactions: (limit?: number) => Promise<TransactionRow[]>;
  getCategoryOptions: () => Promise<CategoryOptionRow[]>;
  insertTransaction: (input: TransactionInput) => Promise<void>;
  getPendingMutations: (limit?: number) => Promise<OutboxMutation[]>;
  markMutationComplete: (mutationId: string) => Promise<void>;
  markMutationFailed: (mutationId: string, reason: string) => Promise<void>;
  updatePendingMutationPayload: (mutationId: string, rowId: string, payloadJson: string) => Promise<void>;
  replaceTransactionId: (oldTransactionId: string, newTransactionId: string) => Promise<void>;
  updateTransactionCategory: (transactionId: string, categoryId: string | null) => Promise<void>;
  getCheckpoint: () => Promise<SyncCheckpoint | null>;
  saveCheckpoint: (checkpoint: SyncCheckpoint) => Promise<void>;
  applyRemoteRows: <TTable extends SyncTableName>(
    tableName: TTable,
    rows: Database['public']['Tables'][TTable]['Row'][]
  ) => Promise<number>;
}

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

function makeId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nowIso(): string {
  return new Date().toISOString();
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

  const now = nowIso();

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

  const now = nowIso();

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

    const categoryId = makeId();

    await db.runAsync(
      `INSERT INTO categories (id, user_id, name, color, icon, is_default, is_archived, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?, NULL)`,
      categoryId,
      userId,
      category.name,
      category.color,
      category.icon,
      now,
      now
    );

    await enqueueMutation(db, userId, 'categories', 'create', categoryId, {
      id: categoryId,
      user_id: userId,
      name: category.name,
      color: category.color,
      icon: category.icon,
      is_default: true,
      is_archived: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
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

type SyncPayloadRow = Database['public']['Tables'][SyncTableName]['Row'];

async function enqueueMutation(
  db: SQLiteDatabase,
  userId: string,
  tableName: SyncTableName,
  operation: SyncOperation,
  rowId: string,
  payload: SyncPayloadRow
): Promise<void> {
  const timestamp = nowIso();

  await db.runAsync(
    `INSERT INTO outbox (id, user_id, table_name, operation, row_id, payload_json, retry_count, last_error, created_at, updated_at, last_attempt_at, processed_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, NULL, NULL)`,
    makeId(),
    userId,
    tableName,
    operation,
    rowId,
    JSON.stringify(payload),
    timestamp,
    timestamp
  );
}

async function insertTransactionForUser(userId: string, input: TransactionInput): Promise<void> {
  const db = await getDbAsync();
  const now = nowIso();
  const id = makeId();

  await db.runAsync(
    `INSERT INTO transactions (id, user_id, type, amount_cents, occurred_at, category_id, payment_method, note, recurrence_rule_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL)`,
    id,
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

  await enqueueMutation(db, userId, 'transactions', 'create', id, {
    id,
    user_id: userId,
    transaction_type: input.type,
    amount_cents: input.amountCents,
    occurred_at: input.occurredAt,
    category_id: input.categoryId,
    payment_method: input.paymentMethod,
    note: input.note,
    recurrence_rule_id: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
}

async function getPendingMutationsForUser(userId: string, limit = 100): Promise<OutboxMutation[]> {
  const db = await getDbAsync();

  const rows = await db.getAllAsync<LocalOutboxRow>(
    `SELECT id, table_name, operation, row_id, payload_json, created_at, retry_count, last_error
     FROM outbox
     WHERE user_id = ?
       AND processed_at IS NULL
     ORDER BY created_at ASC
     LIMIT ?`,
    userId,
    limit
  );

  return rows.map((row) => ({
    id: row.id,
    tableName: row.table_name,
    operation: row.operation,
    rowId: row.row_id,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
    retryCount: row.retry_count,
    lastError: row.last_error,
  }));
}

async function markMutationCompleteForUser(userId: string, mutationId: string): Promise<void> {
  const db = await getDbAsync();
  const now = nowIso();

  await db.runAsync(
    `UPDATE outbox
     SET processed_at = ?,
         last_attempt_at = ?,
         updated_at = ?,
         last_error = NULL
     WHERE user_id = ?
       AND id = ?`,
    now,
    now,
    now,
    userId,
    mutationId
  );
}

async function markMutationFailedForUser(userId: string, mutationId: string, reason: string): Promise<void> {
  const db = await getDbAsync();
  const now = nowIso();

  await db.runAsync(
    `UPDATE outbox
     SET retry_count = retry_count + 1,
         last_error = ?,
         last_attempt_at = ?,
         updated_at = ?
     WHERE user_id = ?
       AND id = ?`,
    reason,
    now,
    now,
    userId,
    mutationId
  );
}

async function updatePendingMutationPayloadForUser(
  userId: string,
  mutationId: string,
  rowId: string,
  payloadJson: string
): Promise<void> {
  const db = await getDbAsync();
  const now = nowIso();

  await db.runAsync(
    `UPDATE outbox
     SET row_id = ?,
         payload_json = ?,
         updated_at = ?
     WHERE user_id = ?
       AND id = ?`,
    rowId,
    payloadJson,
    now,
    userId,
    mutationId
  );
}

async function replaceTransactionIdForUser(userId: string, oldTransactionId: string, newTransactionId: string): Promise<void> {
  const db = await getDbAsync();

  await db.runAsync(
    `UPDATE transactions
     SET id = ?
     WHERE user_id = ?
       AND id = ?`,
    newTransactionId,
    userId,
    oldTransactionId
  );
}

async function updateTransactionCategoryForUser(
  userId: string,
  transactionId: string,
  categoryId: string | null
): Promise<void> {
  const db = await getDbAsync();
  const now = nowIso();

  await db.runAsync(
    `UPDATE transactions
     SET category_id = ?,
         updated_at = ?
     WHERE user_id = ?
       AND id = ?`,
    categoryId,
    now,
    userId,
    transactionId
  );
}

async function getCheckpointForUser(userId: string): Promise<SyncCheckpoint | null> {
  const db = await getDbAsync();
  const row = await db.getFirstAsync<LocalCheckpointRow>(
    `SELECT id, last_pulled_at, last_pushed_at
     FROM sync_checkpoints
     WHERE user_id = ?
     LIMIT 1`,
    userId
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    lastPulledAt: row.last_pulled_at,
    lastPushedAt: row.last_pushed_at,
  };
}

async function saveCheckpointForUser(userId: string, checkpoint: SyncCheckpoint): Promise<void> {
  const db = await getDbAsync();
  const now = nowIso();

  await db.runAsync(
    `INSERT INTO sync_checkpoints (id, user_id, last_pulled_at, last_pushed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       id = excluded.id,
       last_pulled_at = excluded.last_pulled_at,
       last_pushed_at = excluded.last_pushed_at,
       updated_at = excluded.updated_at`,
    checkpoint.id,
    userId,
    checkpoint.lastPulledAt,
    checkpoint.lastPushedAt,
    now,
    now
  );
}

async function applyRemoteRowsForUser<TTable extends SyncTableName>(
  _userId: string,
  tableName: TTable,
  rows: Database['public']['Tables'][TTable]['Row'][]
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const db = await getDbAsync();
  let appliedCount = 0;

  for (const row of rows) {
    switch (tableName) {
      case 'profiles': {
        const profile = row as Database['public']['Tables']['profiles']['Row'];
        await db.runAsync(
          `INSERT INTO profiles (id, user_id, email, currency, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             user_id = excluded.user_id,
             email = excluded.email,
             currency = excluded.currency,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at
           WHERE excluded.updated_at >= profiles.updated_at`,
          profile.id,
          profile.user_id,
          profile.email,
          profile.currency,
          profile.created_at,
          profile.updated_at,
          profile.deleted_at
        );
        appliedCount += 1;
        break;
      }
      case 'categories': {
        const category = row as Database['public']['Tables']['categories']['Row'];
        await db.runAsync(
          `INSERT INTO categories (id, user_id, name, color, icon, is_default, is_archived, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             user_id = excluded.user_id,
             name = excluded.name,
             color = excluded.color,
             icon = excluded.icon,
             is_default = excluded.is_default,
             is_archived = excluded.is_archived,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at
           WHERE excluded.updated_at >= categories.updated_at`,
          category.id,
          category.user_id,
          category.name,
          category.color,
          category.icon,
          category.is_default ? 1 : 0,
          category.is_archived ? 1 : 0,
          category.created_at,
          category.updated_at,
          category.deleted_at
        );
        appliedCount += 1;
        break;
      }
      case 'transactions': {
        const transaction = row as Database['public']['Tables']['transactions']['Row'];
        await db.runAsync(
          `INSERT INTO transactions (id, user_id, type, amount_cents, occurred_at, category_id, payment_method, note, recurrence_rule_id, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             user_id = excluded.user_id,
             type = excluded.type,
             amount_cents = excluded.amount_cents,
             occurred_at = excluded.occurred_at,
             category_id = excluded.category_id,
             payment_method = excluded.payment_method,
             note = excluded.note,
             recurrence_rule_id = excluded.recurrence_rule_id,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at
           WHERE excluded.updated_at >= transactions.updated_at`,
          transaction.id,
          transaction.user_id,
          transaction.transaction_type,
          transaction.amount_cents,
          transaction.occurred_at,
          transaction.category_id,
          transaction.payment_method,
          transaction.note,
          transaction.recurrence_rule_id,
          transaction.created_at,
          transaction.updated_at,
          transaction.deleted_at
        );
        appliedCount += 1;
        break;
      }
      case 'budgets': {
        const budget = row as Database['public']['Tables']['budgets']['Row'];
        await db.runAsync(
          `INSERT INTO budgets (id, user_id, period, amount_cents, category_id, start_date, end_date, alert_at_80_percent, alert_at_100_percent, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             user_id = excluded.user_id,
             period = excluded.period,
             amount_cents = excluded.amount_cents,
             category_id = excluded.category_id,
             start_date = excluded.start_date,
             end_date = excluded.end_date,
             alert_at_80_percent = excluded.alert_at_80_percent,
             alert_at_100_percent = excluded.alert_at_100_percent,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at
           WHERE excluded.updated_at >= budgets.updated_at`,
          budget.id,
          budget.user_id,
          budget.budget_period,
          budget.amount_cents,
          budget.category_id,
          budget.start_date,
          budget.end_date,
          budget.alert_at_80_percent ? 1 : 0,
          budget.alert_at_100_percent ? 1 : 0,
          budget.created_at,
          budget.updated_at,
          budget.deleted_at
        );
        appliedCount += 1;
        break;
      }
      case 'recurrence_rules': {
        const rule = row as Database['public']['Tables']['recurrence_rules']['Row'];
        await db.runAsync(
          `INSERT INTO recurrence_rules (id, user_id, frequency, interval, by_month_day, next_run_at, end_at, template_note, template_amount_cents, template_category_id, template_payment_method, template_type, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             user_id = excluded.user_id,
             frequency = excluded.frequency,
             interval = excluded.interval,
             by_month_day = excluded.by_month_day,
             next_run_at = excluded.next_run_at,
             end_at = excluded.end_at,
             template_note = excluded.template_note,
             template_amount_cents = excluded.template_amount_cents,
             template_category_id = excluded.template_category_id,
             template_payment_method = excluded.template_payment_method,
             template_type = excluded.template_type,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at,
             deleted_at = excluded.deleted_at
           WHERE excluded.updated_at >= recurrence_rules.updated_at`,
          rule.id,
          rule.user_id,
          rule.frequency,
          rule.interval,
          rule.by_month_day,
          rule.next_run_at,
          rule.end_at,
          rule.template_note,
          rule.template_amount_cents,
          rule.template_category_id,
          rule.template_payment_method,
          rule.template_transaction_type,
          rule.created_at,
          rule.updated_at,
          rule.deleted_at
        );
        appliedCount += 1;
        break;
      }
      default:
        break;
    }
  }

  return appliedCount;
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
    getPendingMutations: (limit) => getPendingMutationsForUser(scopedUserId, limit),
    markMutationComplete: (mutationId) => markMutationCompleteForUser(scopedUserId, mutationId),
    markMutationFailed: (mutationId, reason) => markMutationFailedForUser(scopedUserId, mutationId, reason),
    updatePendingMutationPayload: (mutationId, rowId, payloadJson) =>
      updatePendingMutationPayloadForUser(scopedUserId, mutationId, rowId, payloadJson),
    replaceTransactionId: (oldTransactionId, newTransactionId) =>
      replaceTransactionIdForUser(scopedUserId, oldTransactionId, newTransactionId),
    updateTransactionCategory: (transactionId, categoryId) =>
      updateTransactionCategoryForUser(scopedUserId, transactionId, categoryId),
    getCheckpoint: () => getCheckpointForUser(scopedUserId),
    saveCheckpoint: (checkpoint) => saveCheckpointForUser(scopedUserId, checkpoint),
    applyRemoteRows: (tableName, rows) => applyRemoteRowsForUser(scopedUserId, tableName, rows),
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
