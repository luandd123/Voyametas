export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-voya-charcoal/50 font-medium">
        {label}
      </p>
      <p className="text-2xl font-serif text-voya-charcoal mt-1">{value}</p>
      {sub && <p className="text-xs text-voya-charcoal/50 mt-1">{sub}</p>}
    </div>
  );
}
