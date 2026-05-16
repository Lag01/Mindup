'use client';

import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatsHeroSection from './v1/StatsHeroSection';
import InsightsSection from './v1/InsightsSection';
import TrendChart from './v1/TrendChart';
import DifficultCardsList from './v1/DifficultCardsList';
import DistributionTabs from './v1/DistributionTabs';
import ForecastChart from './v1/anki/ForecastChart';
import TrueRetentionCard from './v1/anki/TrueRetentionCard';
import IntervalsHistogram from './v1/anki/IntervalsHistogram';
import DeckHealthCard from './v1/anki/DeckHealthCard';
import FragileCardsList from './v1/anki/FragileCardsList';

interface ExtendedDeckStats {
  totalCards: number;

  cardsByStatus: {
    notStarted: number;
    inProgress: number;
    reviewed: number;
  };

  totalReviews: number;
  successRate: number;

  ratingDistribution: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };

  difficultCards: number;
  masteredCards: number;

  reviewsToday: number;
  reviewsThisWeek: number;

  reviewHistory: { date: string; count: number }[];

  learningMethod?: 'IMMEDIATE' | 'ANKI';
  ankiStats?: {
    new: number;
    learning: number;
    review: number;
    relearning?: number;
    dueToday: number;
    avgInterval: number;
    avgStability?: number;
    forecast?: {
      dueToday: number;
      due7d: number;
      due30d: number;
      dailyForecast: Array<{ date: string; count: number }>;
    };
    trueRetention?: number;
    intervalDistribution?: {
      i1: number; i7: number; i30: number; i90: number; i180: number; iMax: number;
    };
    stabilityDistribution?: {
      lt7: number; lt30: number; lt90: number; gte90: number;
    };
    difficultyDistribution?: {
      easy: number; medium: number; hard: number;
    };
    fragileCards?: Array<{
      cardId: string;
      front: string;
      back: string;
      frontType: 'TEXT' | 'LATEX';
      backType: 'TEXT' | 'LATEX';
      frontImage: string | null;
      backImage: string | null;
      stability: number;
      lapses: number;
    }>;
  } | null;

  avgTimePerCard: number;
  totalStudyTime: number;
  reviewsVsYesterday: number;
  reviewsVsPreviousWeek: number;
  successRateChange: number;
  estimatedCompletionDays: number;
  projectedMasteryRate: number;
  currentStreak: number;
  topDifficultCards: Array<{
    cardId: string;
    front: string;
    back: string;
    frontType: 'TEXT' | 'LATEX';
    backType: 'TEXT' | 'LATEX';
    frontImage: string | null;
    backImage: string | null;
    failureRate: number;
  }>;
  recentlyMastered: Array<{
    cardId: string;
    front: string;
    masteredAt: string;
  }>;
}

interface DeckStatisticsV1Props {
  deckId: string;
}

export default function DeckStatisticsV1({ deckId }: DeckStatisticsV1Props) {
  const [stats, setStats] = useState<ExtendedDeckStats | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchStats();
  }, [deckId]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/decks/${deckId}/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading Skeleton */}
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <div className="flex items-center justify-center">
            <div className="h-[200px] w-[200px] animate-pulse rounded-full bg-zinc-800" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-zinc-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/10">
          <span className="text-3xl">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Statistiques non disponibles
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Impossible de charger les données
        </p>
      </div>
    );
  }

  // Calculer reviewsYesterday basé sur la tendance
  const reviewsYesterday = stats.reviewsVsYesterday !== 0
    ? Math.round(stats.reviewsToday / (1 + stats.reviewsVsYesterday / 100))
    : 0;

  // Desktop Layout
  if (!isMobile) {
    return (
      <div className="space-y-8">
        {/* 1. Hero Section */}
        <StatsHeroSection
          totalCards={stats.totalCards}
          masteredCards={stats.masteredCards}
          reviewsToday={stats.reviewsToday}
          reviewsYesterday={reviewsYesterday}
          successRate={stats.successRate}
          currentStreak={stats.currentStreak ?? 0}
          dueCards={stats.ankiStats?.dueToday ?? 0}
          learningMethod={stats.learningMethod}
          estimatedCompletionDays={stats.estimatedCompletionDays}
        />

        {/* 2. Tendances */}
        <TrendChart data={stats.reviewHistory} />

        {/* 3. Insights & Recommandations */}
        <InsightsSection
          stats={{
            totalCards: stats.totalCards,
            masteredCards: stats.masteredCards,
            difficultCards: stats.difficultCards,
            reviewsToday: stats.reviewsToday,
            reviewsVsYesterday: stats.reviewsVsYesterday,
            successRate: stats.successRate,
            successRateChange: stats.successRateChange,
            topDifficultCards: stats.topDifficultCards,
            estimatedCompletionDays: stats.estimatedCompletionDays,
            reviewsVsPreviousWeek: stats.reviewsVsPreviousWeek,
            totalReviews: stats.totalReviews,
          }}
          deckId={deckId}
        />

        {/* 4. Top Cartes Difficiles */}
        <DifficultCardsList cards={stats.topDifficultCards} deckId={deckId} totalReviews={stats.totalReviews} />

        {/* 5. Détails (Distribution) */}
        <DistributionTabs ratingDistribution={stats.ratingDistribution} />

        {/* 6. Section ANKI enrichie */}
        {stats.learningMethod === 'ANKI' && stats.ankiStats && (
          <AnkiStatsSection ankiStats={stats.ankiStats} successRate={stats.successRate} />
        )}
      </div>
    );
  }

  // Mobile Layout avec Tabs
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-zinc-900 border border-zinc-800">
        <TabsTrigger value="overview">Vue</TabsTrigger>
        <TabsTrigger value="trends">Tendances</TabsTrigger>
        <TabsTrigger value="details">Détails</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6 space-y-6">
        <StatsHeroSection
          totalCards={stats.totalCards}
          masteredCards={stats.masteredCards}
          reviewsToday={stats.reviewsToday}
          reviewsYesterday={reviewsYesterday}
          successRate={stats.successRate}
          currentStreak={stats.currentStreak ?? 0}
          dueCards={stats.ankiStats?.dueToday ?? 0}
          learningMethod={stats.learningMethod}
          estimatedCompletionDays={stats.estimatedCompletionDays}
        />

        <InsightsSection
          stats={{
            totalCards: stats.totalCards,
            masteredCards: stats.masteredCards,
            difficultCards: stats.difficultCards,
            reviewsToday: stats.reviewsToday,
            reviewsVsYesterday: stats.reviewsVsYesterday,
            successRate: stats.successRate,
            successRateChange: stats.successRateChange,
            topDifficultCards: stats.topDifficultCards,
            estimatedCompletionDays: stats.estimatedCompletionDays,
            reviewsVsPreviousWeek: stats.reviewsVsPreviousWeek,
            totalReviews: stats.totalReviews,
          }}
          deckId={deckId}
        />
      </TabsContent>

      <TabsContent value="trends" className="mt-6 space-y-6">
        <TrendChart data={stats.reviewHistory} />
        <DifficultCardsList cards={stats.topDifficultCards} deckId={deckId} totalReviews={stats.totalReviews} />
      </TabsContent>

      <TabsContent value="details" className="mt-6 space-y-6">
        <DistributionTabs ratingDistribution={stats.ratingDistribution} />

        {stats.learningMethod === 'ANKI' && stats.ankiStats && (
          <AnkiStatsSection ankiStats={stats.ankiStats} successRate={stats.successRate} />
        )}
      </TabsContent>
    </Tabs>
  );
}

interface AnkiStatsSectionProps {
  ankiStats: NonNullable<ExtendedDeckStats['ankiStats']>;
  successRate: number;
}

function AnkiStatsSection({ ankiStats, successRate }: AnkiStatsSectionProps) {
  const matureCardsCount = ankiStats.intervalDistribution
    ? ankiStats.intervalDistribution.i30 +
      ankiStats.intervalDistribution.i90 +
      ankiStats.intervalDistribution.i180 +
      ankiStats.intervalDistribution.iMax
    : 0;

  return (
    <section className="space-y-6">
      <div className="border-l-4 border-blue-600 pl-4">
        <h2 className="text-xl font-bold text-foreground">Statistiques Anki (FSRS-5)</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Métriques spécifiques à la répétition espacée
        </p>
      </div>

      {/* Compteurs d'état (vue rapide) */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-lg border border-blue-700/40 bg-blue-900/10 p-3">
          <p className="text-xs text-zinc-400">Nouvelles</p>
          <p className="mt-1 text-xl font-bold text-blue-400 tabular-nums">{ankiStats.new}</p>
        </div>
        <div className="rounded-lg border border-yellow-700/40 bg-yellow-900/10 p-3">
          <p className="text-xs text-zinc-400">Apprentissage</p>
          <p className="mt-1 text-xl font-bold text-yellow-400 tabular-nums">{ankiStats.learning}</p>
        </div>
        <div className="rounded-lg border border-green-700/40 bg-green-900/10 p-3">
          <p className="text-xs text-zinc-400">Révision</p>
          <p className="mt-1 text-xl font-bold text-green-400 tabular-nums">{ankiStats.review}</p>
        </div>
        <div className="rounded-lg border border-orange-700/40 bg-orange-900/10 p-3">
          <p className="text-xs text-zinc-400">Dues maintenant</p>
          <p className="mt-1 text-xl font-bold text-orange-400 tabular-nums">{ankiStats.dueToday}</p>
        </div>
      </div>

      {/* True Retention + Santé du deck */}
      {ankiStats.trueRetention !== undefined &&
        ankiStats.stabilityDistribution &&
        ankiStats.difficultyDistribution && (
          <div className="grid gap-6 lg:grid-cols-2">
            <TrueRetentionCard
              trueRetention={ankiStats.trueRetention}
              apparentSuccessRate={successRate}
              matureCardsCount={matureCardsCount}
            />
            <DeckHealthCard
              stabilityDistribution={ankiStats.stabilityDistribution}
              difficultyDistribution={ankiStats.difficultyDistribution}
              avgStability={ankiStats.avgStability ?? 0}
            />
          </div>
        )}

      {/* Forecast 30 jours */}
      {ankiStats.forecast && (
        <ForecastChart
          dailyForecast={ankiStats.forecast.dailyForecast}
          dueToday={ankiStats.forecast.dueToday}
          due7d={ankiStats.forecast.due7d}
          due30d={ankiStats.forecast.due30d}
        />
      )}

      {/* Distribution des intervalles */}
      {ankiStats.intervalDistribution && (
        <IntervalsHistogram data={ankiStats.intervalDistribution} />
      )}

      {/* Cartes fragiles */}
      {ankiStats.fragileCards && <FragileCardsList cards={ankiStats.fragileCards} />}
    </section>
  );
}
