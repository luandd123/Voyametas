"use client";

import { useState, useTransition, useMemo } from "react";
import clsx from "clsx";
import { saveDailyEntries, toggleWorkDay, deleteDailyEntry } from "@/lib/actions/entries";
import { daysInMonth, isWorkableDay, toDateKey, formatBRL, WEEKDAY_LABELS } from "@/lib/calculations";
import type { DailyEntry, WorkDayOverride } from "@/lib/types";

interface Props {
  professionalId: string;
  month: number;
  year: number;
  entries: DailyEntry[];
  workOverrides: WorkDayOverride[];
  canEdit: boolean;
}

export default function EntryCalendar({
  professionalId,
  month,
  year,
  entries,
  workOverrides,
  canEdit,
}: Props) {
  const [mode, setMode] = useState<"lancar" | "dias">("lancar");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState("");
  const [observation, setObservation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const entryMap = useMemo(() => {
    const map: Record<string, DailyEntry> = {};
    entries.forEach((e) => {
      map[e.entry_date] = e;
    });
    return map;
  }, [entries]);

  const overrideMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    workOverrides.forEach((o) => {
      map[o.work_date] = o.is_working_day;
    });
    return map;
  }, [workOverrides]);

  const total = daysInMonth(month, year);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  function toggleDaySelection(day: number) {
    const key = toDateKey(new Date(year, month - 1, day));
    setSelectedDates((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]));
  }

  function handleToggleWorkable(day: number) {
    const date = new Date(year, month - 1, day);
    const key = toDateKey(date);
    const currentlyWorkable = isWorkableDay(date, overrideMap);
    const fd = new FormData();
    fd.set("professionalId", professionalId);
    fd.set("date", key);
    fd.set("isWorkingDay", String(!currentlyWorkable));
    startTransition(async () => {
      const result = await toggleWorkDay(fd);
      if (result?.error) setMessage(result.error);
    });
  }

  function handleSave() {
    if (selectedDates.length === 0) {
      setMessage("Selecione ao menos um dia no calendário.");
      return;
    }
    const amount = Number(totalAmount);
    if (Number.isNaN(amount) || amount < 0) {
      setMessage("Informe um valor válido.");
      return;
    }
    const fd = new FormData();
    fd.set("professionalId", professionalId);
    fd.set("dates", JSON.stringify(selectedDates));
    fd.set("totalAmount", String(amount));
    fd.set("observation", observation);
    setMessage(null);
    startTransition(async () => {
      const result = await saveDailyEntries(fd);
      if (result?.error) {
        setMessage(result.error);
      } else {
        setMessage(
          selectedDates.length > 1
            ? `Lançado! ${formatBRL(amount)} dividido em ${selectedDates.length} dias.`
            : "Lançamento salvo."
        );
        setSelectedDates([]);
        setTotalAmount("");
        setObservation("");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remover este lançamento?")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deleteDailyEntry(fd);
    });
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-medium text-voya-charcoal">Calendário de lançamentos</p>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("lancar")}
            className={clsx(
              "px-3 py-1.5 rounded-lg border transition",
              mode === "lancar"
                ? "bg-voya-roseDark text-white border-transparent"
                : "border-voya-rose/30 text-voya-charcoal/70"
            )}
          >
            Lançar valores
          </button>
          <button
            type="button"
            onClick={() => setMode("dias")}
            className={clsx(
              "px-3 py-1.5 rounded-lg border transition",
              mode === "dias"
                ? "bg-voya-roseDark text-white border-transparent"
                : "border-voya-rose/30 text-voya-charcoal/70"
            )}
          >
            Dias trabalháveis
          </button>
        </div>
      </div>

      {!canEdit && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Este mês está bloqueado para lançamentos. Você pode visualizar, mas não editar valores.
        </p>
      )}

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs text-voya-charcoal/50">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const date = new Date(year, month - 1, day);
          const key = toDateKey(date);
          const workable = isWorkableDay(date, overrideMap);
          const hasOverride = key in overrideMap;
          const entry = entryMap[key];
          const isSelected = selectedDates.includes(key);
          const disableCell =
            mode === "lancar" ? !canEdit || !workable : false;

          return (
            <button
              key={key}
              type="button"
              disabled={disableCell || isPending}
              onClick={() => (mode === "lancar" ? toggleDaySelection(day) : handleToggleWorkable(day))}
              title={entry ? `${formatBRL(entry.amount)}${entry.observation ? " · " + entry.observation : ""}` : undefined}
              className={clsx(
                "aspect-square rounded-lg text-[10px] sm:text-xs flex flex-col items-center justify-center border transition disabled:opacity-40",
                !workable && "bg-voya-cream text-voya-charcoal/40 border-transparent",
                workable && !entry && "border-voya-rose/30 text-voya-charcoal",
                entry && "bg-voya-rose/25 border-voya-roseDark text-voya-charcoal font-medium",
                isSelected && "ring-2 ring-voya-roseDark",
                hasOverride && "border-dashed"
              )}
            >
              <span>{day}</span>
              {entry && <span className="text-[8px] sm:text-[9px] leading-none">{Math.round(entry.amount)}</span>}
            </button>
          );
        })}
      </div>

      {mode === "lancar" && canEdit && (
        <div className="space-y-2 pt-3 border-t border-voya-rose/15">
          <p className="text-xs text-voya-charcoal/60">
            {selectedDates.length === 0
              ? "Toque nos dias que quer lançar."
              : `${selectedDates.length} dia(s) selecionado(s) — o valor será dividido igualmente entre eles.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Valor total"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="input-field sm:max-w-[160px]"
            />
            <input
              type="text"
              placeholder="Observação (opcional)"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="input-field"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="btn-primary whitespace-nowrap"
            >
              {isPending ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}

      {mode === "dias" && (
        <p className="text-xs text-voya-charcoal/60 pt-3 border-t border-voya-rose/15">
          Toque num dia para liberar ou bloquear. Domingos e segundas começam bloqueados por
          padrão — contorno tracejado indica ajuste manual.
        </p>
      )}

      {message && <p className="text-xs text-voya-charcoal/60">{message}</p>}

      {entries.length > 0 && (
        <div className="pt-3 border-t border-voya-rose/15">
          <p className="text-xs font-medium text-voya-charcoal mb-2">Lançamentos do mês</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {entries
              .slice()
              .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
              .map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 text-xs py-1">
                  <span className="truncate">
                    {new Date(e.entry_date + "T00:00:00").toLocaleDateString("pt-BR")} ·{" "}
                    {formatBRL(e.amount)}
                    {e.observation ? ` · ${e.observation}` : ""}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDelete(e.id)}
                      className="text-red-600 hover:underline shrink-0"
                    >
                      remover
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
