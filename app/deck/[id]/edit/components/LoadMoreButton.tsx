interface LoadMoreButtonProps {
  loading: boolean;
  disabled: boolean;
  remainingCards: number;
  onClick: () => void;
}

/**
 * Bouton "Charger plus" avec design MINDUP
 * Affiche le nombre de cartes restantes et un état de chargement
 */
export function LoadMoreButton({
  loading,
  disabled,
  remainingCards,
  onClick,
}: LoadMoreButtonProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      {/* Compteur de cartes */}
      <p className="text-zinc-300 text-sm">
        {remainingCards > 0 && (
          <span>
            Encore <span className="font-semibold text-cyan-400">{remainingCards}</span> carte{remainingCards > 1 ? 's' : ''} à charger
          </span>
        )}
      </p>

      {/* Bouton principal */}
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`
          px-6 py-3 rounded-lg font-medium
          transition-all duration-200 ease-out
          flex items-center gap-2
          ${disabled || loading
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
            : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5 active:scale-98'
          }
        `}
      >
        {loading ? (
          <>
            {/* Spinner de chargement */}
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Chargement...</span>
          </>
        ) : (
          <>
            {/* Icône flèche bas */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>Charger plus de cartes</span>
          </>
        )}
      </button>
    </div>
  );
}
