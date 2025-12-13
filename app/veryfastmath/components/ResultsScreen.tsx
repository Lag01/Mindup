'use client';

import { useEffect, useState } from 'react';

type MathMode = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION';

interface ResultsScreenProps {
  mode: MathMode;
  score: number;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
}

export default function ResultsScreen({
  mode,
  score,
  onPlayAgain,
  onViewLeaderboard,
}: ResultsScreenProps) {
  const [result, setResult] = useState<{
    savedScore: number;
    isNewRecord: boolean;
    currentBest: number;
    previousBest: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Les données viennent maintenant de l'API save-score qui retourne previousBest
    // On récupère juste les infos pour afficher
    fetch(`/api/veryfastmath/best-score?mode=${mode}`)
      .then(res => res.json())
      .then(data => {
        const bestScore = data.bestScore || 0;
        const isNewRecord = score >= bestScore && score > 0;
        setResult({
          savedScore: score,
          isNewRecord,
          currentBest: bestScore,
          previousBest: isNewRecord && bestScore > score ? bestScore : null,
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur récupération résultat:', err);
        setResult({
          savedScore: score,
          isNewRecord: false,
          currentBest: score,
          previousBest: null,
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
        {/* Titre avec emoji selon le résultat */}
        <h2 className="text-3xl font-bold mb-4">
          {result?.isNewRecord && score > 0
            ? '🎉 Nouveau Record !'
            : score === 0
              ? 'Aucune opération réussie'
              : `${score} opération${score > 1 ? 's' : ''} réussie${score > 1 ? 's' : ''} !`
          }
        </h2>

        {result && (
          <>
            {/* Score avec animation si record */}
            <div className={`text-6xl font-bold mb-4 ${
              result.isNewRecord && score > 0 ? 'text-green-500 animate-bounce' : 'text-blue-500'
            }`}>
              {result.savedScore}
            </div>

            {/* Message détaillé */}
            <div className="text-xl mb-4">
              {result.isNewRecord && result.savedScore > 0 ? (
                <div className="space-y-2">
                  <div className="text-green-500 font-bold">
                    Nouveau record personnel !
                  </div>
                  {result.previousBest && result.previousBest < result.savedScore ? (
                    <div className="text-zinc-400 text-sm">
                      Précédent record : {result.previousBest}
                      <span className="text-green-400 ml-2">
                        (+{result.savedScore - result.previousBest})
                      </span>
                    </div>
                  ) : (
                    <div className="text-zinc-400 text-sm">
                      Premier score enregistré pour ce mode !
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-zinc-400">
                    {result.savedScore === 0
                      ? "Continuez à vous entraîner !"
                      : `Vous avez réussi ${result.savedScore} opération${result.savedScore > 1 ? 's' : ''}`
                    }
                  </div>
                  {result.currentBest > 0 && result.currentBest > result.savedScore && (
                    <div className="text-zinc-500 text-sm">
                      Votre record : {result.currentBest}
                      <span className="text-orange-400 ml-2">
                        (encore {result.currentBest - result.savedScore} pour l'égaler)
                      </span>
                    </div>
                  )}
                </div>
              )}
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
