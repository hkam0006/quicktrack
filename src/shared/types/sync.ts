import type { ISODateString, UUID } from './primitives';

export type SyncTableName =
  | 'profiles'
  | 'categories'
  | 'transactions'
  | 'budgets'
  | 'recurrence_rules';

export type SyncOperation = 'create' | 'update' | 'delete';

export type SyncErrorType =
  | 'validation'
  | 'network'
  | 'auth'
  | 'sync-conflict'
  | 'unknown';

export interface OutboxMutation {
  id: UUID;
  tableName: SyncTableName;
  operation: SyncOperation;
  rowId: UUID;
  payloadJson: string;
  createdAt: ISODateString;
  retryCount: number;
  lastError: string | null;
}

export interface SyncCheckpoint {
  id: UUID;
  lastPulledAt: ISODateString | null;
  lastPushedAt: ISODateString | null;
}

export interface SyncStatus {
  isSyncing: boolean;
  pendingMutations: number;
  lastSuccessfulSyncAt: ISODateString | null;
  lastErrorType: SyncErrorType | null;
  lastErrorMessage: string | null;
}
