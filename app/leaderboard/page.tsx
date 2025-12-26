'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SimpleHeader from '@/components/SimpleHeader';
import LoadingAnimation from '@/components/LoadingAnimation';

type TimePeriod = 'today' | 'week' | 'month' | 'year';
type LeaderboardCategory = 'flashcards' | 'veryfastmath';
type MathMode = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION';

interface FlashcardsLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  reviewCount: number;
}

interface MathLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  bestScore: number;
  achievedAt: string;
}

interface FlashcardsLeaderboardData {
  period: TimePeriod;
  startDate: string;
  leaderboard: FlashcardsLeaderboardEntry[];
}

interface MathLeaderboardData {
  mode: string;
  period: TimePeriod;
  startDate: string;
  leaderboard: MathLeaderboardEntry[];
}

export default function LeaderboardPage() {
  const [category, setCategory] = useState<LeaderboardCategory>('flashcards');
  const [mathMode, setMathMode] = useState<MathMode>('ADDITION');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('today');

  const [flashcardsData, setFlashcardsData] = useState<FlashcardsLeaderboardData | null>(null);
  const [mathData, setMathData] = useState<MathLeaderboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (category === 'flashcards') {
      fetchFlashcardsLeaderboard(selectedPeriod);
    } else {
      fetchMathLeaderboard(mathMode, selectedPeriod);
    }
  }, [category, mathMode, selectedPeriod]);

  const fetchFlashcardsLeaderboard = async (period: TimePeriod) => {
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
      setFlashcardsData(data);
    } catch (error) {
      console.error('Error fetching flashcards leaderboard:', error);
      setError('Impossible de charger le leaderboard des flashcards');
    } finally {
      setLoading(false);
    }
  };

  const fetchMathLeaderboard = async (mode: MathMode, period: TimePeriod) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/veryfastmath/leaderboard?mode=${mode}&period=${period}`);

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Erreur lors du chargement du leaderboard');
      }

      const data = await response.json();
      setMathData(data);
    } catch (error) {
      console.error('Error fetching math leaderboard:', error);
      setError('Impossible de charger le leaderboard VeryFastMath');
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

  const getModeLabel = (mode: MathMode): string => {
    switch (mode) {
      case 'ADDITION':
        return 'Addition';
      case 'SUBTRACTION':
        return 'Soustraction';
      case 'MULTIPLICATION':
        return 'Multiplication';
      case 'DIVISION':
        return 'Division';
    }
  };

  if (loading) {
    return <LoadingAnimation fullScreen message="Chargement du leaderboard..." />;
  }

  const currentData = category === 'flashcards' ? flashcardsData : mathData;

  return (
    <div className="min-h-screen bg-black text-white">
      <SimpleHeader
        title="Classements"
        backButton={{ label: "Retour au dashboard", href: "/dashboard" }}
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Niveau 1 - Catégorie */}
        <div className="bg-zinc-900 rounded-lg p-2 mb-4 flex gap-2">
          <button
            onClick={() => setCategory('flashcards')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium ${
              category === 'flashcards'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
            }`}
          >
            Flashcards
          </button>
          <button
            onClick={() => setCategory('veryfastmath')}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium ${
              category === 'veryfastmath'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
            }`}
          >
            VeryFastMath
          </button>
        </div>

        {/* Niveau 2 - Mode Math (si VeryFastMath sélectionné) */}
        {category === 'veryfastmath' && (
          <div className="bg-zinc-900 rounded-lg p-2 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION'] as MathMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setMathMode(mode)}
                className={`px-4 py-3 rounded-lg transition-colors font-medium ${
                  mathMode === mode
                    ? 'bg-green-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                }`}
              >
                {getModeLabel(mode)}
              </button>
            ))}
          </div>
        )}

        {/* Niveau 3 - Période */}
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
        {currentData && currentData.leaderboard.length > 0 ? (
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
                      {category === 'flashcards' ? 'Révisions' : 'Score'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {category === 'flashcards' && flashcardsData
                    ? flashcardsData.leaderboard.map(entry => (
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
                      ))
                    : mathData?.leaderboard.map(entry => (
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
                            <span className="inline-flex items-center px-3 py-1 bg-green-900/50 text-green-300 rounded-full font-semibold">
                              {entry.bestScore}
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
            <div className="text-6xl mb-4">
              {category === 'flashcards' ? '📚' : '🔢'}
            </div>
            <p className="text-xl text-zinc-400 mb-2">
              {category === 'flashcards'
                ? `Aucune révision ${getPeriodLabel(selectedPeriod).toLowerCase()}`
                : `Aucun score en ${getModeLabel(mathMode)} ${getPeriodLabel(selectedPeriod).toLowerCase()}`}
            </p>
            <p className="text-zinc-500">
              {category === 'flashcards'
                ? 'Commencez à réviser pour apparaître dans le classement !'
                : 'Jouez au Défi VeryFastMath pour apparaître dans le classement !'}
            </p>
          </div>
        )}

        {/* Info sur la période */}
        {currentData && (
          <div className="mt-6 text-center text-zinc-500 text-sm">
            Période : depuis le{' '}
            {new Date(currentData.startDate).toLocaleString('fr-FR', {
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
