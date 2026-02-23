interface StatCardProps {
  label: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  status: 'good' | 'warn' | 'danger' | 'neutral';
}

export default function StatCard({ label, value, unit, icon, status }: StatCardProps) {
  const borderColors = {
    good: 'border-good/20',
    warn: 'border-warn/20',
    danger: 'border-danger/20',
    neutral: 'border-smoke',
  };

  const dotColors = {
    good: 'bg-good',
    warn: 'bg-warn',
    danger: 'bg-danger',
    neutral: 'bg-silver',
  };

  return (
    <div className={`bg-graphite border ${borderColors[status]} rounded-lg p-5 transition-all hover:border-ash`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-silver font-mono text-[10px] tracking-[0.2em] uppercase">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`} />
          <span className="text-ash">{icon}</span>
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-snow tracking-tight font-mono">
          {value}
        </span>
        {unit && (
          <span className="text-silver text-sm font-mono">{unit}</span>
        )}
      </div>
    </div>
  );
}