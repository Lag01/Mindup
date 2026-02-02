'use client';

import ProgressRingSimple from './ProgressRingSimple';
import StatCard from './StatCard';
import { calculateTrend } from '@/lib/stats-calculations';

interface StatsHeroSectionProps {
  totalCards: number;
  masteredCards: number;
  reviewsToday: number;
  reviewsYesterday?: number;
  successRate: number;
  currentStreak?: number;
  dueCards?: number;
  learningMethod?: 'IMMEDIATE' | 'ANKI';
  estimatedCompletionDays?: number;
}

function formatCompletionDays(days: number): string {
  if (days === 0) return 'Terminé !';
  if (days === 1) return '1 jour';
  if (days <= 7) return `${days} jours`;
  if (days <= 30) return `~${days} jours`;
  const weeks = Math.round(days / 7);
  return `~${weeks} semaine${weeks > 1 ? 's' : ''}`;
}

export default function StatsHeroSection({
  totalCards,
  masteredCards,
  reviewsToday,
  reviewsYesterday = 0,
  successRate,
  currentStreak = 0,
  dueCards = 0,
  learningMethod,
  estimatedCompletionDays = 0,
}: StatsHeroSectionProps) {
  const masteryPercentage = totalCards > 0 ? (masteredCards / totalCards) * 100 : 0;
  const reviewsTrend = calculateTrend(reviewsToday, reviewsYesterday);

  return (
    <div className="space-y-6">
      {/* Hero Layout: ProgressRing + StatCards */}
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Progress Ring */}
        <div className="flex items-center justify-center lg:justify-start">
          <ProgressRingSimple
            percentage={masteryPercentage}
            size="lg"
            label="maîtrisé"
            sublabel={`${masteredCards}/${totalCards}`}
          />
        </div>

        {/* Stat Cards Grid (2x2) */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* À réviser - uniquement pour ANKI */}
          {learningMethod === 'ANKI' && (
            <StatCard
              label="À réviser"
              value={dueCards}
              color="orange"
              subtext={`${dueCards} carte${dueCards > 1 ? 's' : ''} due${dueCards > 1 ? 's' : ''}`}
            />
          )}

          {/* Taux de réussite */}
          <StatCard
            label="Taux de réussite"
            value={`${Math.round(successRate)}%`}
            color="green"
          />

          {/* Streak actuel */}
          <StatCard
            label="Streak actuel"
            value={currentStreak}
            color="orange"
            subtext={`${currentStreak} jour${currentStreak > 1 ? 's' : ''}`}
          />

          {/* Aujourd'hui */}
          <StatCard
            label="Aujourd'hui"
            value={reviewsToday}
            color="blue"
            subtext={reviewsYesterday > 0 ? `${reviewsTrend.percentage}% vs hier` : undefined}
          />

          {/* Maîtrise complète */}
          <StatCard
            label="Maîtrise complète"
            value={formatCompletionDays(estimatedCompletionDays)}
            color="purple"
            subtext={estimatedCompletionDays > 0 ? `${estimatedCompletionDays} jour${estimatedCompletionDays > 1 ? 's' : ''}` : undefined}
          />
        </div>
      </div>
    </div>
  );
}
