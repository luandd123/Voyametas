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

-- profissional também precisa poder INSERIR (primeiro lançamento do mês faz
-- o upsert virar um INSERT puro, já que ainda não existe linha) — mesma regra
-- do UPDATE: só na própria linha e só com o mês desbloqueado.
drop policy if exists "professional inserts own progress if unlocked" on public.goal_progress;
create policy "professional inserts own progress if unlocked" on public.goal_progress
  for insert
  with check (
    professional_id = public.my_professional_id()
    and exists (
      select 1 from public.month_locks ml
      where ml.month = goal_progress.month
        and ml.year = goal_progress.year
        and ml.is_unlocked = true
    )
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

-- (conteúdo da migração 003, incorporado ao schema base para instalações novas)

-- ---------------------------------------------------------
-- 1. Preferência de tema por usuário
-- ---------------------------------------------------------
alter table public.profiles add column if not exists theme text not null default 'light';
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check check (theme in ('light','dark'));

-- Função dedicada em vez de política de UPDATE ampla em profiles:
-- assim o usuário só consegue alterar o próprio tema, nada mais.
create or replace function public.set_my_theme(p_theme text)
returns void
language plpgsql
security definer
as $$
begin
  if p_theme not in ('light','dark') then
    raise exception 'invalid theme value';
  end if;
  update public.profiles set theme = p_theme where id = auth.uid();
end;
$$;
grant execute on function public.set_my_theme(text) to authenticated;

-- ---------------------------------------------------------
-- 2. daily_entries — lançamentos diários (fonte principal dos valores)
-- ---------------------------------------------------------
create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  entry_date date not null,
  month int generated always as (extract(month from entry_date)::int) stored,
  year int generated always as (extract(year from entry_date)::int) stored,
  amount numeric(12,2) not null default 0,
  observation text,
  created_by uuid references public.profiles(id),
  created_by_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (professional_id, entry_date)
);

create index if not exists idx_daily_entries_prof_month
  on public.daily_entries (professional_id, month, year);

drop trigger if exists trg_daily_entries_updated on public.daily_entries;
create trigger trg_daily_entries_updated before update on public.daily_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 3. professional_work_days — apenas EXCEÇÕES ao padrão
--    (padrão: domingo e segunda bloqueados; todo o resto liberado)
-- ---------------------------------------------------------
create table if not exists public.professional_work_days (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  work_date date not null,
  is_working_day boolean not null,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (professional_id, work_date)
);

drop trigger if exists trg_work_days_updated on public.professional_work_days;
create trigger trg_work_days_updated before update on public.professional_work_days
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 4. Sincroniza goal_progress (cache) a partir da soma dos lançamentos diários
-- ---------------------------------------------------------
create or replace function public.sync_goal_progress()
returns trigger
language plpgsql
security definer
as $$
declare
  v_professional_id uuid;
  v_month int;
  v_year int;
  v_total numeric;
begin
  if (tg_op = 'DELETE') then
    v_professional_id := old.professional_id;
    v_month := old.month;
    v_year := old.year;
  else
    v_professional_id := new.professional_id;
    v_month := new.month;
    v_year := new.year;
  end if;

  select coalesce(sum(amount), 0) into v_total
  from public.daily_entries
  where professional_id = v_professional_id and month = v_month and year = v_year;

  insert into public.goal_progress (professional_id, month, year, amount_done, updated_by)
  values (v_professional_id, v_month, v_year, v_total, auth.uid())
  on conflict (professional_id, month, year)
  do update set amount_done = excluded.amount_done, updated_by = excluded.updated_by, updated_at = now();

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_goal_progress on public.daily_entries;
create trigger trg_sync_goal_progress
  after insert or update or delete on public.daily_entries
  for each row execute function public.sync_goal_progress();

-- ---------------------------------------------------------
-- 5. Histórico automático — lançamentos diários
-- ---------------------------------------------------------
create or replace function public.log_daily_entry_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.change_history (user_id, action, entity_type, entity_id, previous_value, new_value)
    values (
      auth.uid(), 'create_entry', 'daily_entry', new.id, null,
      jsonb_build_object('professional_id', new.professional_id, 'date', new.entry_date, 'amount', new.amount)
    );
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.change_history (user_id, action, entity_type, entity_id, previous_value, new_value)
    values (
      auth.uid(), 'update_entry', 'daily_entry', new.id,
      jsonb_build_object('amount', old.amount, 'date', old.entry_date),
      jsonb_build_object('amount', new.amount, 'date', new.entry_date)
    );
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.change_history (user_id, action, entity_type, entity_id, previous_value, new_value)
    values (
      auth.uid(), 'delete_entry', 'daily_entry', old.id,
      jsonb_build_object('professional_id', old.professional_id, 'date', old.entry_date, 'amount', old.amount),
      null
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_log_daily_entry on public.daily_entries;
create trigger trg_log_daily_entry
  after insert or update or delete on public.daily_entries
  for each row execute function public.log_daily_entry_change();

-- ---------------------------------------------------------
-- 6. Histórico automático — bloqueio/liberação de dias
-- ---------------------------------------------------------
create or replace function public.log_work_day_change()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.change_history (user_id, action, entity_type, entity_id, previous_value, new_value)
  values (
    auth.uid(),
    case when new.is_working_day then 'unlock_day' else 'lock_day' end,
    'work_day',
    new.id,
    null,
    jsonb_build_object('professional_id', new.professional_id, 'date', new.work_date, 'is_working_day', new.is_working_day)
  );
  return new;
end;
$$;

drop trigger if exists trg_log_work_day on public.professional_work_days;
create trigger trg_log_work_day
  after insert or update on public.professional_work_days
  for each row execute function public.log_work_day_change();

-- ---------------------------------------------------------
-- 7. RLS
-- ---------------------------------------------------------
alter table public.daily_entries enable row level security;
alter table public.professional_work_days enable row level security;

drop policy if exists "master full access daily_entries" on public.daily_entries;
create policy "master full access daily_entries" on public.daily_entries
  for all using (public.is_master()) with check (public.is_master());

drop policy if exists "professional reads own entries" on public.daily_entries;
create policy "professional reads own entries" on public.daily_entries
  for select using (professional_id = public.my_professional_id());

drop policy if exists "professional inserts own entries if unlocked" on public.daily_entries;
create policy "professional inserts own entries if unlocked" on public.daily_entries
  for insert
  with check (
    professional_id = public.my_professional_id()
    and exists (
      select 1 from public.month_locks ml
      where ml.month = daily_entries.month and ml.year = daily_entries.year and ml.is_unlocked = true
    )
  );

drop policy if exists "professional updates own entries if unlocked" on public.daily_entries;
create policy "professional updates own entries if unlocked" on public.daily_entries
  for update using (
    professional_id = public.my_professional_id()
    and exists (
      select 1 from public.month_locks ml
      where ml.month = daily_entries.month and ml.year = daily_entries.year and ml.is_unlocked = true
    )
  )
  with check (professional_id = public.my_professional_id());

drop policy if exists "professional deletes own entries if unlocked" on public.daily_entries;
create policy "professional deletes own entries if unlocked" on public.daily_entries
  for delete using (
    professional_id = public.my_professional_id()
    and exists (
      select 1 from public.month_locks ml
      where ml.month = daily_entries.month and ml.year = daily_entries.year and ml.is_unlocked = true
    )
  );

drop policy if exists "master full access work_days" on public.professional_work_days;
create policy "master full access work_days" on public.professional_work_days
  for all using (public.is_master()) with check (public.is_master());

-- profissional controla o próprio calendário de dias trabalháveis,
-- sem depender do mês estar liberado (é configuração de agenda, não valor financeiro)
drop policy if exists "professional manages own work_days" on public.professional_work_days;
create policy "professional manages own work_days" on public.professional_work_days
  for all using (professional_id = public.my_professional_id())
  with check (professional_id = public.my_professional_id());

grant select, insert, update, delete on public.daily_entries to authenticated;
grant select, insert, update, delete on public.professional_work_days to authenticated;

-- =========================================================
-- FIM DA MIGRAÇÃO 003
-- =========================================================

-- =========================================================
-- FIM DO SCHEMA
-- =========================================================
