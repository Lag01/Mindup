import { ContentType } from '@/lib/types';

interface BulkActionsProps {
  onBulkUpdate: (updateFront: boolean, updateBack: boolean, targetType: ContentType) => void;
  onSwapAll: () => void;
  bulkUpdating: boolean;
  cardCount: number;
}

/**
 * Section des actions en masse pour le deck
 * Permet de changer le type de toutes les cartes ou d'inverser recto/verso
 */
export function BulkActions({ onBulkUpdate, onSwapAll, bulkUpdating, cardCount }: BulkActionsProps) {
  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Actions en masse
      </h2>
      <p className="text-zinc-400 text-sm mb-4">
        Changer le type de formatage de toutes les cartes du deck en une seule fois.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Front cards bulk update */}
        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <h3 className="text-zinc-300 font-medium mb-3">Tous les rectos</h3>
          <div className="flex gap-2">
            <button
              onClick={() => onBulkUpdate(true, false, 'TEXT')}
              disabled={bulkUpdating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              → Texte
            </button>
            <button
              onClick={() => onBulkUpdate(true, false, 'LATEX')}
              disabled={bulkUpdating}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              → LaTeX
            </button>
          </div>
        </div>

        {/* Back cards bulk update */}
        <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
          <h3 className="text-zinc-300 font-medium mb-3">Tous les versos</h3>
          <div className="flex gap-2">
            <button
              onClick={() => onBulkUpdate(false, true, 'TEXT')}
              disabled={bulkUpdating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              → Texte
            </button>
            <button
              onClick={() => onBulkUpdate(false, true, 'LATEX')}
              disabled={bulkUpdating}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              → LaTeX
            </button>
          </div>
        </div>
      </div>

      {/* Swap all cards */}
      <div className="mt-4 bg-zinc-800 rounded-lg p-4 border border-zinc-700">
        <h3 className="text-zinc-300 font-medium mb-3">Inverser toutes les cartes</h3>
        <p className="text-zinc-400 text-sm mb-3">
          Échange le recto et le verso de toutes les cartes du deck (les types de formatage sont également inversés).
        </p>
        <button
          onClick={onSwapAll}
          disabled={bulkUpdating || cardCount === 0}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          Inverser recto ↔ verso
        </button>
      </div>
    </div>
  );
}
