'use client';

import { useMemo } from 'react';
import InsightCard from './InsightCard';
import { generateInsights } from '@/lib/insights-generator';

interface InsightsSectionProps {
  stats: {
    totalCards: number;
    masteredCards: number;
    difficultCards: number;
    reviewsToday: number;
    reviewsVsYesterday: number;
    successRate: number;
    successRateChange: number;
    topDifficultCards: Array<{ cardId: string; front: string; failureRate: number }>;
    estimatedCompletionDays: number;
    reviewsVsPreviousWeek: number;
    totalReviews: number;
  };
  deckId: string;
}

export default function InsightsSection({ stats, deckId }: InsightsSectionProps) {
  const insights = useMemo(() => {
    return generateInsights(stats, deckId);
  }, [stats, deckId]);

  if (insights.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/10">
          <span className="text-3xl">💡</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Continuez comme ça !
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Vos statistiques sont en cours de génération
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Insights & Recommandations
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Analyse de votre progression et suggestions
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight, index) => (
          <InsightCard
            key={`${insight.type}-${index}`}
            type={insight.type}
            icon={insight.icon}
            title={insight.title}
            description={insight.description}
            action={insight.action}
          />
        ))}
      </div>
    </div>
  );
}
