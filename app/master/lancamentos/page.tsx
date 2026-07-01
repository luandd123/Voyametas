import { createClient } from "@/lib/supabase/server";
import { MONTH_NAMES } from "@/lib/calculations";
import ProfessionalSelect from "./ProfessionalSelect";
import IndividualEntryForm from "./IndividualEntryForm";
import MassEntryForm from "./MassEntryForm";
import EntryCalendar from "@/components/EntryCalendar";

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; prof?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = Number(params.month) || now.getMonth() + 1;
  const year = Number(params.year) || now.getFullYear();
  const selectedProfessionalId = params.prof || "";

  const supabase = await createClient();
  const { data: professionals } = await supabase
    .from("professionals")
    .select("*")
    .eq("active", true)
    .order("name");

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-31`;

  let dailyEntries: any[] = [];
  let workDays: any[] = [];

  if (selectedProfessionalId) {
    const [{ data: entriesData }, { data: workDaysData }] = await Promise.all([
      supabase
        .from("daily_entries")
        .select("*")
        .eq("professional_id", selectedProfessionalId)
        .gte("entry_date", monthStart)
        .lte("entry_date", monthEnd),
      supabase
        .from("professional_work_days")
        .select("*")
        .eq("professional_id", selectedProfessionalId)
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd),
    ]);
    dailyEntries = entriesData ?? [];
    workDays = workDaysData ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-voya-charcoal/50">Lançamentos</p>
        <h1 className="font-serif text-2xl text-voya-charcoal">
          {MONTH_NAMES[month - 1]} / {year}
        </h1>
        <p className="text-sm text-voya-charcoal/60 mt-1">
          Como Master, você pode lançar, editar e corrigir valores de qualquer profissional, mesmo
          em meses bloqueados para elas.
        </p>
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-medium text-voya-charcoal">Calendário por profissional</p>
        <ProfessionalSelect professionals={professionals ?? []} />
      </div>

      {selectedProfessionalId && (
        <EntryCalendar
          professionalId={selectedProfessionalId}
          month={month}
          year={year}
          entries={dailyEntries}
          workOverrides={workDays}
          canEdit
        />
      )}

      <IndividualEntryForm professionals={professionals ?? []} />

      <MassEntryForm professionals={professionals ?? []} month={month} year={year} />
    </div>
  );
}
