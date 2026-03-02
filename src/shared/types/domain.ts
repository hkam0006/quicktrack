import type { Cents, ISODateString, UUID } from './primitives';

export type TransactionType = 'expense' | 'income';
export type PaymentMethod = 'cash' | 'card' | 'bank';
export type BudgetPeriod = 'monthly' | 'yearly';
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';

export interface BaseEntity {
  id: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt: ISODateString | null;
}

export interface UserProfile extends BaseEntity {
  userId: UUID;
  email: string;
  currency: 'AUD';
}

export interface Category extends BaseEntity {
  userId: UUID;
  name: string;
  color: string;
  icon: string | null;
  isDefault: boolean;
  isArchived: boolean;
}

export interface RecurrenceRule extends BaseEntity {
  userId: UUID;
  frequency: RecurrenceFrequency;
  interval: number;
  byMonthDay: number | null;
  nextRunAt: ISODateString;
  endAt: ISODateString | null;
  templateNote: string | null;
  templateAmountCents: Cents;
  templateCategoryId: UUID | null;
  templatePaymentMethod: PaymentMethod;
  templateType: TransactionType;
}

export interface Transaction extends BaseEntity {
  userId: UUID;
  type: TransactionType;
  amountCents: Cents;
  occurredAt: ISODateString;
  categoryId: UUID | null;
  paymentMethod: PaymentMethod;
  note: string | null;
  recurrenceRuleId: UUID | null;
}

export interface Budget extends BaseEntity {
  userId: UUID;
  period: BudgetPeriod;
  amountCents: Cents;
  categoryId: UUID | null;
  startDate: ISODateString;
  endDate: ISODateString;
  alertAt80Percent: boolean;
  alertAt100Percent: boolean;
}
