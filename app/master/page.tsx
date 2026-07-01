import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/StatCard";
import { RankingTable } from "@/components/RankingTable";
import { GoalPieChart } from "@/components/charts/GoalPieChart";
import { ComparisonBarChart } from "@/components/charts/ComparisonBarChart";
import { RhythmBadge } from "@/components/RhythmBadge";
import {
  formatBRL,
  percent,
  rhythmStatus,
  projection,
  MONTH_NAMES,
  weekBucketOfMonth,
} from "@/lib/calculations";
import type { WorkdayOverrides } from "@/lib/calculations";
import MasterFilters from "./MasterFilters";

export default async function MasterDashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; prof?: string; week?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = Number(params.month) || now.getMonth() + 1;
  const year = Number(params.year) || now.getFullYear();
  const professionalFilter = params.prof || "";
  const weekFilter = params.week || "";

  const supabase = await createClient();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-31`;

  const [
    { data: professionals },
    { data: goals },
    { data: progresses },
    { data: dailyEntries },
    { data: workDays },
  ] = await Promise.all([
    supabase.from("professionals").select("*").eq("active", true).order("name"),
    supabase.from("monthly_goals").select("*").eq("month", month).eq("year", year),
    supabase.from("goal_progress").select("*").eq("month", month).eq("year", year),
    supabase.from("daily_entries").select("*").gte("entry_date", monthStart).lte("entry_date", monthEnd),
    supabase.from("professional_work_days").select("*").gte("work_date", monthStart).lte("work_date", monthEnd),
  ]);

  const overridesByProfessional: Record<string, WorkdayOverrides> = {};
  (workDays ?? []).forEach((w) => {
    if (!overridesByProfessional[w.professional_id]) overridesByProfessional[w.professional_id] = {};
    overridesByProfessional[w.professional_id][w.work_date] = w.is_working_day;
  });

  const visibleProfessionals = professionalFilter
    ? (professionals ?? []).filter((p) => p.id === professionalFilter)
    : professionals ?? [];

  const rows = visibleProfessionals.map((p) => {
    const goal = goals?.find((g) => g.professional_id === p.id);
    const progress = progresses?.find((g) => g.professional_id === p.id);
    const overrides = overridesByProfessional[p.id] ?? {};
    const initialGoal = goal?.initial_goal ?? 0;
    const generalGoal = goal?.general_goal ?? 0;
    const amountDone = progress?.amount_done ?? 0;
    return {
      id: p.id,
      name: p.name,
      initialGoal,
      generalGoal,
      amountDone,
      pctInitial: percent(amountDone, initialGoal),
      pctGeneral: percent(amountDone, generalGoal),
      status: rhythmStatus(amountDone, generalGoal, month, year, overrides),
      projection: projection(amountDone, month, year, overrides),
    };
  });

  const totalInitial = rows.reduce((s, r) => s + r.initialGoal, 0);
  const totalGeneral = rows.reduce((s, r) => s + r.generalGoal, 0);
  const totalDone = rows.reduce((s, r) => s + r.amountDone, 0);
  const overallPct = percent(totalDone, totalGeneral);

  const barData = rows.map((r) => ({ name: r.name.split(" ")[0], value: r.amountDone }));
  const rankingByPct = rows
    .map((r) => ({ name: r.name, pct_general: r.pctGeneral, amount_done: r.amountDone }))
    .sort((a, b) => b.pct_general - a.pct_general);
  const rankingByValue = [...rows].sort((a, b) => b.amountDone - a.amountDone);

  const relevantEntries = (dailyEntries ?? []).filter(
    (e) => !professionalFilter || e.professional_id === professionalFilter
  );
  const weeklyTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  relevantEntries.forEach((e) => {
    weeklyTotals[weekBucketOfMonth(e.entry_date)] += Number(e.amount);
  });
  const weeklyChartData = Object.entries(weeklyTotals)
    .filter(([, v]) => v > 0)
    .map(([week, value]) => ({ name: `Sem. ${week}`, value }));

  const weekEntries = weekFilter
    ? relevantEntries.filter((e) => String(weekBucketOfMonth(e.entry_date)) === weekFilter)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <p className="text-xs text-voya-charcoal/50">Visão geral da equipe</p>
          <h1 className="font-serif text-2xl text-voya-charcoal">
            {MONTH_NAMES[month - 1]} / {year}
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <MasterFilters
            month={month}
            year={year}
            professionalId={professionalFilter}
            week={weekFilter}
            professionals={professionals ?? []}
          />
          <Link
            href={`/master/lancamentos${professionalFilter ? `?prof=${professionalFilter}` : ""}`}
            className="btn-primary text-center whitespace-nowrap"
          >
            Lançar valores
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Meta inicial (equipe)" value={formatBRL(totalInitial)} />
        <StatCard label="Meta geral (equipe)" value={formatBRL(totalGeneral)} />
        <StatCard label="Total realizado" value={formatBRL(totalDone)} />
        <StatCard label="% geral alcançado" value={`${overallPct}%`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <GoalPieChart done={totalDone} remaining={Math.max(totalGeneral - totalDone, 0)} title="Equipe: realizado x restante" />
        {weeklyChartData.length > 0 ? (
          <ComparisonBarChart data={weeklyChartData} title="Realizado por semana" />
        ) : (
          <ComparisonBarChart data={barData} title="Realizado por profissional (R$)" />
        )}
      </div>

      {weekFilter && (
        <div className="card">
          <p className="text-sm font-medium text-voya-charcoal mb-2">
            Lançamentos da Semana {weekFilter}
          </p>
          <div className="space-y-1 max-h-56 overflow-y-auto text-sm">
            {weekEntries.length === 0 && <p className="text-voya-charcoal/40">Sem lançamentos nessa semana.</p>}
            {weekEntries
              .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
              .map((e) => {
                const prof = (professionals ?? []).find((p) => p.id === e.professional_id);
                return (
                  <div key={e.id} className="flex justify-between border-t border-voya-rose/10 py-1 first:border-0">
                    <span>
                      {new Date(e.entry_date + "T00:00:00").toLocaleDateString("pt-BR")} · {prof?.name ?? "—"}
                    </span>
                    <span className="font-medium">{formatBRL(Number(e.amount))}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tabela em telas médias+, cards empilhados em telas pequenas */}
      <div className="card overflow-x-auto hidden md:block">
        <p className="text-sm font-medium text-voya-charcoal mb-3">Ritmo e projeção por profissional</p>
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-left text-voya-charcoal/50 text-xs uppercase">
              <th className="pb-2">Profissional</th>
              <th className="pb-2 text-right">Realizado</th>
              <th className="pb-2 text-right">% Meta geral</th>
              <th className="pb-2 text-right">Projeção fechamento</th>
              <th className="pb-2 text-right">Ritmo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-voya-rose/10">
                <td className="py-2 font-medium">{r.name}</td>
                <td className="py-2 text-right">{formatBRL(r.amountDone)}</td>
                <td className="py-2 text-right">{r.pctGeneral}%</td>
                <td className="py-2 text-right">{formatBRL(r.projection)}</td>
                <td className="py-2 text-right">
                  <RhythmBadge status={r.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-voya-charcoal/40">
                  Nenhuma profissional ativa cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        <p className="text-sm font-medium text-voya-charcoal">Ritmo e projeção por profissional</p>
        {rows.map((r) => (
          <div key={r.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{r.name}</p>
              <RhythmBadge status={r.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-voya-charcoal/70">
              <p>Realizado: <span className="font-medium text-voya-charcoal">{formatBRL(r.amountDone)}</span></p>
              <p>% Meta geral: <span className="font-medium text-voya-charcoal">{r.pctGeneral}%</span></p>
              <p className="col-span-2">Projeção: <span className="font-medium text-voya-charcoal">{formatBRL(r.projection)}</span></p>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-voya-charcoal/40">Nenhuma profissional ativa cadastrada.</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <RankingTable rows={rankingByPct} showValues />
        <div className="card">
          <p className="text-sm font-medium text-voya-charcoal mb-3">Ranking por valor realizado</p>
          <ol className="space-y-2 text-sm">
            {rankingByValue.map((r, i) => (
              <li key={r.id} className="flex justify-between border-t border-voya-rose/10 pt-2 first:border-0 first:pt-0">
                <span>{i + 1}º {r.name}</span>
                <span className="font-medium">{formatBRL(r.amountDone)}</span>
              </li>
            ))}
            {rankingByValue.length === 0 && <p className="text-voya-charcoal/40">Sem dados.</p>}
          </ol>
        </div>
      </div>
    </div>
  );
}
