'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SimpleHeader from '@/components/SimpleHeader';
import LoadingAnimation from '@/components/LoadingAnimation';

type LeaderboardCategory = 'flashcards' | 'veryfastmath' | 'streak';
type MathMode = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION';
type StreakMode = 'current' | 'max';

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

interface StreakLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  currentStreak: number;
  maxStreak: number;
}

interface FlashcardsLeaderboardData {
  leaderboard: FlashcardsLeaderboardEntry[];
}

interface MathLeaderboardData {
  mode: string;
  leaderboard: MathLeaderboardEntry[];
}

interface StreakLeaderboardData {
  mode: 'current' | 'max';
  leaderboard: StreakLeaderboardEntry[];
}

export default function LeaderboardPage() {
  const [category, setCategory] = useState<LeaderboardCategory>('flashcards');
  const [mathMode, setMathMode] = useState<MathMode>('ADDITION');
  const [streakMode, setStreakMode] = useState<StreakMode>('current');

  const [flashcardsData, setFlashcardsData] = useState<FlashcardsLeaderboardData | null>(null);
  const [mathData, setMathData] = useState<MathLeaderboardData | null>(null);
  const [streakData, setStreakData] = useState<StreakLeaderboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (category === 'flashcards') {
      fetchFlashcardsLeaderboard();
    } else if (category === 'veryfastmath') {
      fetchMathLeaderboard(mathMode);
    } else if (category === 'streak') {
      fetchStreakLeaderboard(streakMode);
    }
  }, [category, mathMode, streakMode]);

  const fetchFlashcardsLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leaderboard');

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

  const fetchMathLeaderboard = async (mode: MathMode) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/veryfastmath/leaderboard?mode=${mode}`);

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

  const fetchStreakLeaderboard = async (mode: StreakMode) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leaderboard/streak?mode=${mode}`);

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Erreur lors du chargement du leaderboard');
      }

      const data = await response.json();
      setStreakData(data);
    } catch (error) {
      console.error('Error fetching streak leaderboard:', error);
      setError('Impossible de charger le leaderboard des streaks');
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'text-yellow-400';
      case 2:
        return 'text-gray-300';
      case 3:
        return 'text-orange-400';
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
    return <LoadingAnimation fullScreen />;
  }

  const renderLeaderboard = () => {
    let currentData: any;
    let dataType: 'flashcards' | 'math' | 'streak';

    if (category === 'flashcards' && flashcardsData) {
      currentData = flashcardsData;
      dataType = 'flashcards';
    } else if (category === 'veryfastmath' && mathData) {
      currentData = mathData;
      dataType = 'math';
    } else if (category === 'streak' && streakData) {
      currentData = streakData;
      dataType = 'streak';
    }

    if (!currentData || currentData.leaderboard.length === 0) {
      return (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-12 text-center">
          <div className="text-6xl mb-4">
            {category === 'flashcards' ? '📚' : category === 'veryfastmath' ? '🔢' : '🔥'}
          </div>
          <p className="text-xl text-zinc-400 mb-2">
            {category === 'flashcards'
              ? 'Aucune révision enregistrée'
              : category === 'veryfastmath'
              ? `Aucun score en ${getModeLabel(mathMode)}`
              : 'Aucun streak enregistré'}
          </p>
          <p className="text-zinc-500">
            {category === 'flashcards'
              ? 'Commencez à réviser pour apparaître dans le classement !'
              : category === 'veryfastmath'
              ? 'Jouez au Défi VeryFastMath pour apparaître dans le classement !'
              : 'Révisez quotidiennement pour construire votre streak !'}
          </p>
        </div>
      );
    }

    return (
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
                  {dataType === 'flashcards'
                    ? 'Révisions'
                    : dataType === 'math'
                    ? 'Score'
                    : streakMode === 'current'
                    ? 'Streak Actuel'
                    : 'Record'}
                </th>
                {dataType === 'streak' && (
                  <th className="text-right py-4 px-6 text-zinc-400 font-medium w-32">
                    {streakMode === 'current' ? 'Record' : 'Actuel'}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {currentData.leaderboard.map((entry: any) => (
                <tr
                  key={entry.userId}
                  className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className={`py-4 px-6 font-bold text-xl ${getRankColor(entry.rank)}`}>
                    {getRankEmoji(entry.rank)} {entry.rank}
                  </td>
                  <td className="py-4 px-6 text-white font-medium">
                    {entry.displayName}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full font-semibold ${
                        dataType === 'flashcards'
                          ? 'bg-blue-900/50 text-blue-300'
                          : dataType === 'math'
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-orange-900/50 text-orange-300'
                      }`}
                    >
                      {dataType === 'flashcards'
                        ? entry.reviewCount
                        : dataType === 'math'
                        ? entry.bestScore
                        : streakMode === 'current'
                        ? `${entry.currentStreak} jours`
                        : `${entry.maxStreak} jours`}
                    </span>
                  </td>
                  {dataType === 'streak' && (
                    <td className="py-4 px-6 text-right">
                      <span className="inline-flex items-center px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full font-semibold text-sm">
                        {streakMode === 'current'
                          ? `${entry.maxStreak} jours`
                          : `${entry.currentStreak} jours`}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SimpleHeader
        title="Classements"
        backButton={{ label: "Retour au dashboard", href: "/dashboard" }}
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Niveau 1 : Catégorie principale */}
        <div className="mb-6">
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-1.5 border border-zinc-800 shadow-2xl">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setCategory('flashcards')}
                className={`
                  px-6 py-4 rounded-xl font-semibold text-sm sm:text-base
                  transition-all duration-200 ease-out
                  ${category === 'flashcards'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">📚</span>
                  <span className="hidden sm:inline">Flashcards</span>
                  <span className="sm:hidden">Flash</span>
                </div>
              </button>

              <button
                onClick={() => setCategory('veryfastmath')}
                className={`
                  px-6 py-4 rounded-xl font-semibold text-sm sm:text-base
                  transition-all duration-200 ease-out
                  ${category === 'veryfastmath'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg shadow-green-500/30 scale-[1.02]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">🔢</span>
                  <span className="hidden sm:inline">VeryFastMath</span>
                  <span className="sm:hidden">Math</span>
                </div>
              </button>

              <button
                onClick={() => setCategory('streak')}
                className={`
                  px-6 py-4 rounded-xl font-semibold text-sm sm:text-base
                  transition-all duration-200 ease-out
                  ${category === 'streak'
                    ? 'bg-gradient-to-r from-orange-600 to-red-500 text-white shadow-lg shadow-orange-500/30 scale-[1.02]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">🔥</span>
                  <span>Streaks</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Niveau 2 : Sous-catégories (mode math) */}
        {category === 'veryfastmath' && (
          <div className="mb-6">
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-1.5 border border-zinc-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION'] as MathMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setMathMode(mode)}
                    className={`
                      px-4 py-3 rounded-xl font-medium text-sm
                      transition-all duration-200
                      ${mathMode === mode
                        ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                      }
                    `}
                  >
                    {getModeLabel(mode)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Niveau 2 : Sous-catégories (mode streak) */}
        {category === 'streak' && (
          <div className="mb-6">
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-1.5 border border-zinc-800">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setStreakMode('current')}
                  className={`
                    px-6 py-3 rounded-xl font-medium text-sm
                    transition-all duration-200
                    ${streakMode === 'current'
                      ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }
                  `}
                >
                  🔥 Streak Actuel
                </button>
                <button
                  onClick={() => setStreakMode('max')}
                  className={`
                    px-6 py-3 rounded-xl font-medium text-sm
                    transition-all duration-200
                    ${streakMode === 'max'
                      ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }
                  `}
                >
                  🏆 Record Personnel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages d'erreur */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-8 text-red-200">
            {error}
          </div>
        )}

        {/* Leaderboard */}
        {renderLeaderboard()}
      </main>
    </div>
  );
}
