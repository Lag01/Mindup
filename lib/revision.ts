/**
 * Système de révision immédiate avec file dynamique
 * Remplace l'ancien système FSRS basé sur des intervalles de jours
 */

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewStats {
  reps: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  lastReview: Date | null;
}

/**
 * Intervalles de réinsertion (en nombre de cartes)
 * Détermine combien de cartes plus tard une carte reviendra dans la file
 */
export const REVISION_INTERVALS: Record<Rating, number> = {
  again: 3,    // Carte échouée : revient très vite
  hard: 8,     // Carte difficile : revient assez vite
  good: 20,    // Carte réussie : revient modérément vite
  easy: 30,    // Carte facile : revient beaucoup plus tard
};

/**
 * Crée des statistiques initiales pour une nouvelle carte
 */
export function createNewReviewStats(): ReviewStats {
  return {
    reps: 0,
    againCount: 0,
    hardCount: 0,
    goodCount: 0,
    easyCount: 0,
    lastReview: null,
  };
}

/**
 * Met à jour les statistiques après une révision
 */
export function updateReviewStats(
  currentStats: ReviewStats,
  rating: Rating
): ReviewStats {
  const now = new Date();

  return {
    reps: currentStats.reps + 1,
    againCount: currentStats.againCount + (rating === 'again' ? 1 : 0),
    hardCount: currentStats.hardCount + (rating === 'hard' ? 1 : 0),
    goodCount: currentStats.goodCount + (rating === 'good' ? 1 : 0),
    easyCount: currentStats.easyCount + (rating === 'easy' ? 1 : 0),
    lastReview: now,
  };
}

/**
 * Calcule le taux de réussite d'une carte (en pourcentage)
 * Considère "good" et "easy" comme des réussites
 */
export function calculateSuccessRate(stats: ReviewStats): number {
  if (stats.reps === 0) return 0;

  const successCount = stats.goodCount + stats.easyCount;
  return Math.round((successCount / stats.reps) * 100);
}

/**
 * Calcule la position de réinsertion dans la file
 * @param rating - L'évaluation de la carte
 * @param currentQueueLength - Longueur actuelle de la file
 * @returns La position où insérer la carte (0 = début)
 */
export function calculateInsertPosition(
  rating: Rating,
  currentQueueLength: number
): number {
  const interval = REVISION_INTERVALS[rating];

  // La position est le minimum entre l'intervalle et la longueur de la file
  // Cela garantit qu'on ne dépasse jamais la taille de la file
  return Math.min(interval, currentQueueLength);
}

/**
 * Insère une carte dans la file à la position appropriée
 * @param queue - File actuelle de cartes
 * @param card - Carte à insérer
 * @param rating - Évaluation de la carte
 * @returns Nouvelle file avec la carte insérée
 */
export function insertCardInQueue<T>(
  queue: T[],
  card: T,
  rating: Rating
): T[] {
  const newQueue = [...queue];
  const position = calculateInsertPosition(rating, newQueue.length);

  newQueue.splice(position, 0, card);

  return newQueue;
}

/**
 * Détermine si une session doit recommencer
 * (utilisé quand la file est vide)
 */
export function shouldRestartSession(queueLength: number): boolean {
  return queueLength === 0;
}

/**
 * Calcule des métriques de performance pour la session en cours
 */
export interface SessionMetrics {
  totalReviewed: number;
  againRate: number;
  hardRate: number;
  goodRate: number;
  easyRate: number;
}

export function calculateSessionMetrics(
  reviews: Array<{ rating: Rating }>
): SessionMetrics {
  if (reviews.length === 0) {
    return {
      totalReviewed: 0,
      againRate: 0,
      hardRate: 0,
      goodRate: 0,
      easyRate: 0,
    };
  }

  const counts = {
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  };

  reviews.forEach(review => {
    counts[review.rating]++;
  });

  const total = reviews.length;

  return {
    totalReviewed: total,
    againRate: Math.round((counts.again / total) * 100),
    hardRate: Math.round((counts.hard / total) * 100),
    goodRate: Math.round((counts.good / total) * 100),
    easyRate: Math.round((counts.easy / total) * 100),
  };
}
