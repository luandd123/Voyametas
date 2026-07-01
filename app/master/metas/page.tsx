import { createClient } from "@/lib/supabase/server";
import { MONTH_NAMES } from "@/lib/calculations";
import MetasManager from "./MetasManager";

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

      <MetasManager professionals={professionals ?? []} goals={goals ?? []} month={month} year={year} />
    </div>
  );
}
