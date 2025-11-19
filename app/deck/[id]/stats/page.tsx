'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DeckStatistics from '@/components/DeckStatistics';

export default function DeckStatsPage() {
  const params = useParams();
  const deckId = params.id as string;
  const [deckName, setDeckName] = useState('');
  const [loading, setLoading] = useState(true);
  const [resettingStats, setResettingStats] = useState(false);
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

  const handleResetStats = async () => {
    if (!confirm('Voulez-vous réinitialiser toutes les statistiques de ce deck ? Cette action est irréversible. Toutes les révisions et notes seront supprimées.')) {
      return;
    }

    setResettingStats(true);
    try {
      const response = await fetch(`/api/decks/${deckId}/reset-stats`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reset stats');
      }

      alert('Statistiques réinitialisées avec succès');
      // Recharger la page pour actualiser les statistiques
      window.location.reload();
    } catch (error) {
      console.error('Error resetting stats:', error);
      alert('Erreur lors de la réinitialisation des statistiques');
      setResettingStats(false);
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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-start gap-4">
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
            <button
              onClick={handleResetStats}
              disabled={resettingStats}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mt-6"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {resettingStats ? 'Réinitialisation...' : 'Réinitialiser les stats'}
            </button>
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
