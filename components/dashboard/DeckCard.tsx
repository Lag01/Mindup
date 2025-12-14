'use client';

import { memo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeckCardProps {
  deck: {
    id: string;
    name: string;
    totalCards: number;
    isImported?: boolean;
  };
  onDelete: (deckId: string) => void;
  onRename: (deck: { id: string; name: string }) => void;
  onExport: (deckId: string, format: 'xml' | 'csv') => void;
  onResetStats: (deckId: string) => void;
  deleting: boolean;
  resettingStats: boolean;
}

/**
 * Carte d'un deck dans le dashboard
 * Affiche le nom, le nombre de cartes et un menu d'actions
 */
export const DeckCard = memo(function DeckCard({
  deck,
  onDelete,
  onRename,
  onExport,
  onResetStats,
  deleting,
  resettingStats,
}: DeckCardProps) {
  const [openDropdown, setOpenDropdown] = useState(false);
  const router = useRouter();

  return (
    <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 hover:border-zinc-700 transition-all shadow-lg hover:shadow-xl">
      {/* En-tête avec titre et menu dropdown */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-start gap-2 mb-2">
            <h2 className="text-xl font-semibold text-foreground line-clamp-2 flex-1">
              {deck.name}
            </h2>
            {deck.isImported && (
              <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded-md border border-purple-700 whitespace-nowrap">
                Deck Importé
              </span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-blue-400 text-sm font-medium">
              {deck.totalCards} carte{deck.totalCards > 1 ? 's' : ''}
            </p>
            {deck.isImported && (
              <p className="text-purple-400 text-xs">
                Synchronisé avec le deck public
              </p>
            )}
          </div>
        </div>

        {/* Menu dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(!openDropdown)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Menu d'actions"
          >
            <svg
              className="w-5 h-5 text-zinc-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>

          {/* Dropdown menu */}
          {openDropdown && (
            <>
              {/* Overlay pour fermer le dropdown */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
                <button
                  onClick={() => {
                    router.push(`/deck/${deck.id}/review?mode=study`);
                    setOpenDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Étudier
                </button>
                <button
                  onClick={() => {
                    router.push(`/deck/${deck.id}/stats`);
                    setOpenDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Statistiques
                </button>
                <button
                  onClick={() => {
                    onResetStats(deck.id);
                    setOpenDropdown(false);
                  }}
                  disabled={resettingStats}
                  className="w-full text-left px-4 py-3 text-orange-400 hover:bg-orange-900/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {resettingStats ? 'Réinitialisation...' : 'Réinitialiser les stats'}
                </button>
                {!deck.isImported && (
                  <button
                    onClick={() => {
                      router.push(`/deck/${deck.id}/add`);
                      setOpenDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Ajout rapide
                  </button>
                )}
                {!deck.isImported && (
                  <button
                    onClick={() => {
                      onRename({ id: deck.id, name: deck.name });
                      setOpenDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Renommer
                  </button>
                )}
                <div className="border-t border-zinc-700"></div>
                <button
                  onClick={() => {
                    onExport(deck.id, 'xml');
                    setOpenDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Exporter en XML
                </button>
                <button
                  onClick={() => {
                    onExport(deck.id, 'csv');
                    setOpenDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Exporter en CSV
                </button>
                <div className="border-t border-zinc-700"></div>
                <button
                  onClick={() => {
                    onDelete(deck.id);
                    setOpenDropdown(false);
                  }}
                  disabled={deleting}
                  className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {deleting
                    ? (deck.isImported ? 'Retrait...' : 'Suppression...')
                    : (deck.isImported ? 'Retirer le deck' : 'Supprimer')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Boutons d'action principaux */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => router.push(`/deck/${deck.id}/edit`)}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
        >
          Éditer
        </button>
        <button
          onClick={() => router.push(`/deck/${deck.id}/review`)}
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
        >
          Réviser
        </button>
      </div>
    </div>
  );
});
