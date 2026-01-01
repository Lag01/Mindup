'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import EditDeckNameModal from '@/components/EditDeckNameModal';
import CreateDeckModal from '@/components/CreateDeckModal';
import DashboardHeader from '@/components/DashboardHeader';
import LoadingAnimation from '@/components/LoadingAnimation';
import { DeckWithStats } from '@/lib/types';
import { useDebounce } from '@/hooks/useDebounce';
import { useUser } from '@/hooks/useUser';

export default function Dashboard() {
  const [decks, setDecks] = useState<DeckWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Regroupement des états UI pour réduire les re-renders
  const [uiState, setUIState] = useState({
    isCreatingDeck: false,
    isMobileMenuOpen: false,
    openDropdown: null as string | null,
    editingDeck: null as { id: string; name: string } | null,
  });

  // Regroupement des états d'opérations en cours
  const [operations, setOperations] = useState({
    deleting: null as string | null,
    resettingStats: null as string | null,
  });

  const router = useRouter();

  // Utiliser le hook useUser au lieu de fetchUser() - élimine le double fetch
  const { isAdmin } = useUser();

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      const response = await fetch('/api/decks');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch decks');
      }
      const data = await response.json();
      setDecks(data.decks);
    } catch (error) {
      console.error('Error fetching decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDelete = async (deckId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce deck ?')) {
      return;
    }

    setOperations(prev => ({ ...prev, deleting: deckId }));
    try {
      const response = await fetch(`/api/decks?id=${deckId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete deck');
      }

      setDecks(decks.filter(d => d.id !== deckId));
    } catch (error) {
      console.error('Error deleting deck:', error);
      alert('Erreur lors de la suppression du deck');
    } finally {
      setOperations(prev => ({ ...prev, deleting: null }));
    }
  };

  const handleRenameSuccess = (deckId: string, newName: string) => {
    setDecks(decks.map(d => d.id === deckId ? { ...d, name: newName } : d));
  };

  const handleCreateSuccess = async (deck: { id: string; name: string }) => {
    // Rafraîchir la liste des decks pour obtenir les stats complètes
    await fetchDecks();
    // Rediriger vers la page d'ajout de cartes
    router.push(`/deck/${deck.id}/add`);
  };

  const handleExport = async (deckId: string, format: 'xml' | 'csv') => {
    try {
      const response = await fetch(`/api/decks/${deckId}/export?format=${format}`);

      if (!response.ok) {
        throw new Error('Failed to export deck');
      }

      // Créer un blob à partir de la réponse
      const blob = await response.blob();

      // Créer un lien temporaire pour télécharger le fichier
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extraire le nom du fichier depuis les headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `deck.${format}`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Nettoyer
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting deck:', error);
      alert('Erreur lors de l\'export du deck');
    }
  };

  const handleResetStats = async (deckId: string) => {
    if (!confirm('Voulez-vous réinitialiser toutes les statistiques de ce deck ? Cette action est irréversible. Toutes les révisions et notes seront supprimées.')) {
      return;
    }

    setOperations(prev => ({ ...prev, resettingStats: deckId }));
    try {
      const response = await fetch(`/api/decks/${deckId}/reset-stats`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reset stats');
      }

      alert('Statistiques réinitialisées avec succès');
    } catch (error) {
      console.error('Error resetting stats:', error);
      alert('Erreur lors de la réinitialisation des statistiques');
    } finally {
      setOperations(prev => ({ ...prev, resettingStats: null }));
    }
  };

  // Debounce de la recherche pour éviter les recalculs trop fréquents
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Mémoriser le filtrage pour éviter les recalculs inutiles
  const filteredDecks = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return decks;
    }
    const query = debouncedSearchQuery.toLowerCase();
    return decks.filter(deck =>
      deck.name.toLowerCase().includes(query)
    );
  }, [decks, debouncedSearchQuery]);

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        isAdmin={isAdmin}
        onCreateDeck={() => setUIState(prev => ({ ...prev, isCreatingDeck: true }))}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearch={decks.length > 0}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {decks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg mb-4">
              Vous n'avez pas encore de decks
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setUIState(prev => ({ ...prev, isCreatingDeck: true }))}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Créer un deck vide
              </button>
              <button
                onClick={() => router.push('/import')}
                className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Importer un deck
              </button>
            </div>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg mb-4">
              Aucun deck trouvé pour "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Effacer la recherche
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDecks.map(deck => (
              <div
                key={deck.id}
                className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 hover:border-zinc-700 transition-all shadow-lg hover:shadow-xl flex flex-col"
              >
                {/* En-tête avec titre et menu dropdown */}
                <div className="flex items-start justify-between mb-4 flex-1">
                  <div className="flex-1">
                    <div className="flex items-start gap-2 mb-2">
                      <h2 className="text-xl font-semibold text-foreground line-clamp-2 flex-1">
                        {deck.name}
                      </h2>
                      {deck.learningMethod === 'ANKI' && (
                        <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded-md border border-purple-700 whitespace-nowrap">
                          Anki
                        </span>
                      )}
                      {deck.isImported && (
                        <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded-md border border-blue-700 whitespace-nowrap">
                          Deck Importé
                        </span>
                      )}
                    </div>

                    {/* Statistiques selon la méthode d'apprentissage */}
                    {deck.learningMethod === 'ANKI' && deck.ankiStats ? (
                      <div className="space-y-1">
                        <p className="text-blue-400 text-sm font-medium">
                          {deck.totalCards} carte{deck.totalCards > 1 ? 's' : ''}
                        </p>
                        <div className="flex gap-2 text-xs flex-wrap max-w-full">
                          <span className="text-orange-400 whitespace-nowrap">
                            {deck.ankiStats.new} nouv.
                          </span>
                          <span className="text-yellow-400 whitespace-nowrap">
                            {deck.ankiStats.learning} appr.
                          </span>
                          <span className="text-green-400 whitespace-nowrap">
                            {deck.ankiStats.review} maît.
                          </span>
                        </div>

                        {/* Cartes dues aujourd'hui (highlight si > 0) */}
                        {deck.ankiStats.due > 0 ? (
                          <div className="mt-2 inline-block px-2 py-1 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm font-medium max-w-full truncate">
                            {deck.ankiStats.due} carte{deck.ankiStats.due > 1 ? 's' : ''} à réviser
                          </div>
                        ) : (
                          <div className="mt-2 text-zinc-500 text-sm">
                            Aucune révision aujourd'hui
                          </div>
                        )}

                        {deck.isImported && (
                          <p className="text-purple-400 text-xs mt-2">
                            Synchronisé avec le deck public
                          </p>
                        )}
                      </div>
                    ) : (
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
                    )}
                  </div>

                  {/* Menu dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setUIState(prev => ({ ...prev, openDropdown: prev.openDropdown === deck.id ? null : deck.id }))}
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
                    {uiState.openDropdown === deck.id && (
                      <>
                        {/* Overlay pour fermer le dropdown */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setUIState(prev => ({ ...prev, openDropdown: null }))}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
                          <button
                            onClick={() => {
                              router.push(`/deck/${deck.id}/review?mode=study`);
                              setUIState(prev => ({ ...prev, openDropdown: null }));
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
                              setUIState(prev => ({ ...prev, openDropdown: null }));
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
                              router.push(`/deck/${deck.id}/settings`);
                              setUIState(prev => ({ ...prev, openDropdown: null }));
                            }}
                            className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Paramètres
                          </button>
                          <button
                            onClick={() => {
                              handleResetStats(deck.id);
                              setUIState(prev => ({ ...prev, openDropdown: null }));
                            }}
                            disabled={operations.resettingStats === deck.id}
                            className="w-full text-left px-4 py-3 text-orange-400 hover:bg-orange-900/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {operations.resettingStats === deck.id ? 'Réinitialisation...' : 'Réinitialiser les stats'}
                          </button>
                          {!deck.isImported && (
                            <button
                              onClick={() => {
                                router.push(`/deck/${deck.id}/add`);
                                setUIState(prev => ({ ...prev, openDropdown: null }));
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
                                setUIState(prev => ({ ...prev, editingDeck: { id: deck.id, name: deck.name } }));
                                setUIState(prev => ({ ...prev, openDropdown: null }));
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
                              handleExport(deck.id, 'xml');
                              setUIState(prev => ({ ...prev, openDropdown: null }));
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
                              handleExport(deck.id, 'csv');
                              setUIState(prev => ({ ...prev, openDropdown: null }));
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
                              handleDelete(deck.id);
                              setUIState(prev => ({ ...prev, openDropdown: null }));
                            }}
                            disabled={operations.deleting === deck.id}
                            className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {operations.deleting === deck.id
                              ? (deck.isImported ? 'Retrait...' : 'Suppression...')
                              : (deck.isImported ? 'Retirer le deck' : 'Supprimer')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Boutons principaux */}
                <div className="flex gap-2 mt-auto pt-4">
                  <button
                    onClick={() => router.push(`/deck/${deck.id}/review`)}
                    disabled={deck.learningMethod === 'ANKI' && deck.ankiStats?.due === 0}
                    className={`${deck.isImported ? 'flex-1' : 'flex-[3]'} bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    Réviser
                  </button>

                  {!deck.isImported && (
                    <button
                      onClick={() => router.push(`/deck/${deck.id}/edit`)}
                      className="flex-[1] bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Éditer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Deck Name Modal */}
        {uiState.editingDeck && (
          <EditDeckNameModal
            isOpen={true}
            deckId={uiState.editingDeck.id}
            currentName={uiState.editingDeck.name}
            onClose={() => setUIState(prev => ({ ...prev, editingDeck: null }))}
            onSuccess={(newName) => {
              handleRenameSuccess(uiState.editingDeck!.id, newName);
              setUIState(prev => ({ ...prev, editingDeck: null }));
            }}
          />
        )}

        {/* Create Deck Modal */}
        <CreateDeckModal
          isOpen={uiState.isCreatingDeck}
          onClose={() => setUIState(prev => ({ ...prev, isCreatingDeck: false }))}
          onSuccess={handleCreateSuccess}
        />
      </main>
    </div>
  );
}
