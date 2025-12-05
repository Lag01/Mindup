'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type TimePeriod = 'today' | 'week' | 'month' | 'year';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  reviewCount: number;
}

interface LeaderboardData {
  period: TimePeriod;
  startDate: string;
  leaderboard: LeaderboardEntry[];
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchLeaderboard(selectedPeriod);
  }, [selectedPeriod]);

  const fetchLeaderboard = async (period: TimePeriod) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leaderboard?period=${period}`);

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Erreur lors du chargement du leaderboard');
      }

      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Impossible de charger le leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case 'today':
        return "Aujourd'hui";
      case 'week':
        return 'Cette semaine';
      case 'month':
        return 'Ce mois-ci';
      case 'year':
        return 'Cette année';
    }
  };

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'text-yellow-400'; // Or
      case 2:
        return 'text-gray-300'; // Argent
      case 3:
        return 'text-orange-400'; // Bronze
      default:
        return 'text-zinc-400';
    }
  };

  const getRankEmoji = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl">Chargement du leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-bold">
              Classement des Révisions
            </h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Retour au dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs de période */}
        <div className="bg-zinc-900 rounded-lg p-2 mb-8 flex gap-2 overflow-x-auto">
          {(['today', 'week', 'month', 'year'] as TimePeriod[]).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`flex-1 min-w-[120px] px-4 py-3 rounded-lg transition-colors font-medium ${
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
              }`}
            >
              {getPeriodLabel(period)}
            </button>
          ))}
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-8 text-red-200">
            {error}
          </div>
        )}

        {/* Leaderboard */}
        {data && data.leaderboard.length > 0 ? (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/50">
                    <th className="text-left py-4 px-6 text-zinc-400 font-medium w-20">
                      Rang
                    </th>
                    <th className="text-left py-4 px-6 text-zinc-400 font-medium">
                      Utilisateur
                    </th>
                    <th className="text-right py-4 px-6 text-zinc-400 font-medium w-32">
                      Révisions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map(entry => (
                    <tr
                      key={entry.userId}
                      className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td
                        className={`py-4 px-6 font-bold text-xl ${getRankColor(
                          entry.rank
                        )}`}
                      >
                        {getRankEmoji(entry.rank)} {entry.rank}
                      </td>
                      <td className="py-4 px-6 text-white font-medium">
                        {entry.displayName}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex items-center px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full font-semibold">
                          {entry.reviewCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-xl text-zinc-400 mb-2">
              Aucune révision {getPeriodLabel(selectedPeriod).toLowerCase()}
            </p>
            <p className="text-zinc-500">
              Commencez à réviser pour apparaître dans le classement !
            </p>
          </div>
        )}

        {/* Info sur la période */}
        {data && (
          <div className="mt-6 text-center text-zinc-500 text-sm">
            Période : depuis le{' '}
            {new Date(data.startDate).toLocaleString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </main>
    </div>
  );
}
