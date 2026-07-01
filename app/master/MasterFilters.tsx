"use client";

import { useRouter } from "next/navigation";
import { MONTH_NAMES } from "@/lib/calculations";
import type { Professional } from "@/lib/types";

export default function MasterFilters({
  month,
  year,
  professionalId,
  week,
  professionals,
}: {
  month: number;
  year: number;
  professionalId: string;
  week: string;
  professionals: Professional[];
}) {
  const router = useRouter();
  const years = [year - 1, year, year + 1];

  function update(next: { month?: number; year?: number; prof?: string; week?: string }) {
    const params = new URLSearchParams();
    params.set("month", String(next.month ?? month));
    params.set("year", String(next.year ?? year));
    const prof = next.prof !== undefined ? next.prof : professionalId;
    const week_ = next.week !== undefined ? next.week : week;
    if (prof) params.set("prof", prof);
    if (week_) params.set("week", week_);
    router.push(`/master?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select className="input-field w-auto" value={month} onChange={(e) => update({ month: Number(e.target.value) })}>
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select className="input-field w-auto" value={year} onChange={(e) => update({ year: Number(e.target.value) })}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        className="input-field w-auto"
        value={professionalId}
        onChange={(e) => update({ prof: e.target.value })}
      >
        <option value="">Todas as profissionais</option>
        {professionals.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select className="input-field w-auto" value={week} onChange={(e) => update({ week: e.target.value })}>
        <option value="">Mês todo</option>
        <option value="1">Semana 1</option>
        <option value="2">Semana 2</option>
        <option value="3">Semana 3</option>
        <option value="4">Semana 4</option>
        <option value="5">Semana 5</option>
      </select>
    </div>
  );
}
