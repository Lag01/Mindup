'use client';

interface TrueRetentionCardProps {
  trueRetention: number;
  apparentSuccessRate: number;
  matureCardsCount: number;
}

function retentionTone(value: number) {
  if (value >= 90) return { color: 'text-green-400', ring: '#10b981', label: 'Excellente' };
  if (value >= 85) return { color: 'text-blue-400', ring: '#3b82f6', label: 'Bonne' };
  if (value >= 75) return { color: 'text-orange-400', ring: '#f97316', label: 'Moyenne' };
  return { color: 'text-red-400', ring: '#ef4444', label: 'Faible' };
}

export default function TrueRetentionCard({
  trueRetention,
  apparentSuccessRate,
  matureCardsCount,
}: TrueRetentionCardProps) {
  const tone = retentionTone(trueRetention);
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (trueRetention / 100) * circumference;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">True Retention</h3>
        <p className="mt-1 text-xs text-zinc-400">
          Taux de réussite sur les cartes matures (intervalle ≥ 21j) — 30 derniers jours
        </p>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="#27272a"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke={tone.ring}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold tabular-nums ${tone.color}`}>
              {Math.round(trueRetention)}%
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
              {tone.label}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          <div>
            <div className="text-xs text-zinc-400">Cartes matures</div>
            <div className="text-xl font-semibold text-foreground tabular-nums">
              {matureCardsCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Réussite apparente (toutes cartes)</div>
            <div className="text-xl font-semibold text-zinc-300 tabular-nums">
              {Math.round(apparentSuccessRate)}%
            </div>
          </div>
          {matureCardsCount === 0 && (
            <p className="text-xs text-zinc-500 italic">
              Aucune carte mature encore — la métrique deviendra significative à mesure que les
              intervalles dépassent 21 jours.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
