import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  percent,
  remaining,
  dailyAverageNeeded,
  weeklyAverageNeeded,
  projection,
  rhythmStatus,
  workableDaysRemaining,
  formatBRL,
  MONTH_NAMES,
  weekBucketOfMonth,
} from "@/lib/calculations";
import type { WorkdayOverrides } from "@/lib/calculations";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { RhythmBadge } from "@/components/RhythmBadge";
import { RankingTable } from "@/components/RankingTable";
import { LogoutButton } from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import { GoalPieChart } from "@/components/charts/GoalPieChart";
import { ComparisonBarChart } from "@/components/charts/ComparisonBarChart";
import EntryCalendar from "@/components/EntryCalendar";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) redirect("/login");
  if (profile.role === "master") redirect("/master");
  if (!profile.professional_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="card">Sua conta ainda não está vinculada a uma profissional. Fale com o Master.</p>
      </div>
    );
  }

  const professionalId = profile.professional_id;
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-31`;

  const [
    { data: goal },
    { data: progress },
    { data: lock },
    { data: ranking },
    { data: dailyEntries },
    { data: workDays },
  ] = await Promise.all([
    supabase
      .from("monthly_goals")
      .select("*")
      .eq("professional_id", professionalId)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle(),
    supabase
      .from("goal_progress")
      .select("*")
      .eq("professional_id", professionalId)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle(),
    supabase.from("month_locks").select("*").eq("month", month).eq("year", year).maybeSingle(),
    supabase.rpc("get_ranking", { p_month: month, p_year: year }),
    supabase
      .from("daily_entries")
      .select("*")
      .eq("professional_id", professionalId)
      .gte("entry_date", monthStart)
      .lte("entry_date", monthEnd),
    supabase
      .from("professional_work_days")
      .select("*")
      .eq("professional_id", professionalId)
      .gte("work_date", monthStart)
      .lte("work_date", monthEnd),
  ]);

  const overrides: WorkdayOverrides = {};
  (workDays ?? []).forEach((w) => {
    overrides[w.work_date] = w.is_working_day;
  });

  const initialGoal = goal?.initial_goal ?? 0;
  const generalGoal = goal?.general_goal ?? 0;
  const amountDone = progress?.amount_done ?? 0;
  const isUnlocked = lock?.is_unlocked ?? false;

  const pctInitial = percent(amountDone, initialGoal);
  const pctGeneral = percent(amountDone, generalGoal);
  const remainingInitial = remaining(amountDone, initialGoal);
  const remainingGeneral = remaining(amountDone, generalGoal);
  const dailyAvg = dailyAverageNeeded(amountDone, generalGoal, month, year, overrides);
  const weeklyAvg = weeklyAverageNeeded(amountDone, generalGoal, month, year, overrides);
  const proj = projection(amountDone, month, year, overrides);
  const status = rhythmStatus(amountDone, generalGoal, month, year, overrides);
  const workableRemaining = workableDaysRemaining(month, year, overrides);

  const weeklyTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  (dailyEntries ?? []).forEach((e) => {
    weeklyTotals[weekBucketOfMonth(e.entry_date)] += Number(e.amount);
  });
  const weeklyChartData = Object.entries(weeklyTotals)
    .filter(([, v]) => v > 0)
    .map(([week, value]) => ({ name: `Sem. ${week}`, value }));

  return (
    <div className="min-h-screen bg-voya-cream">
      <header className="bg-voya-surface border-b border-voya-rose/20 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-voya-charcoal/50">
            {MONTH_NAMES[month - 1]} / {year}
          </p>
          <h1 className="font-serif text-lg sm:text-xl text-voya-charcoal truncate">
            Olá, {profile.name.split(" ")[0]} 🌸
          </h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="w-32 hidden sm:block">
            <ThemeToggle initialTheme={profile.theme ?? "light"} />
          </div>
          <div className="w-24 sm:w-28">
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="sm:hidden">
          <ThemeToggle initialTheme={profile.theme ?? "light"} />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <RhythmBadge status={status} />
          <p className="text-sm text-voya-charcoal/60">
            Projeção de fechamento: <span className="font-medium">{formatBRL(proj)}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Meta inicial" value={formatBRL(initialGoal)} />
          <StatCard label="Meta geral" value={formatBRL(generalGoal)} />
          <StatCard label="Já realizado" value={formatBRL(amountDone)} />
          <StatCard label="Restante (meta geral)" value={formatBRL(remainingGeneral)} />
        </div>

        <div className="card space-y-4">
          <ProgressBar pct={pctInitial} label="Meta inicial" />
          <ProgressBar pct={pctGeneral} label="Meta geral" />
        </div>

        <EntryCalendar
          professionalId={professionalId}
          month={month}
          year={year}
          entries={dailyEntries ?? []}
          workOverrides={workDays ?? []}
          canEdit={isUnlocked}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Restante meta inicial" value={formatBRL(remainingInitial)} />
          <StatCard label="Dias trabalháveis restantes" value={String(workableRemaining)} />
          <StatCard label="Média necessária/dia" value={formatBRL(dailyAvg)} sub="só dias trabalháveis" />
          <StatCard label="Média necessária/semana" value={formatBRL(weeklyAvg)} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <GoalPieChart done={amountDone} remaining={remainingGeneral} title="Realizado x Restante (meta geral)" />
          {weeklyChartData.length > 0 ? (
            <ComparisonBarChart data={weeklyChartData} title="Realizado por semana" />
          ) : (
            <div className="card flex items-center justify-center text-sm text-voya-charcoal/40 min-h-[220px]">
              Ainda sem lançamentos este mês.
            </div>
          )}
        </div>

        <RankingTable rows={ranking ?? []} showValues={false} />
      </main>
    </div>
  );
}
