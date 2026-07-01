-- =========================================================
-- VOYA METAS - Schema do banco de dados (Supabase / Postgres)
-- Etapa 1 de 7
-- =========================================================
-- Execute este arquivo inteiro no SQL Editor do Supabase
-- (Project > SQL Editor > New query > cole tudo > Run)
-- =========================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- =========================================================
-- 1. PROFESSIONALS
-- =========================================================
create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 2. PROFILES (substitui a tabela "users" do documento)
-- Cada linha corresponde a 1 usuário do Supabase Auth (auth.users)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('master','profissional')),
  professional_id uuid references public.professionals(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 3. MONTHLY_GOALS
-- =========================================================
create table if not exists public.monthly_goals (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null check (year between 2020 and 2100),
  initial_goal numeric(12,2) not null default 0,
  general_goal numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (professional_id, month, year)
);

-- =========================================================
-- 4. GOAL_PROGRESS
-- =========================================================
create table if not exists public.goal_progress (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null check (year between 2020 and 2100),
  amount_done numeric(12,2) not null default 0,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (professional_id, month, year)
);

-- =========================================================
-- 5. MONTH_LOCKS
-- =========================================================
create table if not exists public.month_locks (
  id uuid primary key default gen_random_uuid(),
  month int not null check (month between 1 and 12),
  year int not null check (year between 2020 and 2100),
  is_unlocked boolean not null default false,
  unlocked_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, year)
);

-- =========================================================
-- 6. CHANGE_HISTORY
-- =========================================================
create table if not exists public.change_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- FUNÇÃO AUXILIAR: verifica se o usuário logado é master
-- (usada dentro das policies de RLS)
-- =========================================================
create or replace function public.is_master()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'master'
  );
$$;

-- Retorna o professional_id do usuário logado (null se for master)
create or replace function public.my_professional_id()
returns uuid
language sql
security definer
stable
as $$
  select professional_id from public.profiles where id = auth.uid();
$$;

-- =========================================================
-- TRIGGER: cria automaticamente um profile quando um usuário
-- é criado no Supabase Auth (via metadata passada no signUp)
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, name, email, role, professional_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'profissional'),
    nullif(new.raw_user_meta_data->>'professional_id','')::uuid
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- TRIGGERS: updated_at automático
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_monthly_goals_updated on public.monthly_goals;
create trigger trg_monthly_goals_updated before update on public.monthly_goals
  for each row execute function public.set_updated_at();

drop trigger if exists trg_goal_progress_updated on public.goal_progress;
create trigger trg_goal_progress_updated before update on public.goal_progress
  for each row execute function public.set_updated_at();

drop trigger if exists trg_month_locks_updated on public.month_locks;
create trigger trg_month_locks_updated before update on public.month_locks
  for each row execute function public.set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.professionals enable row level security;
alter table public.profiles enable row level security;
alter table public.monthly_goals enable row level security;
alter table public.goal_progress enable row level security;
alter table public.month_locks enable row level security;
alter table public.change_history enable row level security;

-- ---------- professionals ----------
drop policy if exists "master full access professionals" on public.professionals;
create policy "master full access professionals" on public.professionals
  for all using (public.is_master()) with check (public.is_master());

drop policy if exists "professional reads own row" on public.professionals;
create policy "professional reads own row" on public.professionals
  for select using (id = public.my_professional_id());

-- ---------- profiles ----------
drop policy if exists "master full access profiles" on public.profiles;
create policy "master full access profiles" on public.profiles
  for all using (public.is_master()) with check (public.is_master());

drop policy if exists "user reads own profile" on public.profiles;
create policy "user reads own profile" on public.profiles
  for select using (id = auth.uid());

-- ---------- monthly_goals ----------
drop policy if exists "master full access goals" on public.monthly_goals;
create policy "master full access goals" on public.monthly_goals
  for all using (public.is_master()) with check (public.is_master());

drop policy if exists "professional reads own goals" on public.monthly_goals;
create policy "professional reads own goals" on public.monthly_goals
  for select using (professional_id = public.my_professional_id());

-- ---------- goal_progress ----------
drop policy if exists "master full access progress" on public.goal_progress;
create policy "master full access progress" on public.goal_progress
  for all using (public.is_master()) with check (public.is_master());

drop policy if exists "professional reads own progress" on public.goal_progress;
create policy "professional reads own progress" on public.goal_progress
  for select using (professional_id = public.my_professional_id());

-- profissional só pode ATUALIZAR o próprio valor realizado,
-- e apenas se o mês estiver desbloqueado
drop policy if exists "professional updates own progress if unlocked" on public.goal_progress;
create policy "professional updates own progress if unlocked" on public.goal_progress
  for update using (
    professional_id = public.my_professional_id()
    and exists (
      select 1 from public.month_locks ml
      where ml.month = goal_progress.month
        and ml.year = goal_progress.year
        and ml.is_unlocked = true
    )
  )
  with check (
    professional_id = public.my_professional_id()
  );

-- ---------- month_locks ----------
drop policy if exists "master full access locks" on public.month_locks;
create policy "master full access locks" on public.month_locks
  for all using (public.is_master()) with check (public.is_master());

drop policy if exists "everyone reads locks" on public.month_locks;
create policy "everyone reads locks" on public.month_locks
  for select using (auth.uid() is not null);

-- ---------- change_history ----------
drop policy if exists "master reads history" on public.change_history;
create policy "master reads history" on public.change_history
  for select using (public.is_master());

drop policy if exists "authenticated inserts history" on public.change_history;
create policy "authenticated inserts history" on public.change_history
  for insert with check (auth.uid() is not null);

-- =========================================================
-- FIM DO SCHEMA
-- =========================================================
