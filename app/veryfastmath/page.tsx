'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import CountdownScreen from './components/CountdownScreen';
import GameScreen from './components/GameScreen';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useDashboardVersion } from '@/hooks/useDashboardVersion';

// V2 components (current design)
const ModeSelectionScreenV2 = dynamic(() => import('./components/ModeSelectionScreen'), { ssr: false });
const ResultsScreenV2 = dynamic(() => import('./components/ResultsScreen'), { ssr: false });

// V1 components (simplified design)
const ModeSelectionScreenV1 = dynamic(() => import('./components/ModeSelectionScreenV1'), { ssr: false });
const ResultsScreenV1 = dynamic(() => import('./components/ResultsScreenV1'), { ssr: false });

type MathMode = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION';
type GameScreenType = 'selection' | 'countdown' | 'playing' | 'finished';

interface BestScores {
  ADDITION: number | null;
  SUBTRACTION: number | null;
  MULTIPLICATION: number | null;
  DIVISION: number | null;
}

export default function VeryFastMathPage() {
  const router = useRouter();
  const { version, loading: versionLoading } = useDashboardVersion();
  const [screen, setScreen] = useState<GameScreenType>('selection');
  const [selectedMode, setSelectedMode] = useState<MathMode | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [bestScores, setBestScores] = useState<BestScores>({
    ADDITION: null,
    SUBTRACTION: null,
    MULTIPLICATION: null,
    DIVISION: null,
  });

  useEffect(() => {
    const modes: MathMode[] = ['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION'];
    modes.forEach(mode => {
      fetch(`/api/veryfastmath/best-score?mode=${mode}`)
        .then(res => res.json())
        .then(data => {
          if (data.bestScore !== null) {
            setBestScores(prev => ({ ...prev, [mode]: data.bestScore }));
          }
        })
        .catch(err => console.error(`Erreur récupération score ${mode}:`, err));
    });
  }, []);

  useEffect(() => {
    if (screen === 'countdown' || screen === 'playing') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [screen]);

  const handleModeSelect = (mode: MathMode) => {
    setSelectedMode(mode);
    setScreen('countdown');
  };

  const handleGameEnd = (score: number) => {
    setFinalScore(score);
    setScreen('finished');
  };

  const handlePlayAgain = () => {
    setFinalScore(0);
    setScreen('countdown');
  };

  const handleBackToMenu = () => {
    setSelectedMode(null);
    setFinalScore(0);
    setScreen('selection');
  };

  const handleCancelAttempt = () => {
    if (confirm('Voulez-vous vraiment annuler cette tentative ?')) {
      setSelectedMode(null);
      setFinalScore(0);
      setScreen('selection');
    }
  };

  if (versionLoading) {
    return <LoadingAnimation fullScreen />;
  }

  const isV1 = version === 'v1';

  return (
    <div className={`min-h-screen ${isV1 ? 'bg-background' : 'bg-zinc-950'} text-white`}>
      {/* Header visible uniquement en mode sélection et résultats */}
      {(screen === 'selection' || screen === 'finished') && (
        <header className={isV1 ? 'bg-zinc-900 border-b border-zinc-800' : 'bg-zinc-900 border-b border-zinc-800'}>
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl sm:text-3xl font-bold">Défis VeryFastMath</h1>
              <button
                onClick={() => router.push('/dashboard-entry')}
                className={isV1
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors text-sm'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors text-sm'
                }
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Bouton d'annulation rond pendant countdown et playing */}
      {(screen === 'countdown' || screen === 'playing') && (
        <button
          onClick={handleCancelAttempt}
          className="fixed top-4 right-4 z-50 w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors shadow-lg"
          aria-label="Annuler la tentative"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        {screen === 'selection' && (
          isV1 ? (
            <ModeSelectionScreenV1
              onSelectMode={handleModeSelect}
              bestScores={bestScores}
            />
          ) : (
            <ModeSelectionScreenV2
              onSelectMode={handleModeSelect}
              bestScores={bestScores}
            />
          )
        )}

        {screen === 'countdown' && selectedMode && (
          <CountdownScreen onCountdownEnd={() => setScreen('playing')} />
        )}

        {screen === 'playing' && selectedMode && (
          <GameScreen
            mode={selectedMode}
            onGameEnd={handleGameEnd}
          />
        )}

        {screen === 'finished' && selectedMode && (
          isV1 ? (
            <ResultsScreenV1
              mode={selectedMode}
              score={finalScore}
              onPlayAgain={handlePlayAgain}
              onBackToMenu={handleBackToMenu}
              onViewLeaderboard={() => router.push('/leaderboard')}
            />
          ) : (
            <ResultsScreenV2
              mode={selectedMode}
              score={finalScore}
              onPlayAgain={handlePlayAgain}
              onBackToMenu={handleBackToMenu}
              onViewLeaderboard={() => router.push('/leaderboard')}
            />
          )
        )}
      </main>
    </div>
  );
}
