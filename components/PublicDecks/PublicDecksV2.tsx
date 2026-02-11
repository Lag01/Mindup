'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingAnimation from '@/components/LoadingAnimation';

interface PublicDeck {
  id: string;
  name: string;
  authorEmail: string;
  authorName: string;
  cardCount: number;
  importCount: number;
  isImported: boolean;
  createdAt: string;
}

export default function PublicDecksV2() {
  const [publicDecks, setPublicDecks] = useState<PublicDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchPublicDecks();
  }, []);

  const fetchPublicDecks = async () => {
    try {
      const response = await fetch('/api/public-decks');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Erreur lors de la récupération des decks publics');
      }
      const data = await response.json();
      setPublicDecks(data.decks);
    } catch (error) {
      console.error('Erreur lors de la récupération des decks publics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (deckId: string) => {
    setImporting(deckId);
    try {
      const response = await fetch(`/api/public-decks/${deckId}/import`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'importation du deck');
      }

      // Rafraîchir la liste pour mettre à jour le statut
      await fetchPublicDecks();
      alert('Deck importé avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'importation:', error);
      alert(error.message || 'Erreur lors de l\'importation du deck');
    } finally {
      setImporting(null);
    }
  };

  const filteredDecks = publicDecks.filter(deck =>
    deck.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    deck.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingAnimation fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* V2 Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Decks Publics</h1>
          <button
            onClick={() => router.push('/dashboard-entry')}
            className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 rounded-lg border border-zinc-700/50 transition-colors"
          >
            Retour au Dashboard
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Rechercher un deck ou un auteur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-foreground placeholder-zinc-500 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/30 transition-all"
            />
          </div>
        </div>

        {/* Empty State */}
        {filteredDecks.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 mb-4">
              <svg
                className="h-8 w-8 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground">
              Aucun deck public trouvé
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              {searchQuery
                ? 'Essayez une autre recherche'
                : 'Il n\'y a pas encore de decks publics disponibles'}
            </p>
          </div>
        )}

        {/* Decks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDecks.map((deck) => (
            <div
              key={deck.id}
              className="bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-zinc-800/50 hover:border-zinc-700/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.05)] transition-all p-6"
            >
              <div className="flex flex-col h-full">
                {/* Deck Name */}
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {deck.name}
                </h3>

                {/* Author */}
                <p className="text-sm text-zinc-400 mb-4">
                  Par : {deck.authorName}
                </p>

                {/* Stats Badges */}
                <div className="flex gap-3 mb-5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-400">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    {deck.cardCount} cartes
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-400">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    {deck.importCount} imports
                  </span>
                </div>

                {/* Action Button */}
                <div className="mt-auto">
                  {deck.isImported ? (
                    <button
                      disabled
                      className="w-full px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl cursor-not-allowed text-sm font-medium"
                    >
                      Déjà importé
                    </button>
                  ) : (
                    <button
                      onClick={() => handleImport(deck.id)}
                      disabled={importing === deck.id}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                    >
                      {importing === deck.id ? 'Importation...' : 'Importer ce deck'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
