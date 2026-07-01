import { createClient } from "@/lib/supabase/server";

const ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Remoção",
  update_progress: "Atualização de valor realizado",
  lock_month: "Bloqueio de mês",
  unlock_month: "Liberação de mês",
  create_entry: "Lançamento diário criado",
  update_entry: "Lançamento diário editado",
  delete_entry: "Lançamento diário removido",
  lock_day: "Dia bloqueado",
  unlock_day: "Dia liberado",
};

const ENTITY_LABELS: Record<string, string> = {
  professional: "Profissional",
  monthly_goal: "Meta mensal",
  goal_progress: "Valor realizado (resumo)",
  month_lock: "Bloqueio de mês",
  daily_entry: "Lançamento diário",
  work_day: "Dia trabalhável",
};

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: history } = await supabase
    .from("change_history")
    .select("*, profiles(name)")
    .order("created_at", { ascending: false })
    .limit(150);

  const rows = history ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-voya-charcoal/50">Consultar</p>
        <h1 className="font-serif text-2xl text-voya-charcoal">Histórico de alterações</h1>
      </div>

      {/* Tabela: telas médias+ */}
      <div className="card overflow-x-auto hidden md:block">
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
            {rows.map((h: any) => (
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-voya-charcoal/40">
                  Nenhuma alteração registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards: telas pequenas */}
      <div className="space-y-2 md:hidden">
        {rows.map((h: any) => (
          <div key={h.id} className="card space-y-1">
            <div className="flex items-center justify-between text-xs text-voya-charcoal/50">
              <span>{new Date(h.created_at).toLocaleString("pt-BR")}</span>
              <span>{h.profiles?.name ?? "—"}</span>
            </div>
            <p className="text-sm font-medium">
              {ACTION_LABELS[h.action] ?? h.action} · {ENTITY_LABELS[h.entity_type] ?? h.entity_type}
            </p>
            <div className="text-xs text-voya-charcoal/60 space-y-0.5">
              {h.previous_value && <p>Antes: {JSON.stringify(h.previous_value)}</p>}
              {h.new_value && <p>Depois: {JSON.stringify(h.new_value)}</p>}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-voya-charcoal/40">Nenhuma alteração registrada ainda.</p>}
      </div>
    </div>
  );
}
