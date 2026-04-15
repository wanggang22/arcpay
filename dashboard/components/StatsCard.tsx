export function StatsCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: string }) {
  return (
    <div className="bg-panel border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted uppercase tracking-wider font-semibold">{label}</div>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <div className="text-2xl font-bold mt-2 truncate">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}
