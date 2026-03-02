export type TransactionType = 'expense' | 'income';
export type PaymentMethod = 'cash' | 'card' | 'bank';
export type BudgetPeriod = 'monthly' | 'yearly';
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          currency: 'AUD';
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          currency?: 'AUD';
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          currency?: 'AUD';
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string | null;
          is_default: boolean;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          icon?: string | null;
          is_default?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          icon?: string | null;
          is_default?: boolean;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      recurrence_rules: {
        Row: {
          id: string;
          user_id: string;
          frequency: RecurrenceFrequency;
          interval: number;
          by_month_day: number | null;
          next_run_at: string;
          end_at: string | null;
          template_note: string | null;
          template_amount_cents: number;
          template_category_id: string | null;
          template_payment_method: PaymentMethod;
          template_transaction_type: TransactionType;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          frequency: RecurrenceFrequency;
          interval: number;
          by_month_day?: number | null;
          next_run_at: string;
          end_at?: string | null;
          template_note?: string | null;
          template_amount_cents: number;
          template_category_id?: string | null;
          template_payment_method: PaymentMethod;
          template_transaction_type: TransactionType;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          frequency?: RecurrenceFrequency;
          interval?: number;
          by_month_day?: number | null;
          next_run_at?: string;
          end_at?: string | null;
          template_note?: string | null;
          template_amount_cents?: number;
          template_category_id?: string | null;
          template_payment_method?: PaymentMethod;
          template_transaction_type?: TransactionType;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: TransactionType;
          amount_cents: number;
          occurred_at: string;
          category_id: string | null;
          payment_method: PaymentMethod;
          note: string | null;
          recurrence_rule_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_type: TransactionType;
          amount_cents: number;
          occurred_at: string;
          category_id?: string | null;
          payment_method: PaymentMethod;
          note?: string | null;
          recurrence_rule_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_type?: TransactionType;
          amount_cents?: number;
          occurred_at?: string;
          category_id?: string | null;
          payment_method?: PaymentMethod;
          note?: string | null;
          recurrence_rule_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          budget_period: BudgetPeriod;
          amount_cents: number;
          category_id: string | null;
          start_date: string;
          end_date: string;
          alert_at_80_percent: boolean;
          alert_at_100_percent: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          budget_period: BudgetPeriod;
          amount_cents: number;
          category_id?: string | null;
          start_date: string;
          end_date: string;
          alert_at_80_percent?: boolean;
          alert_at_100_percent?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          budget_period?: BudgetPeriod;
          amount_cents?: number;
          category_id?: string | null;
          start_date?: string;
          end_date?: string;
          alert_at_80_percent?: boolean;
          alert_at_100_percent?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
    };
  };
}
