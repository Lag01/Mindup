// Source unique de vérité pour la catégorisation Anki des cartes et leurs
// couleurs. Toute UI affichant des catégories (dashboard, page de stats,
// graphiques) doit importer d'ici afin de rester cohérente.
//
// La catégorisation est entièrement dérivée du champ FSRS `Review.status`
// (NEW / LEARNING / REVIEW / RELEARNING) et de l'intervalle, avec le seuil
// MATURE_INTERVAL_DAYS = 21 (cf. lib/anki.ts) :
//   - new         : status='NEW' (ou aucune Review)
//   - learning    : status='LEARNING'
//   - relearning  : status='RELEARNING' (carte de révision oubliée)
//   - young       : status='REVIEW' AND interval < 21
//   - mature      : status='REVIEW' AND interval >= 21  → « maîtrisée »

import { MATURE_INTERVAL_DAYS } from './anki';
import type { CardStatus } from './types';

export type CardCategoryKey = 'new' | 'learning' | 'relearning' | 'young' | 'mature';

export interface CardCategory {
  key: CardCategoryKey;
  label: string;
  hex: string;   // pour styles inline / Recharts
  dot: string;   // classe Tailwind de fond (pastille / segment)
  text: string;  // classe Tailwind de texte
}

// Ordre = progression d'apprentissage (nouvelle → maîtrisée).
export const CARD_CATEGORIES: CardCategory[] = [
  { key: 'new',        label: 'Nouvelles',        hex: '#3b82f6', dot: 'bg-blue-500',  text: 'text-blue-400' },
  { key: 'learning',   label: 'En apprentissage', hex: '#f59e0b', dot: 'bg-amber-500', text: 'text-amber-400' },
  { key: 'relearning', label: 'Réapprentissage',  hex: '#ef4444', dot: 'bg-red-500',   text: 'text-red-400' },
  { key: 'young',      label: 'Jeunes',           hex: '#4ade80', dot: 'bg-green-400', text: 'text-green-300' },
  { key: 'mature',     label: 'Matures',          hex: '#166534', dot: 'bg-green-800', text: 'text-green-500' },
];

// Palette sémantique pour les graphiques de diagnostic (hors catégories Anki).
// Une seule valeur par rôle pour éviter les quasi-doublons d'une vue à l'autre.
export const CHART_COLORS = {
  danger:  '#ef4444', // rouge   — échec, fragile, court intervalle
  warning: '#f97316', // orange  — difficile, moyen terme
  caution: '#eab308', // jaune   — moyenne difficulté, intervalle moyen
  info:    '#3b82f6', // bleu    — neutre / moyen long terme, tendance
  success: '#22c55e', // vert    — solide, facile, bon intervalle
  accent:  '#a855f7', // violet  — long intervalle, cumul
  cyan:    '#06b6d4', // cyan    — réponse « Bon »
} as const;

// Catégorise une carte à partir de son état FSRS (`Review.status`) et de son
// intervalle. Source unique de vérité côté JS, alignée sur la logique SQL des
// routes API (cf. commentaire d'en-tête + MATURE_INTERVAL_DAYS).
export function getCardCategory(
  status?: CardStatus | null,
  interval?: number | null,
): CardCategory {
  let key: CardCategoryKey;
  if (!status || status === 'NEW') key = 'new';
  else if (status === 'LEARNING') key = 'learning';
  else if (status === 'RELEARNING') key = 'relearning';
  else key = (interval ?? 0) >= MATURE_INTERVAL_DAYS ? 'mature' : 'young'; // REVIEW
  return CARD_CATEGORIES.find(c => c.key === key)!;
}

// Map clé → hex, pratique pour Recharts ou styles inline.
export const CARD_CATEGORY_COLORS: Record<CardCategoryKey, string> = CARD_CATEGORIES.reduce(
  (acc, c) => {
    acc[c.key] = c.hex;
    return acc;
  },
  {} as Record<CardCategoryKey, string>
);

export interface CardCategoryCounts {
  new: number;
  learning: number;
  relearning: number;
  young: number;
  mature: number;
}

// Regroupement compact pour le dashboard : 3 segments lisibles sur une petite
// carte de deck. « En cours » fusionne apprentissage + réapprentissage + jeunes.
// « Maîtrisées » = matures uniquement (définition Anki, alignée sur la page stats).
export interface DashboardGroups {
  new: { count: number; hex: string; label: string };
  inProgress: { count: number; hex: string; label: string };
  mature: { count: number; hex: string; label: string };
}

export function toDashboardGroups(counts: {
  new?: number;
  learning?: number;
  relearning?: number;
  young?: number;
  mature?: number;
}): DashboardGroups {
  const learning = counts.learning ?? 0;
  const relearning = counts.relearning ?? 0;
  const young = counts.young ?? 0;
  return {
    new: { count: counts.new ?? 0, hex: CARD_CATEGORY_COLORS.new, label: 'Nouvelles' },
    inProgress: { count: learning + relearning + young, hex: CARD_CATEGORY_COLORS.learning, label: 'En cours' },
    mature: { count: counts.mature ?? 0, hex: CARD_CATEGORY_COLORS.mature, label: 'Maîtrisées' },
  };
}
