"use client";

import { useState, useTransition, useRef } from "react";
import { saveDailyEntries } from "@/lib/actions/entries";
import type { Professional } from "@/lib/types";

export default function IndividualEntryForm({ professionals }: { professionals: Professional[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    const professionalId = String(formData.get("professionalId") || "");
    const date = String(formData.get("date") || "");
    const amount = String(formData.get("amount") || "");
    const observation = String(formData.get("observation") || "");

    if (!professionalId || !date || !amount) {
      setMessage("Preencha profissional, dia e valor.");
      return;
    }

    const fd = new FormData();
    fd.set("professionalId", professionalId);
    fd.set("dates", JSON.stringify([date]));
    fd.set("totalAmount", amount);
    fd.set("observation", observation);

    setMessage(null);
    startTransition(async () => {
      const result = await saveDailyEntries(fd);
      if (result?.error) setMessage(result.error);
      else {
        setMessage("Lançamento individual salvo.");
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="card space-y-3">
      <p className="text-sm font-medium text-voya-charcoal">Lançamento individual</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
          <label className="label-field">Dia</label>
          <input name="date" type="date" required className="input-field" />
        </div>
        <div>
          <label className="label-field">Valor (R$)</label>
          <input name="amount" type="number" step="0.01" min="0" required className="input-field" />
        </div>
        <div>
          <label className="label-field">Observação</label>
          <input name="observation" type="text" className="input-field" placeholder="Opcional" />
        </div>
      </div>
      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Salvando..." : "Lançar"}
      </button>
      {message && <p className="text-xs text-voya-charcoal/60">{message}</p>}
    </form>
  );
}
