"use client";

import { useTransition } from "react";
import { toggleMonthLock } from "./actions";

export default function MonthLockRow({
  month,
  year,
  label,
  isUnlocked,
}: {
  month: number;
  year: number;
  label: string;
  isUnlocked: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const fd = new FormData();
    fd.set("month", String(month));
    fd.set("year", String(year));
    fd.set("isUnlocked", String(!isUnlocked));
    startTransition(async () => {
      await toggleMonthLock(fd);
    });
  }

  return (
    <div className="py-3 flex items-center justify-between">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <span
          className={
            isUnlocked
              ? "text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "text-xs px-2 py-1 rounded-full bg-voya-cream text-voya-charcoal/60 border border-voya-rose/20"
          }
        >
          {isUnlocked ? "Liberado" : "Bloqueado"}
        </span>
        <button onClick={toggle} disabled={isPending} className="btn-secondary text-xs px-3 py-1.5">
          {isUnlocked ? "Bloquear" : "Liberar"}
        </button>
      </div>
    </div>
  );
}
