'use client';

interface RatingsDistributionProps {
  ratingDistribution: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  totalReviews: number;
}

export default function RatingsDistribution({
  ratingDistribution,
  totalReviews,
}: RatingsDistributionProps) {
  const getPercentage = (count: number) => {
    return totalReviews > 0 ? ((count / totalReviews) * 100).toFixed(1) : 0;
  };

  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Distribution des évaluations
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-zinc-400 text-sm mb-1">🔴 Échec</div>
          <div className="text-xl font-bold text-red-400">{ratingDistribution.again}</div>
          <div className="text-zinc-500 text-xs mt-1">
            {getPercentage(ratingDistribution.again)}%
          </div>
        </div>

        <div>
          <div className="text-zinc-400 text-sm mb-1">🟠 Difficile</div>
          <div className="text-xl font-bold text-orange-400">{ratingDistribution.hard}</div>
          <div className="text-zinc-500 text-xs mt-1">
            {getPercentage(ratingDistribution.hard)}%
          </div>
        </div>

        <div>
          <div className="text-zinc-400 text-sm mb-1">🟢 Bien</div>
          <div className="text-xl font-bold text-green-400">{ratingDistribution.good}</div>
          <div className="text-zinc-500 text-xs mt-1">
            {getPercentage(ratingDistribution.good)}%
          </div>
        </div>

        <div>
          <div className="text-zinc-400 text-sm mb-1">🔵 Facile</div>
          <div className="text-xl font-bold text-blue-400">{ratingDistribution.easy}</div>
          <div className="text-zinc-500 text-xs mt-1">
            {getPercentage(ratingDistribution.easy)}%
          </div>
        </div>
      </div>
    </div>
  );
}
