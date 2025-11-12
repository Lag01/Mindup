'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DeckStatistics from '@/components/DeckStatistics';

export default function DeckStatsPage() {
  const params = useParams();
  const deckId = params.id as string;
  const [deckName, setDeckName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDeckName();
  }, [deckId]);

  const fetchDeckName = async () => {
    try {
      const response = await fetch(`/api/decks/${deckId}/cards`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch deck');
      }
      const data = await response.json();
      setDeckName(data.deck.name);
    } catch (error) {
      console.error('Error fetching deck:', error);
    } finally {
      setLoading(false);
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
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-zinc-400 hover:text-foreground text-sm mb-2 transition-colors"
            >
              ← Retour au dashboard
            </button>
            <h1 className="text-2xl font-bold text-foreground">
              Statistiques : {deckName}
            </h1>
          </div>
        </div>
      </header>

      {/* Statistics Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <DeckStatistics deckId={deckId} />
      </main>
    </div>
  );
}
