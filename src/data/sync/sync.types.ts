import type { OutboxMutation, SyncCheckpoint, SyncStatus } from '@/src/shared/types';

export interface SyncDependencies {
  getPendingMutations: () => Promise<OutboxMutation[]>;
  markMutationComplete: (mutationId: string) => Promise<void>;
  markMutationFailed: (mutationId: string, reason: string) => Promise<void>;
  getCheckpoint: () => Promise<SyncCheckpoint | null>;
  saveCheckpoint: (checkpoint: SyncCheckpoint) => Promise<void>;
}

export interface SyncResult {
  pushedCount: number;
  pulledCount: number;
  status: SyncStatus;
}
