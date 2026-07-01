"use client";

import { useState, useTransition, useMemo } from "react";
import clsx from "clsx";
import { massEntry } from "@/lib/actions/entries";
import { daysInMonth, toDateKey, MONTH_NAMES } from "@/lib/calculations";
import type { Professional } from "@/lib/types";

export default function MassEntryForm({
  professionals,
  month,
  year,
}: {
  professionals: Professional[];
  month: number;
  year: number;
}) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [observation, setObservation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = daysInMonth(month, year);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const cells: (number | null)[] = useMemo(
    () => [...Array(firstWeekday).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)],
    [firstWeekday, total]
  );

  const selectedEntries = useMemo(
    () =>
      professionals
        .map((p) => ({ professional: p, value: Number(amounts[p.id] || 0) }))
        .filter((e) => e.value > 0),
    [professionals, amounts]
  );

  function toggleDate(day: number) {
    const key = toDateKey(new Date(year, month - 1, day));
    setSelectedDates((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]));
  }

  function handleSave() {
    const entries = Object.entries(amounts)
      .map(([professionalId, value]) => ({ professionalId, amount: Number(value) }))
      .filter((e) => e.amount > 0);

    if (selectedDates.length === 0 || entries.length === 0) {
      setMessage("Selecione ao menos um dia e informe o valor de ao menos uma profissional.");
      return;
    }

    const fd = new FormData();
    fd.set("dates", JSON.stringify(selectedDates));
    fd.set("entries", JSON.stringify(entries));
    fd.set("observation", observation);

    setMessage(null);
    startTransition(async () => {
      const result = await massEntry(fd);
      if (result?.error) setMessage(result.error);
      else {
        setMessage(`Lançamento em massa salvo (${result.count} registros).`);
        setSelectedDates([]);
        setAmounts({});
        setObservation("");
      }
    });
  }

  return (
    <div className="card space-y-4">
      <p className="text-sm font-medium text-voya-charcoal">
        Lançamento em massa · {MONTH_NAMES[month - 1]} {year}
      </p>
      <p className="text-xs text-voya-charcoal/60">
        Selecione um ou mais dias e informe o valor total de cada profissional — o valor de cada
        uma será dividido igualmente entre os dias escolhidos.
      </p>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const key = toDateKey(new Date(year, month - 1, day));
          const isSelected = selectedDates.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleDate(day)}
              className={clsx(
                "aspect-square rounded-lg text-[10px] sm:text-xs border transition",
                isSelected
                  ? "bg-voya-roseDark text-white border-transparent"
                  : "border-voya-rose/30 text-voya-charcoal"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-voya-charcoal">Valor por profissional</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {professionals.map((p) => {
            const filled = Number(amounts[p.id] || 0) > 0;
            return (
              <div
                key={p.id}
                className={clsx(
                  "flex items-center gap-2 rounded-lg px-2 py-1 transition",
                  filled && "bg-voya-rose/15"
                )}
              >
                <span className={clsx("text-sm flex-1 truncate", filled && "font-medium")}>{p.name}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="R$"
                  value={amounts[p.id] ?? ""}
                  onChange={(e) => setAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  className="input-field w-28"
                />
              </div>
            );
          })}
        </div>
      </div>

      {selectedEntries.length > 0 && (
        <div className="rounded-lg border border-voya-rose/30 bg-voya-cream/60 p-3 space-y-1">
          <p className="text-xs font-medium text-voya-charcoal">
            Você vai lançar para {selectedEntries.length} profissional(is)
            {selectedDates.length > 0 ? ` em ${selectedDates.length} dia(s)` : ""}:
          </p>
          <ul className="text-xs text-voya-charcoal/70 space-y-0.5">
            {selectedEntries.map(({ professional, value }) => (
              <li key={professional.id}>
                • {professional.name} —{" "}
                {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                {selectedDates.length > 1
                  ? ` (${(value / selectedDates.length).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })} por dia)`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <input
        type="text"
        placeholder="Observação (opcional, aplicada a todos os lançamentos)"
        value={observation}
        onChange={(e) => setObservation(e.target.value)}
        className="input-field"
      />

      <button type="button" onClick={handleSave} disabled={isPending} className="btn-primary">
        {isPending ? "Salvando..." : "Salvar todos"}
      </button>

      {message && <p className="text-xs text-voya-charcoal/60">{message}</p>}
    </div>
  );
}
