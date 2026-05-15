/**
 * Types centralisés pour l'application Flashcards
 *
 * Ce fichier contient tous les types partagés entre les différentes pages
 * pour éviter la duplication de code et assurer la cohérence des types.
 */

// ============================================================================
// Types de contenu
// ============================================================================

export type ContentType = 'TEXT' | 'LATEX';

// ============================================================================
// Card
// ============================================================================

export interface Card {
  id: string;
  front: string;
  back: string;
  frontType: ContentType;
  backType: ContentType;
  frontImage: string | null;
  backImage: string | null;
  order: number;
  deckId?: string;
  review?: Review;
}

// ============================================================================
// Deck
// ============================================================================

export interface Deck {
  id: string;
  name: string;
  userId?: string;
  isPublic?: boolean;
  isImported?: boolean;
  originalDeckId?: string | null;
  importCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CardStatus = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';

// Interface pour les statistiques Anki / FSRS-5
export interface AnkiStats {
  new: number;          // Cartes jamais étudiées
  learning: number;     // Cartes en apprentissage initial
  review: number;       // Cartes en révision long terme
  relearning?: number;  // Cartes en ré-apprentissage après oubli (FSRS-5)
  due: number;          // Cartes dues maintenant
  avgStability?: number; // Stabilité mémoire moyenne (jours, FSRS-5)
}

// Interface pour le Deck avec statistiques (utilisé dans le Dashboard)
export interface DeckWithStats extends Deck {
  totalCards: number;
  notStarted: number;      // Pour IMMEDIATE
  totalReviews: number;    // Pour les deux méthodes
  learningMethod: 'IMMEDIATE' | 'ANKI';
  ankiStats: AnkiStats | null;  // null si IMMEDIATE
  dueCards?: number;  // Deprecated, remplacé par ankiStats.due
}

// Interface pour le Deck avec cartes (utilisé dans Edit)
export interface DeckWithCards extends Deck {
  cards: Card[];
}

// ============================================================================
// Review & Statistics
// ============================================================================

export interface Review {
  id: string;
  cardId: string;
  userId: string;
  reps: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  lastReview: Date | string;
  // Champs FSRS-5 (présents uniquement en mode ANKI)
  interval?: number | null;
  nextReview?: Date | string | null;
  stability?: number;
  difficulty?: number;
  lapses?: number;
  status?: CardStatus;
}

export interface SessionStats {
  total: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface PendingReinsertion {
  cardId: string;
  card: Card;
  cardsRemaining: number;
}

export interface SessionState {
  cardQueue: Card[];
  currentCardId: string | null;
  sessionStats: SessionStats;
  mode?: 'study' | 'review';
  learningMethod?: 'IMMEDIATE' | 'ANKI';
  version?: number;
  baseDeck?: Card[];
  baseIndex?: number;
  pendingReinsertions?: PendingReinsertion[];
}

// ============================================================================
// User
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  reviewedCardsCount: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// Duplicates Detection
// ============================================================================

export interface DuplicateLocation {
  cardId: string;
  field: 'front' | 'back';
  order: number;
}

export interface DuplicateGroup {
  text: string;
  normalizedText: string;
  locations: DuplicateLocation[];
  count: number;
}

// ============================================================================
// VeryFastMath
// ============================================================================

export type MathMode = 'ADDITION' | 'SUBTRACTION' | 'MULTIPLICATION' | 'DIVISION';

export interface VeryFastMathScore {
  id: string;
  userId: string;
  mode: MathMode;
  score: number;
  createdAt: string;
}

// ============================================================================
// API Responses
// ============================================================================

export interface ApiError {
  error: string;
  details?: string;
}

export interface ApiSuccess<T = any> {
  success: true;
  data?: T;
}

// ============================================================================
// Form States
// ============================================================================

export interface CardFormData {
  front: string;
  back: string;
  frontType: ContentType;
  backType: ContentType;
  frontImage: string | null;
  backImage: string | null;
}

export interface FieldsVisibility {
  showText: boolean;
  showLatex: boolean;
  showImage: boolean;
}

/**
 * Métadonnées de pagination retournées par l'API
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  totalCards: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Réponse API pour GET /api/decks/[id]/cards
 */
export interface DeckCardsApiResponse {
  deck: DeckWithCards;
  pagination: PaginationMeta;
}

/**
 * Réponse API pour GET /api/decks/[id]/search
 */
export interface DeckSearchApiResponse extends DeckCardsApiResponse {
  searchQuery: string;
}
