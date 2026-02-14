/**
 * Système de révision immédiate avec file dynamique
 * Remplace l'ancien système FSRS basé sur des intervalles de jours
 */

import { Card, PendingReinsertion } from './types';

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
 * Note: "easy" ne réinsère pas la carte, elle continue simplement dans la file principale
 */
export const REVISION_INTERVALS: Record<Rating, number> = {
  again: 3,    // Carte échouée : revient après 3 cartes
  hard: 5,     // Carte difficile : revient après 5 cartes
  good: 8,     // Carte réussie : revient après 8 cartes
  easy: 0,     // Carte facile : pas de réinsertion (continue dans la file principale)
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
 * @deprecated Utiliser advanceCyclicQueue à la place
 * Calcule la position de réinsertion dans la file
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
 * @deprecated Utiliser advanceCyclicQueue à la place
 * Insère une carte dans la file à la position appropriée
 */
export function insertCardInQueue<T>(
  queue: T[],
  card: T,
  rating: Rating
): T[] {
  // Si la carte est marquée "easy", elle ne se réinsère pas dans la file
  // Elle continue simplement dans la rotation principale
  if (rating === 'easy') {
    return queue;
  }

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

/**
 * Avance la file cyclique après notation d'une carte (mode IMMEDIATE v2)
 *
 * Algorithme :
 * 1. Décrémenter cardsRemaining de toutes les réinsertions en attente
 * 2. Si rating != 'easy' : ajouter la carte courante en réinsertion
 * 3. Chercher la première réinsertion prête (cardsRemaining <= 0, FIFO)
 *    → Si trouvée : c'est la prochaine carte
 *    → Sinon : prochaine carte = baseDeck[baseIndex % length], baseIndex++
 */
export function advanceCyclicQueue(
  currentCard: Card,
  rating: Rating,
  baseDeck: Card[],
  baseIndex: number,
  pending: PendingReinsertion[]
): { nextCard: Card; newBaseIndex: number; newPending: PendingReinsertion[] } {
  // 1. Décrémenter cardsRemaining pour toutes les réinsertions
  let newPending = pending.map(p => ({
    ...p,
    cardsRemaining: p.cardsRemaining - 1,
  }));

  // 2. Si pas "easy", planifier une réinsertion
  if (rating !== 'easy') {
    const interval = REVISION_INTERVALS[rating];
    newPending.push({
      cardId: currentCard.id,
      card: currentCard,
      cardsRemaining: interval,
    });
  }

  // 3. Trouver la première réinsertion prête (FIFO)
  const readyIndex = newPending.findIndex(p => p.cardsRemaining <= 0);
  let nextCard: Card;
  let newBaseIndex = baseIndex;

  if (readyIndex !== -1) {
    nextCard = newPending[readyIndex].card;
    newPending = [...newPending.slice(0, readyIndex), ...newPending.slice(readyIndex + 1)];
  } else {
    nextCard = baseDeck[baseIndex % baseDeck.length];
    newBaseIndex = baseIndex + 1;
  }

  return { nextCard, newBaseIndex, newPending };
}

/**
 * Prédit la prochaine carte sans modifier l'état (pour le preloading)
 */
export function peekNextCyclicCard(
  baseDeck: Card[],
  baseIndex: number,
  pending: PendingReinsertion[]
): Card | null {
  if (baseDeck.length === 0) return null;

  // Simuler le décrément : la première réinsertion avec cardsRemaining <= 1
  // deviendra <= 0 après décrément
  const nextReinsertion = pending.find(p => p.cardsRemaining <= 1);
  if (nextReinsertion) {
    return nextReinsertion.card;
  }

  return baseDeck[baseIndex % baseDeck.length];
}
