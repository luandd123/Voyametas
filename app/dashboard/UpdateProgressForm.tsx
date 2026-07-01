"use client";

import { useState, useTransition } from "react";
import { updateProgress } from "./actions";

export default function UpdateProgressForm({
  professionalId,
  month,
  year,
  currentValue,
  disabled,
}: {
  professionalId: string;
  month: number;
  year: number;
  currentValue: number;
  disabled: boolean;
}) {
  const [value, setValue] = useState(currentValue.toString());
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProgress(formData);
      setMessage(result?.error ? result.error : "Valor atualizado com sucesso.");
    });
  }

  return (
    <form action={handleSubmit} className="card space-y-3">
      <p className="text-sm font-medium text-voya-charcoal">Atualizar valor realizado no mês</p>
      <input type="hidden" name="professionalId" value={professionalId} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="year" value={year} />
      <div className="flex gap-3">
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          disabled={disabled}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input-field"
        />
        <button type="submit" disabled={disabled || isPending} className="btn-primary whitespace-nowrap">
          {isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
      {message && <p className="text-xs text-voya-charcoal/60">{message}</p>}
    </form>
  );
}
