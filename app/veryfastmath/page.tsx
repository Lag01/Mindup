'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type MathMode = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION';
type GameScreen = 'selection' | 'countdown' | 'playing' | 'finished';

interface Operation {
  num1: number;
  num2: number;
  operator: string;
  answer: number;
}

interface BestScores {
  ADDITION: number | null;
  SUBTRACTION: number | null;
  MULTIPLICATION: number | null;
  DIVISION: number | null;
}

export default function VeryFastMathPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<GameScreen>('selection');
  const [selectedMode, setSelectedMode] = useState<MathMode | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [bestScores, setBestScores] = useState<BestScores>({
    ADDITION: null,
    SUBTRACTION: null,
    MULTIPLICATION: null,
    DIVISION: null,
  });

  // Charger les meilleurs scores au montage
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

  const handleModeSelect = (mode: MathMode) => {
    setSelectedMode(mode);
    setScreen('countdown');
  };

  const handleGameEnd = (score: number) => {
    setFinalScore(score);
    setScreen('finished');
  };

  const handlePlayAgain = () => {
    setSelectedMode(null);
    setFinalScore(0);
    setScreen('selection');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-bold">Défis VeryFastMath</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Retour au dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {screen === 'selection' && (
          <ModeSelectionScreen
            onSelectMode={handleModeSelect}
            bestScores={bestScores}
          />
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
          <ResultsScreen
            mode={selectedMode}
            score={finalScore}
            onPlayAgain={handlePlayAgain}
            onViewLeaderboard={() => router.push('/leaderboard')}
          />
        )}
      </main>
    </div>
  );
}

// Écran de sélection de mode
function ModeSelectionScreen({
  onSelectMode,
  bestScores,
}: {
  onSelectMode: (mode: MathMode) => void;
  bestScores: BestScores;
}) {
  const modes: { mode: MathMode; label: string; color: string; emoji: string }[] = [
    { mode: 'ADDITION', label: 'Addition', color: 'bg-blue-600 hover:bg-blue-700', emoji: '➕' },
    { mode: 'SUBTRACTION', label: 'Soustraction', color: 'bg-green-600 hover:bg-green-700', emoji: '➖' },
    { mode: 'MULTIPLICATION', label: 'Multiplication', color: 'bg-orange-600 hover:bg-orange-700', emoji: '✖️' },
    { mode: 'DIVISION', label: 'Division', color: 'bg-purple-600 hover:bg-purple-700', emoji: '➗' },
  ];

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold mb-4">Choisissez votre mode</h2>
      <p className="text-zinc-400 mb-8">
        Vous avez 1 minute pour résoudre un maximum d'opérations !
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {modes.map(({ mode, label, color, emoji }) => (
          <button
            key={mode}
            onClick={() => onSelectMode(mode)}
            className={`${color} text-white p-6 rounded-lg transition-colors font-bold text-xl relative`}
          >
            <div className="text-4xl mb-2">{emoji}</div>
            <div>{label}</div>
            {bestScores[mode] !== null && (
              <div className="text-sm font-normal mt-2 opacity-90">
                Meilleur score : {bestScores[mode]}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Écran de décompte 3-2-1
function CountdownScreen({ onCountdownEnd }: { onCountdownEnd: () => void }) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      onCountdownEnd();
      return;
    }

    const timeout = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [count, onCountdownEnd]);

  return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="text-9xl font-bold text-blue-500 animate-pulse">
        {count > 0 ? count : 'GO !'}
      </div>
    </div>
  );
}

// Générer une opération aléatoire
function generateOperation(mode: MathMode): Operation {
  let num1: number, num2: number, operator: string, answer: number;

  switch (mode) {
    case 'ADDITION':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      operator = '+';
      answer = num1 + num2;
      break;

    case 'SUBTRACTION':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * num1) + 1;
      operator = '-';
      answer = num1 - num2;
      break;

    case 'MULTIPLICATION':
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      operator = '×';
      answer = num1 * num2;
      break;

    case 'DIVISION':
      const quotient = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      num1 = quotient * num2;
      operator = '÷';
      answer = quotient;
      break;

    default:
      throw new Error('Mode invalide');
  }

  return { num1, num2, operator, answer };
}

// Écran de jeu
function GameScreen({
  mode,
  onGameEnd,
}: {
  mode: MathMode;
  onGameEnd: (score: number) => void;
}) {
  const [currentOp, setCurrentOp] = useState<Operation>(generateOperation(mode));
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isPlaying, setIsPlaying] = useState(true);
  const [finalScore, setFinalScore] = useState(0);

  // Timer
  useEffect(() => {
    if (!isPlaying) return;

    const startTime = Date.now();
    const endTime = startTime + 60000;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        setIsPlaying(false);
        setFinalScore(score);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Sauvegarder le score à la fin
  useEffect(() => {
    if (!isPlaying && finalScore > 0) {
      fetch('/api/veryfastmath/save-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, score: finalScore }),
      })
        .then(() => onGameEnd(finalScore))
        .catch(err => {
          console.error('Erreur sauvegarde:', err);
          onGameEnd(finalScore);
        });
    }
  }, [isPlaying, finalScore, mode, onGameEnd]);

  // Vérification de la réponse
  useEffect(() => {
    if (!userAnswer || !isPlaying) return;

    const numAnswer = parseFloat(userAnswer);
    if (numAnswer === currentOp.answer) {
      setScore(s => s + 1);
      setUserAnswer('');
      setCurrentOp(generateOperation(mode));
    }
  }, [userAnswer, currentOp, isPlaying, mode]);

  if (!isPlaying && finalScore > 0) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-2xl">Sauvegarde du score...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Opération */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-4xl md:text-6xl font-bold">
          {currentOp.num1} {currentOp.operator} {currentOp.num2} = ?
        </div>
      </div>

      {/* Timer et score */}
      <div className="py-4 flex justify-around text-xl md:text-2xl">
        <div className={timeRemaining <= 10 ? 'text-red-500 font-bold' : ''}>
          Temps : {timeRemaining}s
        </div>
        <div>Score : {score}</div>
      </div>

      {/* Réponse en cours */}
      <div className="py-6 text-center">
        <div className="text-3xl min-h-[60px] bg-zinc-800 rounded-lg p-4 max-w-sm mx-auto flex items-center justify-center">
          {userAnswer || <span className="text-zinc-600">...</span>}
        </div>
      </div>

      {/* Pavé numérique */}
      <div className="pb-8">
        <NumPad
          onInput={(digit) => setUserAnswer(userAnswer + digit)}
          onDelete={() => setUserAnswer(userAnswer.slice(0, -1))}
          userAnswer={userAnswer}
        />
      </div>
    </div>
  );
}

// Pavé numérique
function NumPad({
  onInput,
  onDelete,
  userAnswer,
}: {
  onInput: (digit: string) => void;
  onDelete: () => void;
  userAnswer: string;
}) {
  const layout = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['.', '0', 'delete'],
  ];

  return (
    <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
      {layout.flat().map((key, index) => (
        <button
          key={index}
          onClick={() => (key === 'delete' ? onDelete() : onInput(key))}
          className={`
            h-16 md:h-20 rounded-lg font-bold text-xl md:text-2xl transition-colors
            ${
              key === 'delete'
                ? 'bg-red-800 hover:bg-red-700 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white'
            }
            ${key === 'delete' && userAnswer === '' ? 'invisible' : ''}
          `}
          disabled={key === 'delete' && userAnswer === ''}
        >
          {key === 'delete' ? '⌫' : key}
        </button>
      ))}
    </div>
  );
}

// Écran de résultats
function ResultsScreen({
  mode,
  score,
  onPlayAgain,
  onViewLeaderboard,
}: {
  mode: MathMode;
  score: number;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
}) {
  const [result, setResult] = useState<{
    savedScore: number;
    isNewRecord: boolean;
    currentBest: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer les informations de sauvegarde
    fetch(`/api/veryfastmath/best-score?mode=${mode}`)
      .then(res => res.json())
      .then(data => {
        const bestScore = data.bestScore || 0;
        const isNewRecord = score > bestScore || (score > 0 && bestScore === 0);
        setResult({
          savedScore: score,
          isNewRecord,
          currentBest: Math.max(score, bestScore),
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur récupération résultat:', err);
        setResult({
          savedScore: score,
          isNewRecord: false,
          currentBest: score,
        });
        setLoading(false);
      });
  }, [mode, score]);

  if (loading) {
    return (
      <div className="text-center max-w-md mx-auto">
        <div className="bg-zinc-900 rounded-lg p-8 border border-zinc-800">
          <div className="text-xl">Chargement des résultats...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center max-w-md mx-auto">
      <div className="bg-zinc-900 rounded-lg p-8 border border-zinc-800">
        <h2 className="text-3xl font-bold mb-4">Temps écoulé !</h2>

        {result && (
          <>
            <div className="text-6xl font-bold text-blue-500 mb-4">
              {result.savedScore}
            </div>
            <div className="text-xl mb-4">
              {result.isNewRecord && result.savedScore > 0 && (
                <div className="text-green-500 font-bold mb-2">
                  🎉 Nouveau record personnel !
                </div>
              )}
              <div className="text-zinc-400">
                Meilleur score : {result.currentBest}
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={onPlayAgain}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-bold"
          >
            Rejouer
          </button>
          <button
            onClick={onViewLeaderboard}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg transition-colors font-bold"
          >
            Voir le classement
          </button>
        </div>
      </div>
    </div>
  );
}
