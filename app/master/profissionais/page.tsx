import { createClient } from "@/lib/supabase/server";
import ProfessionalForm from "./ProfessionalForm";
import ProfessionalRow from "./ProfessionalRow";

export default async function ProfissionaisPage() {
  const supabase = await createClient();
  const { data: professionals } = await supabase
    .from("professionals")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-xs text-voya-charcoal/50">Gerenciar</p>
        <h1 className="font-serif text-2xl text-voya-charcoal">Profissionais</h1>
      </div>

      <ProfessionalForm />

      <div className="card">
        <p className="text-sm font-medium text-voya-charcoal mb-3">Equipe cadastrada</p>
        <div className="divide-y divide-voya-rose/10">
          {(professionals ?? []).map((p) => (
            <ProfessionalRow key={p.id} professional={p} />
          ))}
          {(professionals ?? []).length === 0 && (
            <p className="text-sm text-voya-charcoal/40 py-4">Nenhuma profissional cadastrada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
