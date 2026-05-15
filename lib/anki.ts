import { fsrs, createEmptyCard, generatorParameters, Rating, State, type Grade } from 'ts-fsrs';

export type AnkiRating = 'again' | 'hard' | 'good' | 'easy';
export type CardStatus = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';

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
  stability: number;
  difficulty: number;
  lapses: number;
  status: CardStatus;
}

const RATING_MAP: Record<AnkiRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const STATE_TO_STATUS: Record<number, CardStatus> = {
  [State.New]: 'NEW',
  [State.Learning]: 'LEARNING',
  [State.Review]: 'REVIEW',
  [State.Relearning]: 'RELEARNING',
};

const STATUS_TO_STATE: Record<CardStatus, number> = {
  NEW: State.New,
  LEARNING: State.Learning,
  REVIEW: State.Review,
  RELEARNING: State.Relearning,
};

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export function updateAnkiReviewStats(
  currentStats: AnkiReviewStats,
  rating: AnkiRating
): AnkiReviewStats {
  const now = new Date();

  const card = {
    due: currentStats.nextReview ?? now,
    stability: currentStats.stability,
    difficulty: currentStats.difficulty,
    elapsed_days: currentStats.lastReview
      ? Math.max(0, Math.floor((now.getTime() - currentStats.lastReview.getTime()) / 86400000))
      : 0,
    scheduled_days: currentStats.interval ?? 0,
    reps: currentStats.reps,
    lapses: currentStats.lapses,
    learning_steps: 0,
    state: STATUS_TO_STATE[currentStats.status],
    last_review: currentStats.lastReview ?? undefined,
  };

  const result = scheduler.next(card, now, RATING_MAP[rating]);
  const next = result.card;

  return {
    reps: next.reps,
    againCount: currentStats.againCount + (rating === 'again' ? 1 : 0),
    hardCount: currentStats.hardCount + (rating === 'hard' ? 1 : 0),
    goodCount: currentStats.goodCount + (rating === 'good' ? 1 : 0),
    easyCount: currentStats.easyCount + (rating === 'easy' ? 1 : 0),
    lastReview: next.last_review ? new Date(next.last_review) : now,
    interval: next.scheduled_days,
    nextReview: new Date(next.due),
    easeFactor: currentStats.easeFactor,
    stability: next.stability,
    difficulty: next.difficulty,
    lapses: next.lapses,
    status: STATE_TO_STATUS[next.state] ?? 'LEARNING',
  };
}

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
    stability: 0,
    difficulty: 0,
    lapses: 0,
    status: 'NEW',
  };
}

export function isCardDue(nextReview: Date | null): boolean {
  if (!nextReview) return true;
  return nextReview <= new Date();
}

export interface AnkiCardCounts {
  new: number;
  learning: number;
  review: number;
  due: number;
}
