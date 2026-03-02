-- MVP schema for Supabase Auth + RLS
-- Phase 1 checklist coverage:
-- T1.1 tables, T1.2 enums/constraints, T1.3 RLS, T1.4 policies, T1.5 updated_at trigger, T1.6 profile bootstrap trigger

create extension if not exists pgcrypto;

-- Explicit enumerations for MVP
create type public.transaction_type as enum ('expense', 'income');
create type public.payment_method as enum ('cash', 'card', 'bank');
create type public.budget_period as enum ('monthly', 'yearly');
create type public.recurrence_frequency as enum ('weekly', 'monthly', 'yearly');

-- Shared updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  currency text not null default 'AUD' check (currency = 'AUD'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  icon text,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique (user_id, name)
);

create table public.recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  frequency public.recurrence_frequency not null,
  interval integer not null check (interval > 0),
  by_month_day integer check (by_month_day is null or (by_month_day between 1 and 31)),
  next_run_at timestamptz not null,
  end_at timestamptz,
  template_note text,
  template_amount_cents integer not null check (template_amount_cents >= 0),
  template_category_id uuid references public.categories(id) on delete set null,
  template_payment_method public.payment_method not null,
  template_transaction_type public.transaction_type not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type public.transaction_type not null,
  amount_cents integer not null check (amount_cents >= 0),
  occurred_at timestamptz not null,
  category_id uuid references public.categories(id) on delete set null,
  payment_method public.payment_method not null,
  note text,
  recurrence_rule_id uuid references public.recurrence_rules(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_period public.budget_period not null,
  amount_cents integer not null check (amount_cents >= 0),
  category_id uuid references public.categories(id) on delete set null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  alert_at_80_percent boolean not null default true,
  alert_at_100_percent boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  check (end_date >= start_date)
);

create index idx_profiles_user_id on public.profiles (user_id);
create index idx_categories_user_id_deleted_at on public.categories (user_id, deleted_at);
create index idx_transactions_user_id_occurred_at on public.transactions (user_id, occurred_at desc);
create index idx_transactions_user_id_updated_at on public.transactions (user_id, updated_at desc);
create index idx_budgets_user_id_period on public.budgets (user_id, budget_period);
create index idx_budgets_user_id_updated_at on public.budgets (user_id, updated_at desc);
create index idx_recurrence_rules_user_id_updated_at on public.recurrence_rules (user_id, updated_at desc);

-- Keep updated_at in sync for all user-owned tables
create trigger set_updated_at_profiles
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_updated_at_categories
before update on public.categories
for each row
execute function public.set_updated_at();

create trigger set_updated_at_transactions
before update on public.transactions
for each row
execute function public.set_updated_at();

create trigger set_updated_at_budgets
before update on public.budgets
for each row
execute function public.set_updated_at();

create trigger set_updated_at_recurrence_rules
before update on public.recurrence_rules
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.recurrence_rules enable row level security;

-- Ownership policies: only the signed-in user can access their rows
create policy "profiles_select_own" on public.profiles
for select
using (auth.uid() = user_id);

create policy "profiles_insert_own" on public.profiles
for insert
with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "profiles_delete_own" on public.profiles
for delete
using (auth.uid() = user_id);

create policy "categories_select_own" on public.categories
for select
using (auth.uid() = user_id);

create policy "categories_insert_own" on public.categories
for insert
with check (auth.uid() = user_id);

create policy "categories_update_own" on public.categories
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "categories_delete_own" on public.categories
for delete
using (auth.uid() = user_id);

create policy "transactions_select_own" on public.transactions
for select
using (auth.uid() = user_id);

create policy "transactions_insert_own" on public.transactions
for insert
with check (auth.uid() = user_id);

create policy "transactions_update_own" on public.transactions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "transactions_delete_own" on public.transactions
for delete
using (auth.uid() = user_id);

create policy "budgets_select_own" on public.budgets
for select
using (auth.uid() = user_id);

create policy "budgets_insert_own" on public.budgets
for insert
with check (auth.uid() = user_id);

create policy "budgets_update_own" on public.budgets
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "budgets_delete_own" on public.budgets
for delete
using (auth.uid() = user_id);

create policy "recurrence_rules_select_own" on public.recurrence_rules
for select
using (auth.uid() = user_id);

create policy "recurrence_rules_insert_own" on public.recurrence_rules
for insert
with check (auth.uid() = user_id);

create policy "recurrence_rules_update_own" on public.recurrence_rules
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "recurrence_rules_delete_own" on public.recurrence_rules
for delete
using (auth.uid() = user_id);

-- Profile bootstrap for new auth users
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, currency)
  values (new.id, coalesce(new.email, ''), 'AUD')
  on conflict (user_id) do update
    set email = excluded.email,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
