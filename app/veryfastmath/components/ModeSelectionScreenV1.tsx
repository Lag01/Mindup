'use client';

type MathMode = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION';

interface BestScores {
  ADDITION: number | null;
  SUBTRACTION: number | null;
  MULTIPLICATION: number | null;
  DIVISION: number | null;
}

interface ModeSelectionScreenV1Props {
  onSelectMode: (mode: MathMode) => void;
  bestScores: BestScores;
}

interface ModeConfig {
  mode: MathMode;
  label: string;
  emoji: string;
  color: string;
}

export default function ModeSelectionScreenV1({
  onSelectMode,
  bestScores,
}: ModeSelectionScreenV1Props) {
  const modesConfig: ModeConfig[] = [
    { mode: 'ADDITION', label: 'Addition', emoji: '➕', color: 'text-cyan-400' },
    { mode: 'SUBTRACTION', label: 'Soustraction', emoji: '➖', color: 'text-green-400' },
    { mode: 'MULTIPLICATION', label: 'Multiplication', emoji: '✖️', color: 'text-orange-400' },
    { mode: 'DIVISION', label: 'Division', emoji: '➗', color: 'text-purple-400' },
  ];

  const bestGlobalScore = Math.max(...Object.values(bestScores).filter((s): s is number => s !== null), 0);
  const modesPlayed = Object.values(bestScores).filter((s) => s !== null).length;

  return (
    <div className="text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Défis VeryFastMath
          </h1>
          <p className="text-lg text-zinc-400 mb-2">
            Vous avez <span className="text-cyan-400 font-bold">60 secondes</span> pour résoudre un maximum d'opérations !
          </p>
        </div>

        {/* Mini Stats */}
        {bestGlobalScore > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Record Global</div>
                  <div className="text-xl font-bold text-foreground">{bestGlobalScore}</div>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Modes Joués</div>
                  <div className="text-xl font-bold text-foreground">{modesPlayed}</div>
                </div>
              </div>
            </div>
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏱️</span>
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Durée Sprint</div>
                  <div className="text-xl font-bold text-foreground">60s</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {modesConfig.map((config) => (
            <button
              key={config.mode}
              onClick={() => onSelectMode(config.mode)}
              className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
            >
              {/* Icône */}
              <div className="mb-3 text-center">
                <span className="text-5xl md:text-6xl">{config.emoji}</span>
              </div>

              {/* Nom */}
              <h3 className={`text-xl md:text-2xl font-bold text-center mb-3 ${config.color}`}>
                {config.label}
              </h3>

              {/* Score */}
              {bestScores[config.mode] !== null ? (
                <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                  <span className="text-yellow-400">🏆</span>
                  <span>Meilleur score:</span>
                  <span className={`font-bold ${config.color} text-lg`}>{bestScores[config.mode]}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-400">
                    Nouveau
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
