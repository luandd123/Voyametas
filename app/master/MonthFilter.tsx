"use client";

import { useRouter } from "next/navigation";
import { MONTH_NAMES } from "@/lib/calculations";

export default function MonthFilter({ month, year }: { month: number; year: number }) {
  const router = useRouter();

  function update(newMonth: number, newYear: number) {
    router.push(`/master?month=${newMonth}&year=${newYear}`);
  }

  const years = [year - 1, year, year + 1];

  return (
    <div className="flex gap-2">
      <select
        className="input-field w-auto"
        value={month}
        onChange={(e) => update(Number(e.target.value), year)}
      >
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        className="input-field w-auto"
        value={year}
        onChange={(e) => update(month, Number(e.target.value))}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
