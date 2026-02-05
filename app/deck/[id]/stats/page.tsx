'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/Skeleton';
import LoadingAnimation from '@/components/LoadingAnimation';

// Lazy-load DeckStatistics avec Recharts pour réduire le bundle initial
const DeckStatistics = dynamic(() => import('@/components/DeckStatistics'), {
  loading: () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Skeleton className="h-64 w-full mb-6" />
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  ),
  ssr: false,
});

const DeckStatisticsV1 = dynamic(() => import('@/components/DeckStatistics/DeckStatisticsV1'), {
  loading: () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Skeleton className="h-64 w-full mb-6" />
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  ),
  ssr: false,
});

export default function DeckStatsPage() {
  const params = useParams();
  const deckId = params.id as string;
  const [deckName, setDeckName] = useState('');
  const [loading, setLoading] = useState(true);
  const [resettingStats, setResettingStats] = useState(false);
  const [dashboardVersion, setDashboardVersion] = useState<string | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDeckName();
    fetchDashboardVersion();
  }, [deckId]);

  const fetchDashboardVersion = async () => {
    try {
      const response = await fetch('/api/user/dashboard-preference');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard version');
      }
      const data = await response.json();
      setDashboardVersion(data.dashboardVersion);
    } catch (error) {
      console.error('Error fetching dashboard version:', error);
      // Fallback to v2 if error
      setDashboardVersion('v2');
    } finally {
      setLoadingVersion(false);
    }
  };

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

  if (loading || loadingVersion) {
    return <LoadingAnimation fullScreen />;
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Enhanced Header */}
      <header className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-900/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* Breadcrumbs */}
          <nav className="mb-4 flex items-center gap-2 text-sm">
            <button
              onClick={() => router.push('/dashboard-entry')}
              className="text-zinc-400 transition-colors hover:text-cyan-400"
            >
              Dashboard
            </button>
            <span className="text-zinc-600">/</span>
            <button
              onClick={() => router.push(`/deck/${deckId}/edit`)}
              className="text-zinc-400 transition-colors hover:text-cyan-400"
            >
              {deckName}
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-foreground">Statistiques</span>
          </nav>

          {/* Title & Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Statistiques
                </h1>
                <p className="text-sm text-zinc-400">{deckName}</p>
              </div>
            </div>

            <button
              onClick={handleResetStats}
              disabled={resettingStats}
              className="group flex items-center gap-2 rounded-lg border border-orange-700/30 bg-orange-900/20 px-4 py-2 font-medium text-orange-400 transition-all hover:border-orange-600/50 hover:bg-orange-900/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                className="h-4 w-4 transition-transform group-hover:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {resettingStats ? 'Réinitialisation...' : 'Réinitialiser'}
            </button>
          </div>
        </div>
      </header>

      {/* Statistics Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {dashboardVersion === 'v1' ? (
          <DeckStatisticsV1 deckId={deckId} />
        ) : (
          <DeckStatistics deckId={deckId} />
        )}
      </main>
    </div>
  );
}
