import { formatPct, formatBRL } from "@/lib/calculations";

interface Row {
  name: string;
  pct_general: number;
  amount_done?: number;
}

export function RankingTable({
  rows,
  showValues = false,
}: {
  rows: Row[];
  showValues?: boolean;
}) {
  const sorted = [...rows].sort((a, b) => b.pct_general - a.pct_general);
  return (
    <div className="card overflow-x-auto">
      <p className="text-sm font-medium text-voya-charcoal mb-3">Ranking por percentual</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-voya-charcoal/50 text-xs uppercase">
            <th className="pb-2">#</th>
            <th className="pb-2">Profissional</th>
            <th className="pb-2 text-right">% Meta geral</th>
            {showValues && <th className="pb-2 text-right">Realizado</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.name} className="border-t border-voya-rose/10">
              <td className="py-2 text-voya-charcoal/60">{i + 1}º</td>
              <td className="py-2 font-medium">{r.name}</td>
              <td className="py-2 text-right">{formatPct(r.pct_general)}</td>
              {showValues && (
                <td className="py-2 text-right">
                  {r.amount_done !== undefined ? formatBRL(r.amount_done) : "—"}
                </td>
              )}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={showValues ? 4 : 3} className="py-4 text-center text-voya-charcoal/40">
                Sem dados para este mês.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
