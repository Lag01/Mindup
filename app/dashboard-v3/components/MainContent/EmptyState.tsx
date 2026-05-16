'use client';

export type EmptyStateType = 'no-decks' | 'no-results';

interface EmptyStateProps {
  type: EmptyStateType;
  searchQuery?: string;
  onCreateDeck?: () => void;
  onImportDeck?: () => void;
  onClearSearch?: () => void;
}

export default function EmptyState({
  type,
  searchQuery,
  onCreateDeck,
  onImportDeck,
  onClearSearch,
}: EmptyStateProps) {
  const isNoDecks = type === 'no-decks';

  return (
    <section
      className="flex items-center justify-center min-h-[500px] py-12 px-4"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-md w-full text-center">
        {/* Illustration SVG */}
        <div className="mb-8 opacity-0 animate-[fadeInScale_0.5s_ease-out_forwards]">
          {isNoDecks ? (
            // Terminal vide avec prompt
            <svg
              className="w-32 h-32 mx-auto"
              viewBox="0 0 128 128"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Glow effect */}
              <defs>
                <filter id="glow-empty">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Terminal window */}
              <rect
                x="8"
                y="16"
                width="112"
                height="96"
                rx="8"
                fill="rgba(24, 24, 27, 0.5)"
                stroke="rgba(59, 130, 246, 0.3)"
                strokeWidth="2"
              />

              {/* Terminal header dots */}
              <circle cx="20" cy="28" r="3" fill="rgba(239, 68, 68, 0.6)" />
              <circle cx="32" cy="28" r="3" fill="rgba(234, 179, 8, 0.6)" />
              <circle cx="44" cy="28" r="3" fill="rgba(34, 197, 94, 0.6)" />

              {/* Empty folder icon in center */}
              <path
                d="M 40 50 L 40 90 L 88 90 L 88 58 L 70 58 L 64 50 Z"
                fill="none"
                stroke="rgba(59, 130, 246, 0.6)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow-empty)"
              />

              {/* Dashed lines inside folder */}
              <line x1="48" y1="64" x2="72" y2="64" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="48" y1="72" x2="80" y2="72" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="48" y1="80" x2="68" y2="80" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
            </svg>
          ) : (
            // Loupe avec X (no results)
            <svg
              className="w-32 h-32 mx-auto"
              viewBox="0 0 128 128"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Glow effect */}
              <defs>
                <filter id="glow-search">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Search circle */}
              <circle
                cx="52"
                cy="52"
                r="28"
                fill="none"
                stroke="rgba(59, 130, 246, 0.6)"
                strokeWidth="3"
                filter="url(#glow-search)"
              />

              {/* Search handle */}
              <line
                x1="72"
                y1="72"
                x2="96"
                y2="96"
                stroke="rgba(59, 130, 246, 0.6)"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#glow-search)"
              />

              {/* X inside */}
              <line
                x1="42"
                y1="42"
                x2="62"
                y2="62"
                stroke="rgba(239, 68, 68, 0.7)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <line
                x1="62"
                y1="42"
                x2="42"
                y2="62"
                stroke="rgba(239, 68, 68, 0.7)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Scan lines */}
              <line x1="30" y1="46" x2="74" y2="46" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="1" />
              <line x1="30" y1="52" x2="74" y2="52" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="1" />
              <line x1="30" y1="58" x2="74" y2="58" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="1" />
            </svg>
          )}
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold text-zinc-100 mb-3 opacity-0 animate-[slideUp_0.5s_ease-out_0.1s_forwards]"
         
        >
          {isNoDecks ? 'Aucun deck créé' : 'Aucun résultat trouvé'}
        </h2>

        {/* Description */}
        <p
          className="text-base text-zinc-400 mb-8 leading-relaxed opacity-0 animate-[slideUp_0.5s_ease-out_0.2s_forwards]"
         
        >
          {isNoDecks ? (
            <>
              Commencez votre apprentissage en créant votre premier deck de cartes
              <br />
              ou en important un deck existant.
            </>
          ) : (
            <>
              Aucun deck ne correspond à votre recherche{' '}
              {searchQuery && (
                <span className="text-blue-400 font-semibold">« {searchQuery} »</span>
              )}
            </>
          )}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center opacity-0 animate-[slideUp_0.5s_ease-out_0.3s_forwards]">
          {isNoDecks ? (
            <>
              {/* Primary: Create Deck */}
              <button
                onClick={onCreateDeck}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                aria-label="Créer un nouveau deck"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Créer un deck
                </span>
              </button>

              {/* Secondary: Import Deck */}
              <button
                onClick={onImportDeck}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                aria-label="Importer un deck existant"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Importer un deck
                </span>
              </button>
            </>
          ) : (
            // Clear search button
            <button
              onClick={onClearSearch}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              aria-label="Effacer la recherche"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Effacer la recherche
              </span>
            </button>
          )}
        </div>

      </div>

      <style jsx global>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
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
    </section>
  );
}
