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
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
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
        ) : (
          <div className="space-y-4">
            {decks.map(deck => (
              <div key={deck.id} className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      {deck.name}
                    </h2>
                    <div className="space-y-1">
                      <p className="text-zinc-400 text-sm">
                        {deck.totalCards} carte{deck.totalCards > 1 ? 's' : ''}
                      </p>
                      <p className="text-blue-400 text-sm font-medium">
                        {deck.dueCards} à réviser
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push(`/deck/${deck.id}/review`)}
                    disabled={deck.dueCards === 0}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {deck.dueCards > 0 ? 'Réviser' : 'Aucune carte'}
                  </button>

                  <button
                    onClick={() => router.push(`/deck/${deck.id}/edit`)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Éditer
                  </button>

                  <button
                    onClick={() => router.push(`/deck/${deck.id}/stats`)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Statistiques
                  </button>

                  <button
                    onClick={() => setEditingDeck({ id: deck.id, name: deck.name })}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Renommer
                  </button>

                  <button
                    onClick={() => handleDelete(deck.id)}
                    disabled={deleting === deck.id}
                    className="bg-red-900/30 hover:bg-red-900/50 text-red-400 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting === deck.id ? '...' : 'Supprimer'}
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
