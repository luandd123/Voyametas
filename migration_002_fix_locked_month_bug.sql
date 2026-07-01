-- =========================================================
-- VOYA METAS - Migração 002: corrige bug do "mês bloqueado"
-- Execute no SQL Editor do Supabase (depois de schema.sql e rpc_ranking.sql)
-- =========================================================
--
-- CAUSA DO BUG:
-- A tabela goal_progress tinha política de UPDATE para a profissional,
-- mas nenhuma política de INSERT. No primeiro lançamento do mês (quando
-- ainda não existe linha em goal_progress para aquele professional_id/
-- month/year), o upsert vira um INSERT puro no Postgres, que o RLS
-- bloqueava por falta de permissão — mesmo com o mês desbloqueado.
--
-- CORREÇÃO: adicionar política de INSERT para a profissional, espelhando
-- a mesma regra já usada no UPDATE (só pode inserir na própria linha, e
-- somente se o mês estiver desbloqueado).
-- =========================================================

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

-- =========================================================
-- FIM DA MIGRAÇÃO 002
-- =========================================================
