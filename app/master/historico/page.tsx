import { createClient } from "@/lib/supabase/server";

const ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Remoção",
  update_progress: "Atualização de valor realizado",
  lock_month: "Bloqueio de mês",
  unlock_month: "Liberação de mês",
};

const ENTITY_LABELS: Record<string, string> = {
  professional: "Profissional",
  monthly_goal: "Meta mensal",
  goal_progress: "Valor realizado",
  month_lock: "Bloqueio de mês",
};

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: history } = await supabase
    .from("change_history")
    .select("*, profiles(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-voya-charcoal/50">Consultar</p>
        <h1 className="font-serif text-2xl text-voya-charcoal">Histórico de alterações</h1>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-left text-voya-charcoal/50 text-xs uppercase">
              <th className="pb-2">Quando</th>
              <th className="pb-2">Quem</th>
              <th className="pb-2">Ação</th>
              <th className="pb-2">Onde</th>
              <th className="pb-2">Valor anterior</th>
              <th className="pb-2">Novo valor</th>
            </tr>
          </thead>
          <tbody>
            {(history ?? []).map((h: any) => (
              <tr key={h.id} className="border-t border-voya-rose/10 align-top">
                <td className="py-2 whitespace-nowrap text-xs text-voya-charcoal/60">
                  {new Date(h.created_at).toLocaleString("pt-BR")}
                </td>
                <td className="py-2 text-xs">{h.profiles?.name ?? "—"}</td>
                <td className="py-2 text-xs">{ACTION_LABELS[h.action] ?? h.action}</td>
                <td className="py-2 text-xs">{ENTITY_LABELS[h.entity_type] ?? h.entity_type}</td>
                <td className="py-2 text-xs max-w-[180px] truncate">
                  {h.previous_value ? JSON.stringify(h.previous_value) : "—"}
                </td>
                <td className="py-2 text-xs max-w-[180px] truncate">
                  {h.new_value ? JSON.stringify(h.new_value) : "—"}
                </td>
              </tr>
            ))}
            {(history ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-voya-charcoal/40">
                  Nenhuma alteração registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
