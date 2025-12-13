'use client';

interface MetricsCardProps {
  label: string;
  value: string | number;
  description: string;
  colorClass?: string;
}

export default function MetricsCard({
  label,
  value,
  description,
  colorClass = 'text-foreground',
}: MetricsCardProps) {
  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
      <div className="text-zinc-400 text-sm mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-zinc-500 text-xs mt-1">{description}</div>
    </div>
  );
}
