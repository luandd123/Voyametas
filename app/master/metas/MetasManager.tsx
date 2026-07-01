"use client";

import { useState, useTransition, useMemo } from "react";
import { saveGoal } from "./actions";
import { formatBRL } from "@/lib/calculations";
import type { Professional, MonthlyGoal } from "@/lib/types";

export default function MetasManager({
  professionals,
  goals,
  month,
  year,
}: {
  professionals: Professional[];
  goals: MonthlyGoal[];
  month: number;
  year: number;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [initialGoal, setInitialGoal] = useState("");
  const [generalGoal, setGeneralGoal] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const goalsByProfessional = useMemo(() => {
    const map: Record<string, MonthlyGoal> = {};
    goals.forEach((g) => {
      map[g.professional_id] = g;
    });
    return map;
  }, [goals]);

  function selectProfessional(id: string) {
    setSelectedId(id);
    const existing = goalsByProfessional[id];
    setInitialGoal(existing ? String(existing.initial_goal) : "");
    setGeneralGoal(existing ? String(existing.general_goal) : "");
    setMessage(null);
  }

  function handleSubmit() {
    if (!selectedId) {
      setMessage("Selecione uma profissional.");
      return;
    }
    const fd = new FormData();
    fd.set("professionalId", selectedId);
    fd.set("month", String(month));
    fd.set("year", String(year));
    fd.set("initialGoal", initialGoal);
    fd.set("generalGoal", generalGoal);

    setMessage(null);
    startTransition(async () => {
      const result = await saveGoal(fd);
      setMessage(result?.error ?? "Meta salva com sucesso.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <p className="text-sm font-medium text-voya-charcoal">
          {goalsByProfessional[selectedId] ? "Editar meta" : "Definir meta"}
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="label-field">Profissional</label>
            <select
              value={selectedId}
              onChange={(e) => selectProfessional(e.target.value)}
              className="input-field"
            >
              <option value="">Selecione</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {goalsByProfessional[p.id] ? " (já tem meta)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Meta inicial (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={initialGoal}
              onChange={(e) => setInitialGoal(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Meta geral (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={generalGoal}
              onChange={(e) => setGeneralGoal(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleSubmit} disabled={isPending} className="btn-primary">
            {isPending ? "Salvando..." : "Salvar meta"}
          </button>
          {selectedId && (
            <button type="button" onClick={() => selectProfessional("")} className="btn-secondary text-xs">
              Limpar seleção
            </button>
          )}
        </div>
        {message && <p className="text-xs text-voya-charcoal/60">{message}</p>}
      </div>

      <div className="card overflow-x-auto">
        <p className="text-sm font-medium text-voya-charcoal mb-3">Metas definidas neste mês</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-voya-charcoal/50 text-xs uppercase">
              <th className="pb-2">Profissional</th>
              <th className="pb-2 text-right">Meta inicial</th>
              <th className="pb-2 text-right">Meta geral</th>
              <th className="pb-2 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {professionals.map((p) => {
              const g = goalsByProfessional[p.id];
              return (
                <tr key={p.id} className="border-t border-voya-rose/10">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2 text-right">{formatBRL(g?.initial_goal ?? 0)}</td>
                  <td className="py-2 text-right">{formatBRL(g?.general_goal ?? 0)}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => selectProfessional(p.id)}
                      className="text-voya-roseDark hover:underline text-xs"
                    >
                      editar
                    </button>
                  </td>
                </tr>
              );
            })}
            {professionals.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-voya-charcoal/40">
                  Nenhuma profissional ativa cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
