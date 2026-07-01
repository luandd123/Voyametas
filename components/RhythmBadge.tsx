import type { RhythmStatus } from "@/lib/types";
import clsx from "clsx";

const CONFIG: Record<RhythmStatus, { label: string; className: string }> = {
  abaixo: { label: "Abaixo do ritmo", className: "bg-red-50 text-red-700 border-red-200" },
  dentro: { label: "Dentro do ritmo", className: "bg-amber-50 text-amber-700 border-amber-200" },
  acima: { label: "Acima do ritmo", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export function RhythmBadge({ status }: { status: RhythmStatus }) {
  const c = CONFIG[status];
  return (
    <span className={clsx("text-xs font-medium px-2.5 py-1 rounded-full border", c.className)}>
      {c.label}
    </span>
  );
}
