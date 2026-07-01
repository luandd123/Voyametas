-- =========================================================
-- VOYA METAS - Migração 003
-- Lançamentos diários, calendário de dias trabalháveis e tema
-- Execute no SQL Editor do Supabase, depois de 002.
-- =========================================================

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
