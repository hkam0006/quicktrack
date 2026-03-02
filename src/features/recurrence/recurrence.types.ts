import type { RecurrenceFrequency, UUID } from '@/src/shared/types';

export interface RecurrenceDraft {
  frequency: RecurrenceFrequency;
  interval: number;
  byMonthDay: number | null;
  endAt: string | null;
  categoryId: UUID | null;
}
