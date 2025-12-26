'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SimpleHeader from '@/components/SimpleHeader';
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

export default function PublicDecksPage() {
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
    return <LoadingAnimation fullScreen message="Chargement..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SimpleHeader
        title="Decks Publics"
        backButton={{ label: "Retour au Dashboard", href: "/dashboard" }}
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher un deck..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Empty State */}
        {filteredDecks.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Aucun deck public trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex flex-col h-full">
                {/* Deck Name */}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {deck.name}
                </h3>

                {/* Author */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Par : {deck.authorName}
                </p>

                {/* Stats */}
                <div className="flex gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <svg
                      className="h-4 w-4"
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
                    <span>{deck.cardCount} cartes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg
                      className="h-4 w-4"
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
                    <span>{deck.importCount} importations</span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-auto">
                  {deck.isImported ? (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-md cursor-not-allowed"
                    >
                      ✓ Déjà importé
                    </button>
                  ) : (
                    <button
                      onClick={() => handleImport(deck.id)}
                      disabled={importing === deck.id}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
