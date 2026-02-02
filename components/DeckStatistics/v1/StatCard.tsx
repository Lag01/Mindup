interface StatCardProps {
  label: string;
  value: string | number;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  subtext?: string;
  icon?: React.ReactNode;
}

const colorMap = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  orange: 'text-orange-600',
  purple: 'text-purple-600',
  red: 'text-red-600',
} as const;

export default function StatCard({
  label,
  value,
  color,
  subtext,
  icon
}: StatCardProps) {
  const valueColor = color ? colorMap[color] : 'text-foreground';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800 transition-colors">
      {icon && (
        <div className="mb-3 text-zinc-400">
          {icon}
        </div>
      )}

      <div className="text-xs text-zinc-400 uppercase tracking-wide mb-2">
        {label}
      </div>

      <div className={`text-2xl font-bold ${valueColor}`}>
        {value}
      </div>

      {subtext && (
        <div className="text-xs text-zinc-500 mt-1">
          {subtext}
        </div>
      )}
    </div>
  );
}
