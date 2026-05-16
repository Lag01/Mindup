'use client';

import type { FilterType } from '../../hooks/useDeckFilters';

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
      label: 'Tous',
      icon: '⊞',
      color: {
        border: 'border-blue-500/50',
        bg: 'bg-blue-600/10',
        text: 'text-blue-400',
      },
    },
    {
      type: 'anki',
      label: 'Anki',
      icon: '◈',
      color: {
        border: 'border-purple-500/50',
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
      },
    },
    {
      type: 'due',
      label: 'À réviser',
      icon: '⚡',
      color: {
        border: dueDecksCount > 0 ? 'border-red-500/50' : 'border-green-500/50',
        bg: dueDecksCount > 0 ? 'bg-red-500/10' : 'bg-green-500/10',
        text: dueDecksCount > 0 ? 'text-red-400' : 'text-green-400',
      },
    },
    {
      type: 'imported',
      label: 'Importés',
      icon: '↓',
      color: {
        border: 'border-blue-500/50',
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
      },
    },
  ];

  return (
    <nav className="mb-6 opacity-0 animate-[slideInFromTop_0.5s_ease-out_0.4s_forwards]" aria-label="Filtres rapides">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter, index) => {
          const isActive = activeFilter === filter.type;

          return (
            <button
              key={filter.type}
              onClick={() => onFilterChange(filter.type)}
              className={`
                relative px-4 py-2 rounded-lg border transition-colors duration-200
                ${isActive
                  ? `${filter.color.border} ${filter.color.bg} ${filter.color.text}`
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-700 hover:text-zinc-200'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900
              `}
              aria-pressed={isActive}
              aria-label={`Filtrer par ${filter.label.toLowerCase()}`}
              style={{
                animationDelay: `${0.4 + index * 0.05}s`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{filter.icon}</span>
                <span className="text-sm font-medium">{filter.label}</span>

                {/* Count badge pour À réviser */}
                {filter.type === 'due' && dueDecksCount > 0 && (
                  <span
                    className="ml-1 px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded-full text-xs font-bold text-red-300 tabular-nums"
                    aria-label={`${dueDecksCount} decks avec cartes à réviser`}
                  >
                    {dueDecksCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
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
      `}</style>
    </nav>
  );
}
