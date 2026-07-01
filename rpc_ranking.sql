-- =========================================================
-- VOYA METAS - Função de ranking por percentual
-- Execute isso DEPOIS do schema.sql, também no SQL Editor do Supabase
-- =========================================================
-- Permite que qualquer profissional logada veja o ranking de TODAS as
-- profissionais em porcentagem, sem enxergar os valores em R$ das colegas
-- (a função roda como security definer e só devolve percentuais).

create or replace function public.get_ranking(p_month int, p_year int)
returns table(
  professional_id uuid,
  name text,
  pct_general numeric,
  pct_initial numeric
)
language sql
security definer
stable
as $$
  select
    p.id,
    p.name,
    case when mg.general_goal > 0
      then round((coalesce(gp.amount_done,0) / mg.general_goal) * 100, 1)
      else 0 end as pct_general,
    case when mg.initial_goal > 0
      then round((coalesce(gp.amount_done,0) / mg.initial_goal) * 100, 1)
      else 0 end as pct_initial
  from public.professionals p
  left join public.monthly_goals mg
    on mg.professional_id = p.id and mg.month = p_month and mg.year = p_year
  left join public.goal_progress gp
    on gp.professional_id = p.id and gp.month = p_month and gp.year = p_year
  where p.active = true
  order by 3 desc;
$$;

grant execute on function public.get_ranking(int, int) to authenticated;
