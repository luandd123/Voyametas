import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  percent,
  remaining,
  dailyAverageNeeded,
  weeklyAverageNeeded,
  projection,
  rhythmStatus,
  formatBRL,
  MONTH_NAMES,
} from "@/lib/calculations";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { RhythmBadge } from "@/components/RhythmBadge";
import { RankingTable } from "@/components/RankingTable";
import { LogoutButton } from "@/components/LogoutButton";
import { GoalPieChart } from "@/components/charts/GoalPieChart";
import UpdateProgressForm from "./UpdateProgressForm";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.role === "master") redirect("/master");
  if (!profile.professional_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="card">Sua conta ainda não está vinculada a uma profissional. Fale com o Master.</p>
      </div>
    );
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [{ data: goal }, { data: progress }, { data: lock }, { data: ranking }] = await Promise.all([
    supabase
      .from("monthly_goals")
      .select("*")
      .eq("professional_id", profile.professional_id)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle(),
    supabase
      .from("goal_progress")
      .select("*")
      .eq("professional_id", profile.professional_id)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle(),
    supabase.from("month_locks").select("*").eq("month", month).eq("year", year).maybeSingle(),
    supabase.rpc("get_ranking", { p_month: month, p_year: year }),
  ]);

  const initialGoal = goal?.initial_goal ?? 0;
  const generalGoal = goal?.general_goal ?? 0;
  const amountDone = progress?.amount_done ?? 0;
  const isUnlocked = lock?.is_unlocked ?? false;

  const pctInitial = percent(amountDone, initialGoal);
  const pctGeneral = percent(amountDone, generalGoal);
  const remainingInitial = remaining(amountDone, initialGoal);
  const remainingGeneral = remaining(amountDone, generalGoal);
  const dailyAvg = dailyAverageNeeded(amountDone, generalGoal, month, year);
  const weeklyAvg = weeklyAverageNeeded(amountDone, generalGoal, month, year);
  const proj = projection(amountDone, month, year);
  const status = rhythmStatus(amountDone, generalGoal, month, year);

  return (
    <div className="min-h-screen bg-voya-cream">
      <header className="bg-white border-b border-voya-rose/20 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-voya-charcoal/50">
            {MONTH_NAMES[month - 1]} / {year}
          </p>
          <h1 className="font-serif text-xl text-voya-charcoal">Olá, {profile.name.split(" ")[0]} 🌸</h1>
        </div>
        <div className="w-28">
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {!isUnlocked && (
          <div className="card bg-amber-50 border-amber-200 text-amber-800 text-sm">
            Este mês está bloqueado para edição. Fale com o Master se precisar lançar valores.
          </div>
        )}

        <div className="flex items-center justify-between">
          <RhythmBadge status={status} />
          <p className="text-sm text-voya-charcoal/60">
            Projeção de fechamento: <span className="font-medium">{formatBRL(proj)}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Meta inicial" value={formatBRL(initialGoal)} />
          <StatCard label="Meta geral" value={formatBRL(generalGoal)} />
          <StatCard label="Já realizado" value={formatBRL(amountDone)} />
          <StatCard label="Restante (meta geral)" value={formatBRL(remainingGeneral)} />
        </div>

        <div className="card space-y-4">
          <ProgressBar pct={pctInitial} label="Meta inicial" />
          <ProgressBar pct={pctGeneral} label="Meta geral" />
        </div>

        <UpdateProgressForm
          professionalId={profile.professional_id}
          month={month}
          year={year}
          currentValue={amountDone}
          disabled={!isUnlocked}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Restante meta inicial" value={formatBRL(remainingInitial)} />
          <StatCard label="Média diária necessária" value={formatBRL(dailyAvg)} />
          <StatCard label="Média semanal necessária" value={formatBRL(weeklyAvg)} />
          <StatCard label="Projeção de fechamento" value={formatBRL(proj)} />
        </div>

        <GoalPieChart done={amountDone} remaining={remainingGeneral} title="Realizado x Restante (meta geral)" />

        <RankingTable rows={ranking ?? []} showValues={false} />
      </main>
    </div>
  );
}
