import { createClient } from "@/lib/supabase/server";
import GoalForm from "./GoalForm";
import { MONTH_NAMES, formatBRL } from "@/lib/calculations";

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = Number(params.month) || now.getMonth() + 1;
  const year = Number(params.year) || now.getFullYear();

  const supabase = await createClient();
  const [{ data: professionals }, { data: goals }] = await Promise.all([
    supabase.from("professionals").select("*").eq("active", true).order("name"),
    supabase.from("monthly_goals").select("*").eq("month", month).eq("year", year),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-xs text-voya-charcoal/50">Gerenciar</p>
        <h1 className="font-serif text-2xl text-voya-charcoal">
          Metas · {MONTH_NAMES[month - 1]} {year}
        </h1>
      </div>

      <GoalForm professionals={professionals ?? []} month={month} year={year} />

      <div className="card overflow-x-auto">
        <p className="text-sm font-medium text-voya-charcoal mb-3">Metas definidas neste mês</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-voya-charcoal/50 text-xs uppercase">
              <th className="pb-2">Profissional</th>
              <th className="pb-2 text-right">Meta inicial</th>
              <th className="pb-2 text-right">Meta geral</th>
            </tr>
          </thead>
          <tbody>
            {(professionals ?? []).map((p) => {
              const g = goals?.find((g) => g.professional_id === p.id);
              return (
                <tr key={p.id} className="border-t border-voya-rose/10">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2 text-right">{formatBRL(g?.initial_goal ?? 0)}</td>
                  <td className="py-2 text-right">{formatBRL(g?.general_goal ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
