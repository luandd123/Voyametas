"use client";

import { useState, useTransition } from "react";
import { saveGoal } from "./actions";
import type { Professional } from "@/lib/types";

export default function GoalForm({
  professionals,
  month,
  year,
}: {
  professionals: Professional[];
  month: number;
  year: number;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveGoal(formData);
      setMessage(result?.error ?? "Meta salva com sucesso.");
    });
  }

  return (
    <form action={handleSubmit} className="card space-y-3">
      <p className="text-sm font-medium text-voya-charcoal">Definir / editar meta</p>
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="year" value={year} />
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="label-field">Profissional</label>
          <select name="professionalId" required className="input-field">
            <option value="">Selecione</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Meta inicial (R$)</label>
          <input name="initialGoal" type="number" step="0.01" min="0" required className="input-field" />
        </div>
        <div>
          <label className="label-field">Meta geral (R$)</label>
          <input name="generalGoal" type="number" step="0.01" min="0" required className="input-field" />
        </div>
      </div>
      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Salvando..." : "Salvar meta"}
      </button>
      {message && <p className="text-xs text-voya-charcoal/60">{message}</p>}
    </form>
  );
}
