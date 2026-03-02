import type { UUID } from '@/src/shared/types';

export interface CategoryDraft {
  name: string;
  color: string;
  icon: string;
}

export interface MergeCategoryPayload {
  sourceCategoryId: UUID;
  destinationCategoryId: UUID;
}
