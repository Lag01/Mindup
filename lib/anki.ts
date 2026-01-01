/**
 * Système de répétition espacée Anki
 * Basé sur les intervalles : 1j, 3j, 7j, 14j, 30j
 */

export type AnkiRating = 'again' | 'hard' | 'good' | 'easy';
export type CardStatus = 'NEW' | 'LEARNING' | 'REVIEW';

export interface AnkiReviewStats {
  reps: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  lastReview: Date | null;
  interval: number | null;
  nextReview: Date | null;
  easeFactor: number;
  status: CardStatus;
}

/**
 * Intervalles Anki prédéfinis (en jours)
 */
const ANKI_INTERVALS = [1, 3, 7, 14, 30];

/**
 * Calcule le prochain intervalle selon le rating
 *
 * Règles :
 * - Again : Retour à 1 jour (intervalle[0])
 * - Hard : Même intervalle OU intervalle précédent si possible
 * - Good : Intervalle suivant dans la séquence
 * - Easy : Saute un intervalle (ex: 1j -> 7j)
 *
 * @param currentInterval L'intervalle actuel (null pour une carte nouvelle)
 * @param rating L'évaluation de l'utilisateur
 * @returns Le prochain intervalle en jours
 */
function calculateNextInterval(
  currentInterval: number | null,
  rating: AnkiRating
): number {
  // Carte nouvelle (première révision)
  if (currentInterval === null) {
    switch (rating) {
      case 'again':
      case 'hard':
        return ANKI_INTERVALS[0]; // 1 jour
      case 'good':
        return ANKI_INTERVALS[1]; // 3 jours
      case 'easy':
        return ANKI_INTERVALS[2]; // 7 jours (saute 3j)
    }
  }

  // Carte existante
  const currentIndex = ANKI_INTERVALS.indexOf(currentInterval);

  // Si l'intervalle actuel n'est pas dans la liste (cas edge), on part du début
  if (currentIndex === -1) {
    return ANKI_INTERVALS[0];
  }

  switch (rating) {
    case 'again':
      // Retour au début
      return ANKI_INTERVALS[0]; // 1 jour

    case 'hard':
      // Reste au même intervalle ou recule d'un cran
      const hardIndex = Math.max(0, currentIndex - 1);
      return ANKI_INTERVALS[hardIndex];

    case 'good':
      // Passe à l'intervalle suivant (plafonne à 30j)
      const goodIndex = Math.min(ANKI_INTERVALS.length - 1, currentIndex + 1);
      return ANKI_INTERVALS[goodIndex];

    case 'easy':
      // Saute un intervalle (plafonne à 30j)
      const easyIndex = Math.min(ANKI_INTERVALS.length - 1, currentIndex + 2);
      return ANKI_INTERVALS[easyIndex];
  }
}

/**
 * Calcule la date de prochaine révision
 *
 * @param interval Intervalle en jours
 * @returns Date de prochaine révision (normalisée à minuit)
 */
function calculateNextReviewDate(interval: number): Date {
  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + interval);

  // Normaliser à minuit (00:00:00) pour comparaison jour par jour
  nextReview.setHours(0, 0, 0, 0);

  return nextReview;
}

/**
 * Calcule le nouveau statut de la carte
 *
 * @param reps Nombre total de révisions
 * @param againCount Nombre d'échecs
 * @param hardCount Nombre de difficiles
 * @param goodCount Nombre de bons
 * @param easyCount Nombre de faciles
 * @returns Le nouveau statut de la carte
 */
function calculateStatus(
  reps: number,
  againCount: number,
  hardCount: number,
  goodCount: number,
  easyCount: number
): CardStatus {
  if (reps === 0) return 'NEW';

  const totalSuccesses = goodCount + easyCount;
  const successRate = totalSuccesses / reps;

  // Carte maîtrisée : taux >= 50%
  if (successRate >= 0.5) return 'REVIEW';

  // Carte en apprentissage
  return 'LEARNING';
}

/**
 * Mise à jour des statistiques Anki après une révision
 *
 * @param currentStats Statistiques actuelles de la carte
 * @param rating Évaluation de l'utilisateur
 * @returns Nouvelles statistiques mises à jour
 */
export function updateAnkiReviewStats(
  currentStats: AnkiReviewStats,
  rating: AnkiRating
): AnkiReviewStats {
  const now = new Date();

  // Mise à jour des compteurs
  const newReps = currentStats.reps + 1;
  const newAgainCount = currentStats.againCount + (rating === 'again' ? 1 : 0);
  const newHardCount = currentStats.hardCount + (rating === 'hard' ? 1 : 0);
  const newGoodCount = currentStats.goodCount + (rating === 'good' ? 1 : 0);
  const newEasyCount = currentStats.easyCount + (rating === 'easy' ? 1 : 0);

  // Calcul du nouvel intervalle
  const newInterval = calculateNextInterval(currentStats.interval, rating);

  // Calcul de la prochaine révision
  const newNextReview = calculateNextReviewDate(newInterval);

  // Calcul du nouveau statut
  const newStatus = calculateStatus(
    newReps,
    newAgainCount,
    newHardCount,
    newGoodCount,
    newEasyCount
  );

  return {
    reps: newReps,
    againCount: newAgainCount,
    hardCount: newHardCount,
    goodCount: newGoodCount,
    easyCount: newEasyCount,
    lastReview: now,
    interval: newInterval,
    nextReview: newNextReview,
    easeFactor: currentStats.easeFactor, // Pour l'instant, non modifié (extension future possible)
    status: newStatus,
  };
}

/**
 * Crée des statistiques initiales pour une nouvelle carte Anki
 *
 * @returns Statistiques initiales
 */
export function createNewAnkiReviewStats(): AnkiReviewStats {
  return {
    reps: 0,
    againCount: 0,
    hardCount: 0,
    goodCount: 0,
    easyCount: 0,
    lastReview: null,
    interval: null,
    nextReview: null,
    easeFactor: 2.5,
    status: 'NEW',
  };
}

/**
 * Vérifie si une carte est due aujourd'hui
 *
 * @param nextReview Date de prochaine révision (null = carte jamais révisée = due)
 * @returns true si la carte doit être révisée aujourd'hui
 */
export function isCardDue(nextReview: Date | null): boolean {
  if (!nextReview) return true; // Carte jamais révisée = due

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return nextReview <= today;
}

/**
 * Interface pour compter les cartes par catégorie Anki
 */
export interface AnkiCardCounts {
  new: number;       // reps = 0
  learning: number;  // reps > 0, taux < 50%
  review: number;    // taux >= 50%
  due: number;       // nextReview <= aujourd'hui
}

/**
 * Catégorise une carte selon les critères Anki
 *
 * @param stats Statistiques de la carte
 * @returns Catégorie et statut de carte due
 */
export function categorizeAnkiCard(stats: AnkiReviewStats): {
  category: 'new' | 'learning' | 'review';
  isDue: boolean;
} {
  const isDue = isCardDue(stats.nextReview);

  if (stats.reps === 0) {
    return { category: 'new', isDue };
  }

  const totalSuccesses = stats.goodCount + stats.easyCount;
  const successRate = totalSuccesses / stats.reps;

  // Apprise : taux >= 70%
  if (successRate >= 0.7) {
    return { category: 'review', isDue };
  }

  // En apprentissage : taux < 50%
  if (successRate < 0.5) {
    return { category: 'learning', isDue };
  }

  // Cas intermédiaire (50% <= taux < 70%) : considéré comme review
  return { category: 'review', isDue };
}
