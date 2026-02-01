'use client';

import type { FilterType } from '../hooks/useDeckFilters';

interface QuickFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  dueDecksCount: number;
}

interface FilterConfig {
  type: FilterType;
  label: string;
  icon: string;
  color: {
    border: string;
    bg: string;
    text: string;
    glow: string;
  };
}

export default function QuickFilters({
  activeFilter,
  onFilterChange,
  dueDecksCount,
}: QuickFiltersProps) {
  const filters: FilterConfig[] = [
    {
      type: 'all',
      label: 'ALL',
      icon: '⊞',
      color: {
        border: 'border-cyan-500/50',
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-400',
        glow: 'shadow-cyan-500/30',
      },
    },
    {
      type: 'anki',
      label: 'ANKI',
      icon: '◈',
      color: {
        border: 'border-purple-500/50',
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        glow: 'shadow-purple-500/30',
      },
    },
    {
      type: 'due',
      label: 'À RÉVISER',
      icon: '⚡',
      color: {
        border: dueDecksCount > 0 ? 'border-red-500/50' : 'border-green-500/50',
        bg: dueDecksCount > 0 ? 'bg-red-500/10' : 'bg-green-500/10',
        text: dueDecksCount > 0 ? 'text-red-400' : 'text-green-400',
        glow: dueDecksCount > 0 ? 'shadow-red-500/30' : 'shadow-green-500/30',
      },
    },
    {
      type: 'imported',
      label: 'IMPORTED',
      icon: '↓',
      color: {
        border: 'border-blue-500/50',
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        glow: 'shadow-blue-500/30',
      },
    },
  ];

  return (
    <nav className="mb-6 opacity-0 animate-[slideInFromTop_0.5s_ease-out_0.4s_forwards]" aria-label="Filtres rapides">
      <div className="flex flex-wrap gap-3">
        {filters.map((filter, index) => {
          const isActive = activeFilter === filter.type;

          return (
            <button
              key={filter.type}
              onClick={() => onFilterChange(filter.type)}
              className={`
                relative px-4 py-2 rounded-md border transition-all duration-200 font-mono
                ${isActive
                  ? `${filter.color.border} ${filter.color.bg} ${filter.color.text} shadow-lg ${filter.color.glow}`
                  : 'border-zinc-700/50 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/50'
                }
                hover:scale-[1.02] active:scale-[0.98]
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 ${isActive ? `focus:ring-${filter.color.text.split('-')[1]}-500/50` : 'focus:ring-zinc-500/50'}
              `}
              aria-pressed={isActive}
              aria-label={`Filtrer par ${filter.label.toLowerCase()}`}
              style={{
                animationDelay: `${0.4 + index * 0.05}s`,
              }}
            >
              {/* Glow effect pour active state */}
              {isActive && (
                <div className={`absolute inset-0 rounded-md ${filter.color.bg} blur-md opacity-50 -z-10 animate-[pulse_2s_ease-in-out_infinite]`} />
              )}

              {/* Corner LED indicator */}
              {isActive && (
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-current opacity-80 animate-[pulse_2s_ease-in-out_infinite]" />
              )}

              <div className="flex items-center gap-2">
                {/* Icon */}
                <span className={`text-lg ${isActive ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}`}>
                  {filter.icon}
                </span>

                {/* Label */}
                <span className="text-sm font-medium tracking-wider">
                  {filter.label}
                </span>

                {/* Count badge pour Due Today */}
                {filter.type === 'due' && dueDecksCount > 0 && (
                  <span
                    className="ml-1 px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded-full text-xs font-bold text-red-300 tabular-nums animate-[pulse_2s_ease-in-out_infinite]"
                    aria-label={`${dueDecksCount} decks avec cartes à réviser`}
                  >
                    {dueDecksCount}
                  </span>
                )}
              </div>

              {/* Active state underline */}
              {isActive && (
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 ${filter.color.text.replace('text-', 'bg-')} rounded-full`} />
              )}

              {/* Scanline effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-md" />
            </button>
          );
        })}
      </div>

      {/* Terminal-style prompt indicator */}
      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
        <span className="text-cyan-500/60">$</span>
        <span>filter --mode={activeFilter}</span>
        <span className="inline-block w-2 h-3 bg-cyan-500/60 animate-[blink_1s_step-end_infinite] ml-0.5" />
      </div>

      <style jsx global>{`
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }
      `}</style>
    </nav>
  );
}
