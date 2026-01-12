'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SimpleHeader from '@/components/SimpleHeader';
import LoadingAnimation from '@/components/LoadingAnimation';

// Composants d'icônes SVG pour le top 3
const TrophyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-yellow-400"
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
  </svg>
);

const SilverMedalIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-gray-400"
  >
    <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"></path>
    <path d="M11 12 5.12 2.2"></path>
    <path d="m13 12 5.88-9.8"></path>
    <path d="M8 7h8"></path>
    <circle cx="12" cy="17" r="5"></circle>
    <path d="M12 18v-2h-.5"></path>
  </svg>
);

const BronzeMedalIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-amber-700"
  >
    <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"></path>
    <path d="M11 12 5.12 2.2"></path>
    <path d="m13 12 5.88-9.8"></path>
    <path d="M8 7h8"></path>
    <circle cx="12" cy="17" r="5"></circle>
    <path d="M12 18v-2h-.5"></path>
  </svg>
);

// Fonctions utilitaires
const getInitials = (displayName: string): string => {
  const words = displayName.trim().split(' ').filter(word => word.length > 0);

  if (words.length === 0) return '??';

  if (words.length === 1) {
    // Si un seul mot, prendre les 2 premières lettres
    return displayName.slice(0, 2).toUpperCase();
  }

  // Sinon, prendre la première lettre de chaque mot (max 2)
  return words
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind 'md' breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

const formatStats = (
  entry: any,
  dataType: 'flashcards' | 'math' | 'streak',
  isMobile: boolean,
  streakMode?: 'current' | 'max'
): string => {
  if (dataType === 'flashcards') {
    const count = entry.reviewCount.toLocaleString('fr-FR');
    return isMobile ? `${count} cartes` : `${count} cartes révisées`;
  } else if (dataType === 'math') {
    return `Score : ${entry.bestScore}`;
  } else {
    const value = streakMode === 'current' ? entry.currentStreak : entry.maxStreak;
    return `${value} jours`;
  }
};

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
  currentUserId?: string;
}

interface MathLeaderboardData {
  mode: string;
  leaderboard: MathLeaderboardEntry[];
  currentUserId?: string;
}

interface StreakLeaderboardData {
  mode: 'current' | 'max';
  leaderboard: StreakLeaderboardEntry[];
  currentUserId?: string;
}

// Composant LeaderboardCard
interface LeaderboardCardProps {
  entry: any;
  dataType: 'flashcards' | 'math' | 'streak';
  isCurrentUser: boolean;
  streakMode?: StreakMode;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ entry, dataType, isCurrentUser, streakMode }) => {
  const isMobile = useIsMobile();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <TrophyIcon />;
      case 2:
        return <SilverMedalIcon />;
      case 3:
        return <BronzeMedalIcon />;
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <span className="text-zinc-400 font-semibold text-xs">
              {getInitials(entry.displayName)}
            </span>
          </div>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="px-4 py-2 rounded-full bg-yellow-900/30 text-yellow-500 border border-yellow-700/50 font-semibold text-sm">
          Top 1
        </span>
      );
    } else if (rank === 2) {
      return (
        <span className="px-4 py-2 rounded-full bg-gray-900/30 text-gray-400 border border-gray-700/50 font-semibold text-sm">
          Top 2
        </span>
      );
    } else if (rank === 3) {
      return (
        <span className="px-4 py-2 rounded-full bg-orange-900/30 text-orange-500 border border-orange-700/50 font-semibold text-sm">
          Top 3
        </span>
      );
    } else {
      return (
        <span className="px-4 py-2 rounded-full bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 font-semibold text-sm">
          #{rank}
        </span>
      );
    }
  };

  const cardBackground = isCurrentUser
    ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-700/50'
    : 'bg-zinc-900 border-zinc-800';

  return (
    <div
      className={`${cardBackground} border rounded-xl p-4 hover:bg-zinc-800/50 transition-colors flex items-center gap-4`}
    >
      {/* Icône ou Initiales */}
      <div className="flex-shrink-0">
        {getRankIcon(entry.rank)}
      </div>

      {/* Informations centrales */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-lg text-white truncate">
            {entry.displayName}
          </h3>
          {isCurrentUser && (
            <span className="text-blue-400 font-medium text-sm">(Vous)</span>
          )}
        </div>
        <p className="text-zinc-400 text-sm">
          {formatStats(entry, dataType, isMobile, streakMode)}
        </p>
      </div>

      {/* Badge de position */}
      <div className="flex-shrink-0">
        {getRankBadge(entry.rank)}
      </div>
    </div>
  );
};

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
    let dataType: 'flashcards' | 'math' | 'streak' =
      category === 'flashcards' ? 'flashcards' :
      category === 'veryfastmath' ? 'math' : 'streak';

    if (category === 'flashcards' && flashcardsData) {
      currentData = flashcardsData;
    } else if (category === 'veryfastmath' && mathData) {
      currentData = mathData;
    } else if (category === 'streak' && streakData) {
      currentData = streakData;
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
      <div className="space-y-3">
        {currentData.leaderboard.map((entry: any) => (
          <LeaderboardCard
            key={entry.userId}
            entry={entry}
            dataType={dataType}
            isCurrentUser={entry.userId === currentData.currentUserId}
            streakMode={dataType === 'streak' ? streakMode : undefined}
          />
        ))}
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
