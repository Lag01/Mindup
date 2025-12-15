type MathMode = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION';

interface BestScores {
  ADDITION: number | null;
  SUBTRACTION: number | null;
  MULTIPLICATION: number | null;
  DIVISION: number | null;
}

interface ModeSelectionScreenProps {
  onSelectMode: (mode: MathMode) => void;
  bestScores: BestScores;
}

export default function ModeSelectionScreen({
  onSelectMode,
  bestScores,
}: ModeSelectionScreenProps) {
  const modes: { mode: MathMode; label: string; color: string; emoji: string }[] = [
    { mode: 'ADDITION', label: 'Addition', color: 'bg-blue-600 hover:bg-blue-700', emoji: '➕' },
    { mode: 'SUBTRACTION', label: 'Soustraction', color: 'bg-green-600 hover:bg-green-700', emoji: '➖' },
    { mode: 'MULTIPLICATION', label: 'Multiplication', color: 'bg-orange-600 hover:bg-orange-700', emoji: '✖️' },
    { mode: 'DIVISION', label: 'Division', color: 'bg-purple-600 hover:bg-purple-700', emoji: '➗' },
  ];

  return (
    <div className="text-center">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4">Choisissez votre mode</h2>
      <p className="text-sm sm:text-base text-zinc-400 mb-8">
        Vous avez 1 minute pour résoudre un maximum d'opérations !
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {modes.map(({ mode, label, color, emoji }) => (
          <button
            key={mode}
            onClick={() => onSelectMode(mode)}
            className={`${color} text-white p-6 rounded-xl border-2 border-zinc-700 transition-all font-bold text-xl relative shadow-lg hover:shadow-xl hover:border-zinc-600`}
          >
            <div className="text-5xl sm:text-6xl mb-3">{emoji}</div>
            <div className="text-lg sm:text-xl">{label}</div>
            {bestScores[mode] !== null && (
              <div className="text-xs sm:text-sm font-normal mt-2 opacity-90">
                Meilleur score : {bestScores[mode]}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
