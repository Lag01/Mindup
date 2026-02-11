'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SimpleHeader from '@/components/SimpleHeader';
import LoadingAnimation from '@/components/LoadingAnimation';

const getInitials = (displayName: string): string => {
  const words = displayName.trim().split(' ').filter(word => word.length > 0);
  if (words.length === 0) return '??';
  if (words.length === 1) return displayName.slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return isMobile;
};

const formatStats = (entry: any, dataType: 'flashcards' | 'math' | 'streak', isMobile: boolean, streakMode?: 'current' | 'max'): string => {
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

interface FlashcardsLeaderboardData { leaderboard: any[]; currentUserId?: string; }
interface MathLeaderboardData { mode: string; leaderboard: any[]; currentUserId?: string; }
interface StreakLeaderboardData { mode: 'current' | 'max'; leaderboard: any[]; currentUserId?: string; }

interface LeaderboardCardV1Props { entry: any; dataType: 'flashcards' | 'math' | 'streak'; isCurrentUser: boolean; streakMode?: StreakMode; }

const LeaderboardCardV1: React.FC<LeaderboardCardV1Props> = ({ entry, dataType, isCurrentUser, streakMode }) => {
  const isMobile = useIsMobile();

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1: return <span className="text-2xl">🏆</span>;
      case 2: return <span className="text-2xl">🥈</span>;
      case 3: return <span className="text-2xl">🥉</span>;
      default: return (
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
          <span className="text-zinc-400 font-semibold text-xs">{getInitials(entry.displayName)}</span>
        </div>
      );
    }
  };

  const cardBackground = isCurrentUser
    ? 'bg-blue-900/20 border-blue-800'
    : 'bg-zinc-900 border-zinc-800';

  return (
    <div className={`${cardBackground} border rounded-lg p-4 flex items-center gap-4`}>
      <div className="flex-shrink-0">{getRankDisplay(entry.rank)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-lg text-foreground truncate">{entry.displayName}</h3>
          {isCurrentUser && <span className="text-blue-400 font-medium text-sm">(Vous)</span>}
        </div>
        <p className="text-zinc-400 text-sm">{formatStats(entry, dataType, isMobile, streakMode)}</p>
      </div>
      <div className="flex-shrink-0">
        <span className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 font-semibold text-sm border border-zinc-700">
          #{entry.rank}
        </span>
      </div>
    </div>
  );
};

export default function LeaderboardV1() {
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
    if (category === 'flashcards') fetchFlashcardsLeaderboard();
    else if (category === 'veryfastmath') fetchMathLeaderboard(mathMode);
    else if (category === 'streak') fetchStreakLeaderboard(streakMode);
  }, [category, mathMode, streakMode]);

  const fetchFlashcardsLeaderboard = async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) { if (response.status === 401) { router.push('/'); return; } throw new Error('Erreur'); }
      setFlashcardsData(await response.json());
    } catch (error) { setError('Impossible de charger le leaderboard des flashcards'); } finally { setLoading(false); }
  };

  const fetchMathLeaderboard = async (mode: MathMode) => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/veryfastmath/leaderboard?mode=${mode}`);
      if (!response.ok) { if (response.status === 401) { router.push('/'); return; } throw new Error('Erreur'); }
      setMathData(await response.json());
    } catch (error) { setError('Impossible de charger le leaderboard VeryFastMath'); } finally { setLoading(false); }
  };

  const fetchStreakLeaderboard = async (mode: StreakMode) => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/leaderboard/streak?mode=${mode}`);
      if (!response.ok) { if (response.status === 401) { router.push('/'); return; } throw new Error('Erreur'); }
      setStreakData(await response.json());
    } catch (error) { setError('Impossible de charger le leaderboard des streaks'); } finally { setLoading(false); }
  };

  const getModeLabel = (mode: MathMode): string => {
    switch (mode) {
      case 'ADDITION': return 'Addition';
      case 'SUBTRACTION': return 'Soustraction';
      case 'MULTIPLICATION': return 'Multiplication';
      case 'DIVISION': return 'Division';
    }
  };

  if (loading) return <LoadingAnimation fullScreen />;

  const renderLeaderboard = () => {
    let currentData: any;
    let dataType: 'flashcards' | 'math' | 'streak' = category === 'flashcards' ? 'flashcards' : category === 'veryfastmath' ? 'math' : 'streak';

    if (category === 'flashcards' && flashcardsData) currentData = flashcardsData;
    else if (category === 'veryfastmath' && mathData) currentData = mathData;
    else if (category === 'streak' && streakData) currentData = streakData;

    if (!currentData || currentData.leaderboard.length === 0) {
      return (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-12 text-center">
          <div className="text-6xl mb-4">{category === 'flashcards' ? '📚' : category === 'veryfastmath' ? '🔢' : '🔥'}</div>
          <p className="text-xl text-zinc-400 mb-2">
            {category === 'flashcards' ? 'Aucune révision enregistrée' : category === 'veryfastmath' ? `Aucun score en ${getModeLabel(mathMode)}` : 'Aucun streak enregistré'}
          </p>
          <p className="text-zinc-500">
            {category === 'flashcards' ? 'Commencez à réviser pour apparaître dans le classement !' : category === 'veryfastmath' ? 'Jouez au Défi VeryFastMath pour apparaître dans le classement !' : 'Révisez quotidiennement pour construire votre streak !'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {currentData.leaderboard.map((entry: any) => (
          <LeaderboardCardV1 key={entry.userId} entry={entry} dataType={dataType} isCurrentUser={entry.userId === currentData.currentUserId} streakMode={dataType === 'streak' ? streakMode : undefined} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SimpleHeader title="Classements" backButton={{ label: "Retour au dashboard", href: "/dashboard-entry" }} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Catégorie principale - Simple tabs */}
        <div className="mb-6">
          <div className="bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => setCategory('flashcards')} className={`px-4 py-3 rounded-lg font-semibold text-sm sm:text-base transition-colors ${category === 'flashcards' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
                <div className="flex items-center justify-center gap-2"><span className="text-xl">📚</span><span className="hidden sm:inline">Flashcards</span><span className="sm:hidden">Flash</span></div>
              </button>
              <button onClick={() => setCategory('veryfastmath')} className={`px-4 py-3 rounded-lg font-semibold text-sm sm:text-base transition-colors ${category === 'veryfastmath' ? 'bg-green-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
                <div className="flex items-center justify-center gap-2"><span className="text-xl">🔢</span><span className="hidden sm:inline">VeryFastMath</span><span className="sm:hidden">Math</span></div>
              </button>
              <button onClick={() => setCategory('streak')} className={`px-4 py-3 rounded-lg font-semibold text-sm sm:text-base transition-colors ${category === 'streak' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
                <div className="flex items-center justify-center gap-2"><span className="text-xl">🔥</span><span>Streaks</span></div>
              </button>
            </div>
          </div>
        </div>

        {/* Sous-catégories math */}
        {category === 'veryfastmath' && (
          <div className="mb-6">
            <div className="bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                {(['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION'] as MathMode[]).map(mode => (
                  <button key={mode} onClick={() => setMathMode(mode)} className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${mathMode === mode ? 'bg-green-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
                    {getModeLabel(mode)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sous-catégories streak */}
        {category === 'streak' && (
          <div className="mb-6">
            <div className="bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => setStreakMode('current')} className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${streakMode === 'current' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>🔥 Streak Actuel</button>
                <button onClick={() => setStreakMode('max')} className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${streakMode === 'max' ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>🏆 Record Personnel</button>
              </div>
            </div>
          </div>
        )}

        {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-8 text-red-200">{error}</div>}

        {renderLeaderboard()}
      </main>
    </div>
  );
}
