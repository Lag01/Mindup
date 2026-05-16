/**
 * Conversion des données d'une carte Anki (SM-2 ou FSRS natif) vers le format
 * AnkiReviewStats utilisé par notre Review/FSRS-5.
 *
 * Anki utilise par défaut SM-2 (ease factor entier ×1000). Depuis Anki 2.1.66,
 * un utilisateur peut activer FSRS natif : dans ce cas la colonne `cards.data`
 * contient un JSON {s, d, dr} (stability, difficulty, desired retention).
 *
 * Notre conversion est volontairement conservatrice : on n'invente pas l'historique,
 * on transpose les invariants connus (intervalles, compteurs, état).
 */

import type { AnkiReviewStats, CardStatus } from './anki';
import { createNewAnkiReviewStats } from './anki';

/** Représentation des colonnes Anki utilisées (lecture seule). */
export interface AnkiCardRow {
  /** type Anki : 0=new, 1=learning, 2=review, 3=relearning */
  type: number;
  /** queue Anki : -3=user buried, -2=sched buried, -1=suspended, 0=new, 1=learning, 2=review, 3=day learning */
  queue: number;
  /** Intervalle (jours pour review, secondes négatives pour learning) */
  ivl: number;
  /** Ease factor SM-2 ×1000 (ex: 2500 = ease 2.5). 0 pour les cartes new. */
  factor: number;
  /** Total révisions */
  reps: number;
  /** Total oublis (passages "again" en review) */
  lapses: number;
  /** JSON optionnel contenant l'état FSRS natif Anki {s, d, dr} ou metadata */
  data: string | null;
}

/** Une entrée de revlog Anki (filtrée par carte). */
export interface AnkiRevlogRow {
  /** Timestamp ms (= revlog.id) */
  id: number;
  /** 1=again, 2=hard, 3=good, 4=easy */
  ease: number;
  /** 0=learn, 1=review, 2=relearn, 3=cram */
  type: number;
}

/** Mapping type Anki → CardStatus de notre app. */
function ankiTypeToStatus(type: number, queue: number): CardStatus {
  // Une carte suspendue/buried reste considérée comme dans son état logique,
  // mais on évite d'altérer son scheduling : pour l'import on la traite comme NEW
  // si elle n'a jamais été révisée, sinon on garde son type connu.
  if (queue === -1 || queue === -2 || queue === -3) {
    return type === 0 ? 'NEW' : 'REVIEW';
  }
  switch (type) {
    case 0: return 'NEW';
    case 1: return 'LEARNING';
    case 2: return 'REVIEW';
    case 3: return 'RELEARNING';
    default: return 'NEW';
  }
}

/**
 * Convertit le ease factor SM-2 (×1000) en difficulté FSRS (échelle 1-10).
 * Heuristique : factor 1.3 (minimum SM-2) ≈ difficulté 10, factor 2.5 (défaut) ≈ 5,
 * factor 3.5+ ≈ 1. Formule linéaire clampée.
 */
function sm2EaseToDifficulty(factor: number): number {
  if (!factor || factor <= 0) return 5; // défaut FSRS
  const ease = factor / 1000;
  // ease 1.3 → 10 ; ease 3.5 → 1
  const d = 10 - ((ease - 1.3) / (3.5 - 1.3)) * 9;
  return Math.max(1, Math.min(10, d));
}

/** Compte les ratings depuis le revlog d'une carte. */
function countRatings(revlog: AnkiRevlogRow[]): {
  again: number;
  hard: number;
  good: number;
  easy: number;
} {
  const counts = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const r of revlog) {
    switch (r.ease) {
      case 1: counts.again++; break;
      case 2: counts.hard++; break;
      case 3: counts.good++; break;
      case 4: counts.easy++; break;
    }
  }
  return counts;
}

/**
 * Convertit une carte Anki + son revlog en AnkiReviewStats compatible FSRS-5.
 *
 * @param card  Données de la table `cards`.
 * @param revlog Entrées de `revlog` filtrées pour cette carte (cid = card.id).
 * @param preserveHistory Si false, retourne des stats vierges (carte NEW).
 */
export function convertAnkiCardToReviewStats(
  card: AnkiCardRow,
  revlog: AnkiRevlogRow[],
  preserveHistory: boolean
): AnkiReviewStats {
  if (!preserveHistory) {
    return createNewAnkiReviewStats();
  }

  const counts = countRatings(revlog);

  // Dernière révision = timestamp max du revlog (revlog.id est un timestamp ms).
  const lastReviewTs = revlog.length > 0
    ? Math.max(...revlog.map((r) => r.id))
    : 0;
  const lastReview = lastReviewTs > 0 ? new Date(lastReviewTs) : null;

  // Tentative d'extraction FSRS natif depuis card.data
  let stability = 0;
  let difficulty = 0;
  if (card.data) {
    try {
      const parsed = JSON.parse(card.data) as { s?: number; d?: number };
      if (typeof parsed.s === 'number' && parsed.s > 0) stability = parsed.s;
      if (typeof parsed.d === 'number' && parsed.d > 0) difficulty = parsed.d;
    } catch {
      // data peut contenir d'autres choses ({"pos":1,"lrt":...} pour SM-2) — on ignore.
    }
  }

  // Fallback SM-2 → FSRS : stability ≈ intervalle en jours, difficulty ≈ inverse ease.
  // ivl est en jours pour les cartes review (type 2), en secondes négatives pour learning.
  if (stability === 0 && card.type === 2 && card.ivl > 0) {
    stability = card.ivl;
  }
  if (difficulty === 0) {
    difficulty = sm2EaseToDifficulty(card.factor);
  }

  // Interval & nextReview : utilisables seulement pour les cartes review.
  // Pour learning/relearning, on remet la carte à due "maintenant" pour qu'elle
  // soit re-vue dans la prochaine session.
  let interval: number | null = null;
  let nextReview: Date | null = null;
  if (card.type === 2 && card.ivl > 0 && lastReview) {
    interval = card.ivl;
    nextReview = new Date(lastReview.getTime() + card.ivl * 86400000);
  } else if (card.reps > 0) {
    nextReview = new Date(); // dû maintenant
  }

  const easeFactor = card.factor > 0 ? card.factor / 1000 : 2.5;

  return {
    reps: card.reps,
    againCount: counts.again,
    hardCount: counts.hard,
    goodCount: counts.good,
    easyCount: counts.easy,
    lastReview,
    interval,
    nextReview,
    easeFactor,
    stability,
    difficulty,
    lapses: card.lapses,
    status: ankiTypeToStatus(card.type, card.queue),
  };
}
