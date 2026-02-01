export interface Insight {
  type: 'positive' | 'warning' | 'suggestion' | 'milestone';
  title: string;
  description: string;
  icon: string;
  priority: number;
  action?: {
    label: string;
    href: string;
  };
}

interface ExtendedDeckStats {
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
}

export function generateInsights(
  stats: ExtendedDeckStats,
  deckId: string,
  currentHour: number = new Date().getHours()
): Insight[] {
  const insights: Insight[] = [];

  // 1. Warning - Danger streak (aucune révision aujourd'hui après 18h) (Priorité 5)
  if (currentHour >= 18 && stats.reviewsToday === 0) {
    insights.push({
      type: 'warning',
      title: 'Streak en danger !',
      description: 'Aucune révision aujourd\'hui',
      icon: '🔥',
      priority: 5,
      action: {
        label: 'Commencer maintenant',
        href: `/deck/${deckId}/review`,
      },
    });
  }

  // 2. Milestone - Nouveau record de révisions (Priorité 4)
  if (stats.reviewsToday > 0 && stats.reviewsVsYesterday > 50) {
    insights.push({
      type: 'milestone',
      title: 'Nouveau record !',
      description: `${stats.reviewsToday} cartes révisées aujourd'hui`,
      icon: '🎉',
      priority: 4,
    });
  }

  // 3. Positive - Progression taux de réussite (Priorité 4)
  if (stats.successRateChange >= 10) {
    insights.push({
      type: 'positive',
      title: 'Progression excellente',
      description: `Taux de réussite +${Math.round(stats.successRateChange)}% cette semaine`,
      icon: '📈',
      priority: 4,
    });
  }

  // 4. Positive - Deck presque maîtrisé (Priorité 4)
  const masteryPercentage = (stats.masteredCards / stats.totalCards) * 100;
  if (masteryPercentage >= 80 && masteryPercentage < 100) {
    insights.push({
      type: 'positive',
      title: 'Presque terminé !',
      description: `${Math.round(masteryPercentage)}% du deck maîtrisé`,
      icon: '🎯',
      priority: 4,
    });
  }

  // 5. Milestone - Deck 100% maîtrisé (Priorité 5)
  if (masteryPercentage >= 100) {
    insights.push({
      type: 'milestone',
      title: 'Deck maîtrisé !',
      description: 'Toutes les cartes sont maîtrisées',
      icon: '👑',
      priority: 5,
    });
  }

  // 6. Suggestion - Moment optimal pour réviser (Priorité 2)
  if (currentHour >= 9 && currentHour <= 11 && stats.reviewsToday === 0) {
    insights.push({
      type: 'suggestion',
      title: 'Moment optimal',
      description: 'Les matinées sont idéales pour apprendre',
      icon: '💡',
      priority: 2,
      action: {
        label: 'Commencer',
        href: `/deck/${deckId}/review`,
      },
    });
  }

  // 7. Positive - Bonne régularité (Priorité 3)
  if (stats.reviewsVsPreviousWeek >= 0 && stats.reviewsVsPreviousWeek <= 20) {
    insights.push({
      type: 'positive',
      title: 'Régularité excellente',
      description: 'Maintiens ce rythme constant',
      icon: '✨',
      priority: 3,
    });
  }

  // 8. Warning - Baisse activité (Priorité 3)
  if (stats.reviewsVsPreviousWeek < -30) {
    insights.push({
      type: 'warning',
      title: 'Activité en baisse',
      description: `${Math.abs(Math.round(stats.reviewsVsPreviousWeek))}% moins de révisions cette semaine`,
      icon: '📉',
      priority: 3,
    });
  }

  // 9. Suggestion - Estimation completion (Priorité 2)
  if (stats.estimatedCompletionDays > 0 && stats.estimatedCompletionDays <= 30) {
    insights.push({
      type: 'suggestion',
      title: 'Objectif proche',
      description: `Environ ${stats.estimatedCompletionDays} jours pour maîtriser le deck`,
      icon: '🎯',
      priority: 2,
    });
  }

  // 10. Positive - Taux de succès élevé (Priorité 3)
  if (stats.successRate >= 80 && stats.totalReviews >= 20) {
    insights.push({
      type: 'positive',
      title: 'Performance excellente',
      description: `${Math.round(stats.successRate)}% de taux de réussite`,
      icon: '⭐',
      priority: 3,
    });
  }

  // Tri par priorité décroissante et retour des top 5
  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}
