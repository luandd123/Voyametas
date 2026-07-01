import { createClient } from "@/lib/supabase/server";
import { MONTH_NAMES } from "@/lib/calculations";
import MonthLockRow from "./MonthLockRow";

export default async function MesesPage() {
  const supabase = await createClient();
  const now = new Date();
  const currentYear = now.getFullYear();

  const { data: locks } = await supabase
    .from("month_locks")
    .select("*")
    .in("year", [currentYear - 1, currentYear, currentYear + 1]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs text-voya-charcoal/50">Gerenciar</p>
        <h1 className="font-serif text-2xl text-voya-charcoal">Liberar meses</h1>
        <p className="text-sm text-voya-charcoal/60 mt-1">
          Por padrão todo mês fica bloqueado. Libere apenas o mês corrente para lançamento.
        </p>
      </div>

      <div className="card">
        <p className="text-sm font-medium text-voya-charcoal mb-3">{currentYear}</p>
        <div className="divide-y divide-voya-rose/10">
          {months.map((m) => {
            const lock = locks?.find((l) => l.month === m && l.year === currentYear);
            return (
              <MonthLockRow
                key={m}
                month={m}
                year={currentYear}
                label={MONTH_NAMES[m - 1]}
                isUnlocked={lock?.is_unlocked ?? false}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
