import type { ISODateString, PaymentMethod, Transaction, TransactionType, UUID } from '@/src/shared/types';

export interface TransactionDraft {
  type: TransactionType;
  amountInput: string;
  categoryId: UUID | null;
  occurredAt: ISODateString;
  paymentMethod: PaymentMethod;
  note: string;
}

export interface TransactionFilters {
  query: string;
  categoryId: UUID | null;
  fromDate: ISODateString | null;
  toDate: ISODateString | null;
  minAmountInput: string;
  maxAmountInput: string;
}

export interface TransactionListState {
  filters: TransactionFilters;
  items: Transaction[];
}
