/**
 * Système de répétition espacée Anki
 * Algorithme SM-2 (SuperMemo 2) - Version Anki
 *
 * Règles :
 * - Premier intervalle : 1 jour
 * - Deuxième intervalle : 6 jours
 * - Intervalles suivants : intervalle précédent × ease factor
 * - Ease factor par défaut : 2.5
 * - Ajustement ease factor :
 *   - Again : -0.2 (minimum 1.3)
 *   - Hard : -0.15 (minimum 1.3)
 *   - Good : pas de changement
 *   - Easy : +0.15
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
 * Constantes de l'algorithme SM-2
 */
const MIN_EASE_FACTOR = 1.3;  // 130% minimum (recherche SuperMemo)
const DEFAULT_EASE_FACTOR = 2.5;  // 250% par défaut
const FIRST_INTERVAL = 1;  // Premier intervalle : 1 jour
const SECOND_INTERVAL = 6;  // Deuxième intervalle : 6 jours

/**
 * Ajuste le ease factor selon le rating
 *
 * @param currentEaseFactor Le ease factor actuel
 * @param rating L'évaluation de l'utilisateur
 * @returns Le nouveau ease factor (minimum 1.3)
 */
function adjustEaseFactor(
  currentEaseFactor: number,
  rating: AnkiRating
): number {
  let newEaseFactor = currentEaseFactor;

  switch (rating) {
    case 'again':
      newEaseFactor -= 0.2;
      break;
    case 'hard':
      newEaseFactor -= 0.15;
      break;
    case 'good':
      // Pas de changement
      break;
    case 'easy':
      newEaseFactor += 0.15;
      break;
  }

  // Appliquer le minimum (recherche SuperMemo : jamais en dessous de 130%)
  return Math.max(MIN_EASE_FACTOR, newEaseFactor);
}

/**
 * Calcule le prochain intervalle selon SM-2
 *
 * @param currentInterval L'intervalle actuel (null pour carte nouvelle)
 * @param reps Nombre total de révisions effectuées
 * @param easeFactor Le ease factor ACTUEL (après ajustement)
 * @param rating L'évaluation de l'utilisateur
 * @returns Le prochain intervalle en jours
 */
function calculateNextInterval(
  currentInterval: number | null,
  reps: number,
  easeFactor: number,
  rating: AnkiRating
): number {
  // Again : toujours retour à 1 jour (réinitialisation)
  if (rating === 'again') {
    return FIRST_INTERVAL;
  }

  // Première révision (carte jamais vue)
  if (currentInterval === null || reps === 0) {
    switch (rating) {
      case 'hard':
        return FIRST_INTERVAL;  // 1 jour
      case 'good':
        return FIRST_INTERVAL;  // 1 jour
      case 'easy':
        return SECOND_INTERVAL;  // 6 jours (saute directement)
    }
  }

  // Deuxième révision (intervalle actuel = 1j)
  if (currentInterval === FIRST_INTERVAL) {
    switch (rating) {
      case 'hard':
        return FIRST_INTERVAL;  // Reste à 1j
      case 'good':
        return SECOND_INTERVAL;  // Passe à 6j
      case 'easy':
        return Math.round(SECOND_INTERVAL * 1.5);  // ~9j
    }
  }

  // Révisions suivantes : appliquer l'algorithme SM-2
  let newInterval = currentInterval * easeFactor;

  // Hard : augmente légèrement mais moins que good
  if (rating === 'hard') {
    newInterval = currentInterval * 1.2;
  }

  // Easy : bonus supplémentaire de 30%
  if (rating === 'easy') {
    newInterval = currentInterval * easeFactor * 1.3;
  }

  // Arrondir et garantir minimum 1 jour
  return Math.max(1, Math.round(newInterval));
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

  // Carte apprise : taux >= 70%
  if (successRate >= 0.7) return 'REVIEW';

  // Carte en apprentissage : taux < 70%
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

  // IMPORTANT : Ajuster le ease factor AVANT de calculer l'intervalle
  const newEaseFactor = adjustEaseFactor(currentStats.easeFactor, rating);

  // Calcul du nouvel intervalle avec le NOUVEAU ease factor
  const newInterval = calculateNextInterval(
    currentStats.interval,
    currentStats.reps,  // Utiliser ANCIEN reps (avant incrémentation)
    newEaseFactor,      // Utiliser NOUVEAU ease factor
    rating
  );

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
    easeFactor: newEaseFactor,  // ✅ MISE À JOUR du ease factor
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
  learning: number;  // reps > 0, taux < 70%
  review: number;    // taux >= 70%
  due: number;       // nextReview <= aujourd'hui
}
