import { useState } from 'react';
import { DuplicateGroup } from '@/lib/types';

interface DuplicateWarningProps {
  duplicates: DuplicateGroup[];
  onSearchDuplicate: (text: string) => void;
}

/**
 * Composant d'avertissement pour les doublons détectés
 * Affiche un résumé collapsible avec possibilité de rechercher chaque doublon
 */
export function DuplicateWarning({ duplicates, onSearchDuplicate }: DuplicateWarningProps) {
  // Retour précoce AVANT les hooks pour respecter les Rules of Hooks de React
  if (duplicates.length === 0) {
    return null;
  }

  // Hook appelé seulement si le composant sera effectivement rendu
  const [showDetails, setShowDetails] = useState(false);

  const uniqueCardsCount = new Set(duplicates.flatMap(d => d.locations.map(l => l.cardId))).size;

  return (
    <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="text-amber-400 text-2xl">⚠️</div>
          <div>
            <h3 className="text-amber-300 font-semibold text-lg">
              Doublons Détectés
            </h3>
            <p className="text-amber-200/70 text-sm mt-1">
              {duplicates.length} texte{duplicates.length > 1 ? 's' : ''} dupliqué{duplicates.length > 1 ? 's' : ''} dans{' '}
              {uniqueCardsCount} carte{uniqueCardsCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="bg-amber-800/30 hover:bg-amber-800/50 text-amber-300 px-4 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
        >
          {showDetails ? 'Masquer ▲' : 'Voir les détails ▼'}
        </button>
      </div>

      {/* Détails (collapsible) */}
      {showDetails && (
        <div className="mt-4 space-y-3">
          {duplicates.map((dup, idx) => {
            const displayText = dup.text.length > 80
              ? dup.text.substring(0, 80) + '...'
              : dup.text;

            return (
              <div key={idx} className="bg-zinc-900 border border-amber-700/30 rounded-lg p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-300 font-medium mb-2">
                      📝 "{displayText}"
                    </div>
                    <div className="text-zinc-400 text-sm">
                      Trouvé dans {dup.count} endroit{dup.count > 1 ? 's' : ''} :{' '}
                      {dup.locations.map((loc, i) => (
                        <span key={i}>
                          {i > 0 && ', '}
                          Carte #{loc.order} ({loc.field === 'front' ? 'recto' : 'verso'})
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onSearchDuplicate(dup.text)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium whitespace-nowrap flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Chercher
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
