'use client';

import { useState } from 'react';

export type Period = '7d' | '30d' | '3m' | 'all';

interface PeriodSelectorProps {
  selected: Period;
  onChange: (period: Period) => void;
}

const periods: { value: Period; label: string }[] = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '3m', label: '3 mois' },
  { value: 'all', label: 'Tout' },
];

export function PeriodSelector({ selected, onChange }: PeriodSelectorProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-700/50 bg-zinc-900/80 p-1 backdrop-blur-sm">
      {periods.map((period, index) => {
        const isSelected = selected === period.value;
        const isHovered = hoveredIndex === index;

        return (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="group relative overflow-hidden rounded-md px-4 py-2 text-sm font-medium transition-all duration-300"
          >
            {/* Background */}
            <div
              className={`absolute inset-0 transition-all duration-300 ${
                isSelected
                  ? 'bg-gradient-to-br from-blue-600 to-cyan-600 opacity-100'
                  : isHovered
                  ? 'bg-zinc-800 opacity-100'
                  : 'opacity-0'
              }`}
            />

            {/* Glow Effect */}
            {isSelected && (
              <div
                className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-30 blur-lg transition-opacity duration-300 group-hover:opacity-50"
                aria-hidden="true"
              />
            )}

            {/* Text */}
            <span
              className={`relative z-10 transition-colors duration-300 ${
                isSelected
                  ? 'text-white'
                  : 'text-zinc-400 group-hover:text-zinc-200'
              }`}
            >
              {period.label}
            </span>

            {/* Bottom Accent Line */}
            {isSelected && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400" />
            )}
          </button>
        );
      })}

      {/* Sliding Background Indicator */}
      <div
        className="pointer-events-none absolute h-9 rounded-md bg-gradient-to-br from-blue-600/20 to-cyan-600/20 transition-all duration-300 ease-out"
        style={{
          width: `${100 / periods.length}%`,
          left: `${(periods.findIndex(p => p.value === selected) / periods.length) * 100}%`,
        }}
      />
    </div>
  );
}
