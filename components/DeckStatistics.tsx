'use client';

import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import MetricsCard from './DeckStatistics/MetricsCard';
import PerformanceChart from './DeckStatistics/PerformanceChart';
import ReviewHistoryChart from './DeckStatistics/ReviewHistoryChart';
import RatingsDistribution from './DeckStatistics/RatingsDistribution';
import RecentActivity from './DeckStatistics/RecentActivity';

interface DeckStats {
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
}

interface DeckStatisticsProps {
  deckId: string;
}

export default function DeckStatistics({ deckId }: DeckStatisticsProps) {
  const [stats, setStats] = useState<DeckStats | null>(null);
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
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <div className="text-zinc-400 text-center">Chargement des statistiques...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <div className="text-zinc-400 text-center">Statistiques non disponibles</div>
      </div>
    );
  }

  // Calculer les cartes normales
  const normalCards = stats.totalCards - (stats.difficultCards + stats.masteredCards + stats.cardsByStatus.notStarted);

  return (
    <div className="space-y-6">
      {/* Cartes de métriques clés - 8 cartes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricsCard
          label="Total"
          value={stats.totalCards}
          description="cartes"
          colorClass="text-foreground"
        />
        <MetricsCard
          label="Non commencées"
          value={stats.cardsByStatus.notStarted}
          description="jamais révisées"
          colorClass="text-gray-400"
        />
        <MetricsCard
          label="En cours"
          value={stats.cardsByStatus.inProgress}
          description="en apprentissage"
          colorClass="text-blue-400"
        />
        <MetricsCard
          label="Maîtrisées"
          value={stats.masteredCards}
          description=">70% facile"
          colorClass="text-green-400"
        />
        <MetricsCard
          label="Difficiles"
          value={stats.difficultCards}
          description=">50% échecs"
          colorClass="text-red-400"
        />
        <MetricsCard
          label="Taux de réussite"
          value={`${stats.successRate.toFixed(1)}%`}
          description="good + easy"
          colorClass="text-emerald-400"
        />
        <MetricsCard
          label="Révisions totales"
          value={stats.totalReviews}
          description="total"
          colorClass="text-purple-400"
        />
        <MetricsCard
          label="Aujourd'hui"
          value={stats.reviewsToday}
          description="révisions"
          colorClass="text-blue-400"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PerformanceChart
          difficultCards={stats.difficultCards}
          normalCards={normalCards}
          masteredCards={stats.masteredCards}
          isMobile={isMobile}
        />
        <ReviewHistoryChart
          reviewHistory={stats.reviewHistory}
          isMobile={isMobile}
        />
      </div>

      {/* Détails des ratings */}
      <RatingsDistribution
        ratingDistribution={stats.ratingDistribution}
        totalReviews={stats.totalReviews}
      />

      {/* Activité récente */}
      <RecentActivity
        reviewsThisWeek={stats.reviewsThisWeek}
        inProgressCards={stats.cardsByStatus.inProgress}
        masteredCards={stats.masteredCards}
        totalCards={stats.totalCards}
      />
    </div>
  );
}
