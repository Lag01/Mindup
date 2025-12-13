'use client';

interface RecentActivityProps {
  reviewsThisWeek: number;
  inProgressCards: number;
  masteredCards: number;
  totalCards: number;
}

export default function RecentActivity({
  reviewsThisWeek,
  inProgressCards,
  masteredCards,
  totalCards,
}: RecentActivityProps) {
  const progressPercentage = totalCards > 0
    ? ((inProgressCards / totalCards) * 100).toFixed(0)
    : 0;

  const masteryPercentage = totalCards > 0
    ? ((masteredCards / totalCards) * 100).toFixed(0)
    : 0;

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Activité récente
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <div className="text-zinc-400 text-sm mb-1">Cette semaine</div>
          <div className="text-xl font-bold text-indigo-400">{reviewsThisWeek}</div>
          <div className="text-zinc-500 text-xs mt-1">révisions</div>
        </div>

        <div>
          <div className="text-zinc-400 text-sm mb-1">Progression</div>
          <div className="text-xl font-bold text-emerald-400">
            {progressPercentage}%
          </div>
          <div className="text-zinc-500 text-xs mt-1">cartes démarrées</div>
        </div>

        <div>
          <div className="text-zinc-400 text-sm mb-1">Maîtrise</div>
          <div className="text-xl font-bold text-green-400">
            {masteryPercentage}%
          </div>
          <div className="text-zinc-500 text-xs mt-1">cartes maîtrisées</div>
        </div>
      </div>
    </div>
  );
}
