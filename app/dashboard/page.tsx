'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EditDeckNameModal from '@/components/EditDeckNameModal';

interface Deck {
  id: string;
  name: string;
  totalCards: number;
  dueCards: number;
  createdAt: string;
}

export default function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingDeck, setEditingDeck] = useState<{ id: string; name: string } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

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

    setDeleting(deckId);
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
      setDeleting(null);
    }
  };

  const handleRenameSuccess = (deckId: string, newName: string) => {
    setDecks(decks.map(d => d.id === deckId ? { ...d, name: newName } : d));
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground text-lg">Chargement...</div>
      </div>
    );
  }

  // Filtrer les decks selon la recherche
  const filteredDecks = decks.filter(deck =>
    deck.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-foreground">Mes Decks</h1>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/import')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Importer un deck
              </button>
              <button
                onClick={handleLogout}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>

          {/* Barre de recherche */}
          {decks.length > 0 && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Rechercher un deck..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {decks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg mb-4">
              Vous n'avez pas encore de decks
            </p>
            <button
              onClick={() => router.push('/import')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Importer votre premier deck
            </button>
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
                className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 hover:border-zinc-700 transition-all shadow-lg hover:shadow-xl"
              >
                {/* En-tête avec titre et menu dropdown */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-foreground mb-2 line-clamp-2">
                      {deck.name}
                    </h2>
                    <div className="space-y-1">
                      <p className="text-blue-400 text-sm font-medium">
                        {deck.totalCards} carte{deck.totalCards > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Menu dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === deck.id ? null : deck.id)}
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
                    {openDropdown === deck.id && (
                      <>
                        {/* Overlay pour fermer le dropdown */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenDropdown(null)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
                          <button
                            onClick={() => {
                              router.push(`/deck/${deck.id}/review?mode=study`);
                              setOpenDropdown(null);
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
                              setOpenDropdown(null);
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
                              setEditingDeck({ id: deck.id, name: deck.name });
                              setOpenDropdown(null);
                            }}
                            className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Renommer
                          </button>
                          <div className="border-t border-zinc-700"></div>
                          <button
                            onClick={() => {
                              handleExport(deck.id, 'xml');
                              setOpenDropdown(null);
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
                              setOpenDropdown(null);
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
                              setOpenDropdown(null);
                            }}
                            disabled={deleting === deck.id}
                            className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {deleting === deck.id ? 'Suppression...' : 'Supprimer'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Boutons principaux */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => router.push(`/deck/${deck.id}/review`)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Réviser
                  </button>

                  <button
                    onClick={() => router.push(`/deck/${deck.id}/edit`)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Éditer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Deck Name Modal */}
        {editingDeck && (
          <EditDeckNameModal
            isOpen={true}
            deckId={editingDeck.id}
            currentName={editingDeck.name}
            onClose={() => setEditingDeck(null)}
            onSuccess={(newName) => {
              handleRenameSuccess(editingDeck.id, newName);
              setEditingDeck(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
