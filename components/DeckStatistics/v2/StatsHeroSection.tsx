'use client';

import { ProgressRing } from './ProgressRing';
import { EnhancedStatCard } from './EnhancedStatCard';
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
  sparklineData?: {
    reviews?: number[];
    successRate?: number[];
  };
}

function formatCompletionDays(days: number): string {
  if (days === 0) return 'Terminé !';
  if (days === 1) return '1 jour';
  if (days <= 7) return `${days} jours`;
  if (days <= 30) return `~${days} jours`;
  const weeks = Math.round(days / 7);
  return `~${weeks} semaine${weeks > 1 ? 's' : ''}`;
}

export function StatsHeroSection({
  totalCards,
  masteredCards,
  reviewsToday,
  reviewsYesterday = 0,
  successRate,
  currentStreak = 0,
  dueCards = 0,
  learningMethod,
  estimatedCompletionDays = 0,
  sparklineData,
}: StatsHeroSectionProps) {
  const masteryPercentage = totalCards > 0 ? (masteredCards / totalCards) * 100 : 0;

  const reviewsTrend = calculateTrend(reviewsToday, reviewsYesterday);

  return (
    <div className="space-y-6">
      {/* Hero Layout: ProgressRing + StatCards */}
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Progress Ring */}
        <div className="flex items-center justify-center lg:justify-start">
          <ProgressRing
            percentage={masteryPercentage}
            size="lg"
            label="maîtrisé"
            sublabel={`${masteredCards}/${totalCards}`}
            gradient="from-green-500 to-emerald-600"
          />
        </div>

        {/* Stat Cards Grid (2x2) */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* À réviser - uniquement pour ANKI */}
          {learningMethod === 'ANKI' && (
            <div className="stat-card">
              <EnhancedStatCard
                label="À réviser"
                value={dueCards}
                icon="📝"
                gradient="from-orange-500 to-red-600"
                trend={
                  dueCards > 0
                    ? {
                        value: dueCards,
                        label: 'cartes dues',
                      }
                    : undefined
                }
              />
            </div>
          )}

          {/* Taux de réussite */}
          <div className="stat-card">
            <EnhancedStatCard
              label="Taux de réussite"
              value={`${Math.round(successRate)}%`}
              icon="🎯"
              gradient="from-green-500 to-emerald-600"
              sparkline={sparklineData?.successRate}
            />
          </div>

          {/* Streak actuel */}
          <div className="stat-card">
            <EnhancedStatCard
              label="Streak actuel"
              value={currentStreak}
              icon="🔥"
              gradient="from-yellow-500 to-orange-600"
              trend={{
                value: currentStreak,
                label: 'jours',
              }}
            />
          </div>

          {/* Aujourd'hui */}
          <div className="stat-card">
            <EnhancedStatCard
              label="Aujourd'hui"
              value={reviewsToday}
              icon="✨"
              gradient="from-blue-500 to-cyan-600"
              trend={
                reviewsYesterday > 0
                  ? {
                      value: reviewsTrend.percentage,
                      label: 'vs hier',
                    }
                  : undefined
              }
              sparkline={sparklineData?.reviews}
            />
          </div>

          {/* Maîtrise complète */}
          <div className="stat-card">
            <EnhancedStatCard
              label="Maîtrise complète"
              value={formatCompletionDays(estimatedCompletionDays)}
              icon="🎯"
              gradient="from-purple-500 to-pink-600"
              trend={
                estimatedCompletionDays > 0
                  ? {
                      value: estimatedCompletionDays,
                      label: estimatedCompletionDays <= 1 ? 'jour' : 'jours',
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
