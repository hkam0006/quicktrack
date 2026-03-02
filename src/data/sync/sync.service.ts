import type { PostgrestError } from '@supabase/supabase-js';

import { createLocalDataRepository } from '@/src/data/local/database';
import { notifyLocalDataChanged } from '@/src/data/local/events';
import { supabase } from '@/src/data/remote/supabase.client';
import type { Database } from '@/src/data/remote/supabase.types';
import type {
  OutboxMutation,
  SyncCheckpoint,
  SyncErrorType,
  SyncStatus,
  SyncTableName,
} from '@/src/shared/types';

const SYNC_TABLES: SyncTableName[] = [
  'profiles',
  'categories',
  'transactions',
  'budgets',
  'recurrence_rules',
];

type RemoteRow =
  | Database['public']['Tables']['profiles']['Row']
  | Database['public']['Tables']['categories']['Row']
  | Database['public']['Tables']['transactions']['Row']
  | Database['public']['Tables']['budgets']['Row']
  | Database['public']['Tables']['recurrence_rules']['Row'];

const INITIAL_STATUS: SyncStatus = {
  isSyncing: false,
  pendingMutations: 0,
  lastSuccessfulSyncAt: null,
  lastErrorType: null,
  lastErrorMessage: null,
};

let syncStatus: SyncStatus = INITIAL_STATUS;
let inFlightSync: Promise<void> | null = null;
const statusListeners = new Set<(status: SyncStatus) => void>();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function setSyncStatus(patch: Partial<SyncStatus>) {
  syncStatus = {
    ...syncStatus,
    ...patch,
  };

  for (const listener of statusListeners) {
    listener(syncStatus);
  }
}

function mapSyncErrorType(error: unknown): SyncErrorType {
  if (typeof error !== 'object' || error === null) {
    return 'unknown';
  }

  const maybeError = error as { message?: string; code?: string };
  const message = (maybeError.message ?? '').toLowerCase();

  if (message.includes('network') || message.includes('failed to fetch')) {
    return 'network';
  }

  if (message.includes('jwt') || message.includes('auth') || maybeError.code === '401') {
    return 'auth';
  }

  if (message.includes('conflict')) {
    return 'sync-conflict';
  }

  if (message.includes('invalid') || message.includes('validation')) {
    return 'validation';
  }

  return 'unknown';
}

function toErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return 'Sync failed with an unknown error.';
}

function parseOutboxPayload(mutation: OutboxMutation): Record<string, unknown> {
  try {
    return JSON.parse(mutation.payloadJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function makeUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const next = char === 'x' ? random : (random & 0x3) | 0x8;
    return next.toString(16);
  });
}

function isCategoryForeignKeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { message?: string; code?: string; details?: string };
  const haystack = `${maybeError.message ?? ''} ${maybeError.details ?? ''}`.toLowerCase();

  return maybeError.code === '23503' || (haystack.includes('foreign key') && haystack.includes('category'));
}

async function normalizeTransactionMutation(
  userId: string,
  mutation: OutboxMutation,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const repository = createLocalDataRepository(userId);
  const normalizedPayload = { ...payload };
  let didChange = false;

  const payloadId = normalizedPayload.id;
  if (!isUuid(payloadId)) {
    const replacementId = makeUuid();
    await repository.replaceTransactionId(String(payloadId ?? mutation.rowId), replacementId);
    normalizedPayload.id = replacementId;
    didChange = true;
  }

  const categoryId = normalizedPayload.category_id;
  if (categoryId != null && !isUuid(categoryId)) {
    normalizedPayload.category_id = null;
    didChange = true;
  }

  if (didChange) {
    const rowId = String(normalizedPayload.id);
    await repository.updatePendingMutationPayload(mutation.id, rowId, JSON.stringify(normalizedPayload));
  }

  return normalizedPayload;
}

async function retryTransactionWithoutCategory(
  userId: string,
  mutation: OutboxMutation,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const repository = createLocalDataRepository(userId);
  const transactionId = String(payload.id ?? mutation.rowId);
  const retriedPayload = {
    ...payload,
    category_id: null,
  };

  await repository.updateTransactionCategory(transactionId, null);
  await repository.updatePendingMutationPayload(mutation.id, transactionId, JSON.stringify(retriedPayload));

  return retriedPayload;
}

async function pushMutationToRemote(userId: string, mutation: OutboxMutation, payload: Record<string, unknown>): Promise<void> {
  const normalizedPayload =
    mutation.tableName === 'transactions'
      ? await normalizeTransactionMutation(userId, mutation, payload)
      : payload;

  switch (mutation.tableName) {
    case 'profiles': {
      const { error } = await supabase.from('profiles' as never).upsert(normalizedPayload as never, {
        onConflict: 'id',
      });
      if (error) throw error;
      return;
    }
    case 'categories': {
      const { error } = await supabase.from('categories' as never).upsert(normalizedPayload as never, {
          onConflict: 'id',
        });
      if (error) throw error;
      return;
    }
    case 'transactions': {
      const { error } = await supabase.from('transactions' as never).upsert(normalizedPayload as never, {
          onConflict: 'id',
        });
      if (error) throw error;
      return;
    }
    case 'budgets': {
      const { error } = await supabase.from('budgets' as never).upsert(normalizedPayload as never, {
        onConflict: 'id',
      });
      if (error) throw error;
      return;
    }
    case 'recurrence_rules': {
      const { error } = await supabase.from('recurrence_rules' as never).upsert(normalizedPayload as never, {
          onConflict: 'id',
        });
      if (error) throw error;
      return;
    }
    default:
      return;
  }
}

async function pushOutbox(userId: string): Promise<number> {
  const repository = createLocalDataRepository(userId);
  const pending = await repository.getPendingMutations(500);

  if (pending.length === 0) {
    setSyncStatus({ pendingMutations: 0 });
    return 0;
  }

  setSyncStatus({ pendingMutations: pending.length });

  let pushedCount = 0;

  for (const mutation of pending) {
    try {
      const payload = parseOutboxPayload(mutation);
      await pushMutationToRemote(userId, mutation, payload);
      await repository.markMutationComplete(mutation.id);
      pushedCount += 1;
    } catch (error) {
      if (mutation.tableName === 'transactions' && isCategoryForeignKeyError(error)) {
        try {
          const payload = parseOutboxPayload(mutation);
          const retryPayload = await retryTransactionWithoutCategory(userId, mutation, payload);
          await pushMutationToRemote(userId, mutation, retryPayload);
          await repository.markMutationComplete(mutation.id);
          pushedCount += 1;
          continue;
        } catch (retryError) {
          await repository.markMutationFailed(mutation.id, toErrorMessage(retryError));
          continue;
        }
      }

      await repository.markMutationFailed(mutation.id, toErrorMessage(error));
    }
  }

  const remaining = await repository.getPendingMutations(500);
  setSyncStatus({ pendingMutations: remaining.length });

  return pushedCount;
}

async function pullRowsFromTable(userId: string, tableName: SyncTableName, since: string): Promise<RemoteRow[]> {
  switch (tableName) {
    case 'profiles': {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
        .limit(1000);

      if (error) throw error;
      return (data ?? []) as RemoteRow[];
    }
    case 'categories': {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
        .limit(1000);

      if (error) throw error;
      return (data ?? []) as RemoteRow[];
    }
    case 'transactions': {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
        .limit(1000);

      if (error) throw error;
      return (data ?? []) as RemoteRow[];
    }
    case 'budgets': {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
        .limit(1000);

      if (error) throw error;
      return (data ?? []) as RemoteRow[];
    }
    case 'recurrence_rules': {
      const { data, error } = await supabase
        .from('recurrence_rules')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
        .limit(1000);

      if (error) throw error;
      return (data ?? []) as RemoteRow[];
    }
    default:
      return [];
  }
}

function nextCheckpointFromRows(
  checkpoint: SyncCheckpoint,
  pushedAt: string | null,
  pulledAtCandidates: string[]
): SyncCheckpoint {
  const latestPull = pulledAtCandidates.length > 0 ? pulledAtCandidates.sort().at(-1) ?? null : checkpoint.lastPulledAt;

  return {
    id: checkpoint.id,
    lastPulledAt: latestPull,
    lastPushedAt: pushedAt ?? checkpoint.lastPushedAt,
  };
}

async function pullRemoteChanges(userId: string, checkpoint: SyncCheckpoint): Promise<number> {
  const repository = createLocalDataRepository(userId);
  const since = checkpoint.lastPulledAt ?? '1970-01-01T00:00:00.000Z';

  let pulledCount = 0;
  const pulledUpdatedAt: string[] = [];

  for (const tableName of SYNC_TABLES) {
    const rows = await pullRowsFromTable(userId, tableName, since);
    if (rows.length === 0) {
      continue;
    }

    const applied = await repository.applyRemoteRows(tableName, rows as never[]);
    pulledCount += applied;

    for (const row of rows) {
      if (row.updated_at) {
        pulledUpdatedAt.push(row.updated_at);
      }
    }
  }

  if (pulledCount > 0) {
    notifyLocalDataChanged();
  }

  const nextCheckpoint = nextCheckpointFromRows(checkpoint, null, pulledUpdatedAt);
  await repository.saveCheckpoint(nextCheckpoint);

  return pulledCount;
}

async function getOrCreateCheckpoint(userId: string): Promise<SyncCheckpoint> {
  const repository = createLocalDataRepository(userId);
  const existing = await repository.getCheckpoint();
  if (existing) {
    return existing;
  }

  const newCheckpoint: SyncCheckpoint = {
    id: `checkpoint-${userId}`,
    lastPulledAt: null,
    lastPushedAt: null,
  };

  await repository.saveCheckpoint(newCheckpoint);
  return newCheckpoint;
}

function isPostgrestError(error: unknown): error is PostgrestError {
  return Boolean(error && typeof error === 'object' && 'message' in error && 'code' in error);
}

export async function runSyncOnce(userId: string): Promise<void> {
  const repository = createLocalDataRepository(userId);
  await repository.initLocalDatabase();

  const checkpoint = await getOrCreateCheckpoint(userId);
  const pushedAt = new Date().toISOString();

  const pushedCount = await pushOutbox(userId);

  if (pushedCount > 0) {
    await repository.saveCheckpoint({
      ...checkpoint,
      lastPushedAt: pushedAt,
    });
  }

  await pullRemoteChanges(userId, {
    ...checkpoint,
    lastPushedAt: pushedCount > 0 ? pushedAt : checkpoint.lastPushedAt,
  });
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  statusListeners.add(listener);
  listener(syncStatus);

  return () => {
    statusListeners.delete(listener);
  };
}

export function getSyncStatusSnapshot(): SyncStatus {
  return syncStatus;
}

export async function triggerSyncNow(userId: string): Promise<void> {
  if (inFlightSync) {
    return inFlightSync;
  }

  const execute = (async () => {
    setSyncStatus({ isSyncing: true, lastErrorType: null, lastErrorMessage: null });

    try {
      await runSyncOnce(userId);
      setSyncStatus({
        isSyncing: false,
        lastSuccessfulSyncAt: new Date().toISOString(),
        lastErrorType: null,
        lastErrorMessage: null,
      });
    } catch (error) {
      setSyncStatus({
        isSyncing: false,
        lastErrorType: mapSyncErrorType(error),
        lastErrorMessage: toErrorMessage(error),
      });

      if (isPostgrestError(error)) {
        throw new Error(error.message);
      }

      throw error;
    } finally {
      inFlightSync = null;
    }
  })();

  inFlightSync = execute;
  return execute;
}
