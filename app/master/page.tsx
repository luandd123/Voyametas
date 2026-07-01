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
} from "@/lib/calculations";
import MonthFilter from "./MonthFilter";

export default async function MasterDashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = Number(params.month) || now.getMonth() + 1;
  const year = Number(params.year) || now.getFullYear();

  const supabase = await createClient();

  const [{ data: professionals }, { data: goals }, { data: progresses }] = await Promise.all([
    supabase.from("professionals").select("*").eq("active", true).order("name"),
    supabase.from("monthly_goals").select("*").eq("month", month).eq("year", year),
    supabase.from("goal_progress").select("*").eq("month", month).eq("year", year),
  ]);

  const rows = (professionals ?? []).map((p) => {
    const goal = goals?.find((g) => g.professional_id === p.id);
    const progress = progresses?.find((g) => g.professional_id === p.id);
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
      status: rhythmStatus(amountDone, generalGoal, month, year),
      projection: projection(amountDone, month, year),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-xs text-voya-charcoal/50">Visão geral da equipe</p>
          <h1 className="font-serif text-2xl text-voya-charcoal">
            {MONTH_NAMES[month - 1]} / {year}
          </h1>
        </div>
        <MonthFilter month={month} year={year} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Meta inicial (equipe)" value={formatBRL(totalInitial)} />
        <StatCard label="Meta geral (equipe)" value={formatBRL(totalGeneral)} />
        <StatCard label="Total realizado" value={formatBRL(totalDone)} />
        <StatCard label="% geral alcançado" value={`${overallPct}%`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <GoalPieChart done={totalDone} remaining={Math.max(totalGeneral - totalDone, 0)} title="Equipe: realizado x restante" />
        <ComparisonBarChart data={barData} title="Realizado por profissional (R$)" />
      </div>

      <div className="card overflow-x-auto">
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
