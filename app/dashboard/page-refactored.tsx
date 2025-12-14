'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import EditDeckNameModal from '@/components/EditDeckNameModal';
import CreateDeckModal from '@/components/CreateDeckModal';
import { DeckList } from '@/components/dashboard/DeckList';
import { useDebounce } from '@/hooks/useDebounce';
import { useDecks } from '@/hooks/useDecks';
import { useUser } from '@/hooks/useUser';

export default function DashboardRefactored() {
  const [editingDeck, setEditingDeck] = useState<{ id: string; name: string } | null>(null);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [resettingStatsDeckId, setResettingStatsDeckId] = useState<string | null>(null);

  const router = useRouter();
  const { decks, loading, deleteDeck, renameDeck } = useDecks();
  const { user } = useUser();

  // Debounce de la recherche
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Filtrage des decks
  const filteredDecks = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return decks;
    }
    const query = debouncedSearchQuery.toLowerCase();
    return decks.filter(deck => deck.name.toLowerCase().includes(query));
  }, [decks, debouncedSearchQuery]);

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
    await deleteDeck(deckId);
  };

  const handleRename = (deck: { id: string; name: string }) => {
    setEditingDeck(deck);
  };

  const handleRenameSuccess = async (newName: string) => {
    if (editingDeck) {
      await renameDeck(editingDeck.id, newName);
      setEditingDeck(null);
    }
  };

  const handleCreateSuccess = async (deck: { id: string; name: string }) => {
    router.push(`/deck/${deck.id}/add`);
  };

  const handleExport = async (deckId: string, format: 'xml' | 'csv') => {
    try {
      const response = await fetch(`/api/decks/${deckId}/export?format=${format}`);
      if (!response.ok) throw new Error('Failed to export deck');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `deck.${format}`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting deck:', error);
      alert('Erreur lors de l\'export du deck');
    }
  };

  const handleResetStats = async (deckId: string) => {
    if (!confirm('Voulez-vous réinitialiser toutes les statistiques de ce deck ? Cette action est irréversible.')) {
      return;
    }

    setResettingStatsDeckId(deckId);
    try {
      const response = await fetch(`/api/decks/${deckId}/reset-stats`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to reset stats');
      alert('Statistiques réinitialisées avec succès');
    } catch (error) {
      console.error('Error resetting stats:', error);
      alert('Erreur lors de la réinitialisation des statistiques');
    } finally {
      setResettingStatsDeckId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mes Decks</h1>

            {/* Boutons desktop */}
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => router.push('/public-decks')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                Decks Publics
              </button>
              <button
                onClick={() => router.push('/leaderboard')}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                Classement
              </button>
              <button
                onClick={() => router.push('/veryfastmath')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                Défis VeryFastMath
              </button>
              <button
                onClick={() => setIsCreatingDeck(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
              >
                <span className="text-lg">+</span> Créer un deck
              </button>
              <button
                onClick={() => router.push('/import')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                Importer un deck
              </button>
              {user?.isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  Administration
                </button>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                Déconnexion
              </button>
            </div>

            {/* Bouton burger mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Menu mobile */}
          {isMobileMenuOpen && (
            <div className="md:hidden mb-4 bg-zinc-800 rounded-lg p-3 flex flex-col gap-2">
              <button onClick={() => { router.push('/public-decks'); setIsMobileMenuOpen(false); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm text-left">Decks Publics</button>
              <button onClick={() => { router.push('/leaderboard'); setIsMobileMenuOpen(false); }} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm text-left">Classement</button>
              <button onClick={() => { router.push('/veryfastmath'); setIsMobileMenuOpen(false); }} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors text-sm text-left">Défis VeryFastMath</button>
              <button onClick={() => { setIsCreatingDeck(true); setIsMobileMenuOpen(false); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"><span className="text-lg">+</span> Créer un deck</button>
              <button onClick={() => { router.push('/import'); setIsMobileMenuOpen(false); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors text-sm text-left">Importer un deck</button>
              {user?.isAdmin && <button onClick={() => { router.push('/admin'); setIsMobileMenuOpen(false); }} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors text-sm text-left">Administration</button>}
              <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm text-left">Déconnexion</button>
            </div>
          )}

          {/* Barre de recherche */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un deck..."
              className="w-full bg-zinc-800 text-foreground px-4 py-3 pr-10 rounded-lg border border-zinc-700 focus:border-blue-500 focus:outline-none transition-colors"
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {decks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg mb-4">Vous n'avez pas encore de decks</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setIsCreatingDeck(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors">Créer un deck vide</button>
              <button onClick={() => router.push('/import')} className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-lg transition-colors">Importer un deck</button>
            </div>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg mb-4">Aucun deck trouvé pour "{searchQuery}"</p>
            <button onClick={() => setSearchQuery('')} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium px-6 py-3 rounded-lg transition-colors">Effacer la recherche</button>
          </div>
        ) : (
          <DeckList
            decks={filteredDecks}
            onDelete={handleDelete}
            onRename={handleRename}
            onExport={handleExport}
            onResetStats={handleResetStats}
            deletingDeckId={null}
            resettingStatsDeckId={resettingStatsDeckId}
          />
        )}

        {/* Modals */}
        {editingDeck && (
          <EditDeckNameModal
            isOpen={true}
            deckId={editingDeck.id}
            currentName={editingDeck.name}
            onClose={() => setEditingDeck(null)}
            onSuccess={handleRenameSuccess}
          />
        )}

        <CreateDeckModal
          isOpen={isCreatingDeck}
          onClose={() => setIsCreatingDeck(false)}
          onSuccess={handleCreateSuccess}
        />
      </main>
    </div>
  );
}
