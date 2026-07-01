export function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-voya-charcoal/60 mb-1">
          <span>{label}</span>
          <span>{pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-voya-cream rounded-full overflow-hidden border border-voya-rose/20">
        <div
          className="h-full bg-voya-roseDark rounded-full transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
