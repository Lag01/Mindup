interface PeriodSelectorProps {
  selected: '7d' | '30d' | '3m' | 'all';
  onChange: (period: '7d' | '30d' | '3m' | 'all') => void;
}

const periods = [
  { value: '7d' as const, label: '7 jours' },
  { value: '30d' as const, label: '30 jours' },
  { value: '3m' as const, label: '3 mois' },
  { value: 'all' as const, label: 'Tout' },
];

export default function PeriodSelector({
  selected,
  onChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex gap-2">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`
            px-3 py-1.5 text-sm rounded-lg transition-colors
            ${
              selected === period.value
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }
          `}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
