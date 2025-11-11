import { FSRS, Rating, Grade, Card, RecordLog, DateInput, createEmptyCard } from 'ts-fsrs';

const fsrs = new FSRS({});

export interface ReviewData {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: Date | null;
}

export function createNewCard(): ReviewData {
  const card = createEmptyCard();
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? new Date(card.last_review) : null,
  };
}

export function reviewCard(
  reviewData: ReviewData,
  rating: 'again' | 'hard' | 'good' | 'easy',
  now?: Date
): ReviewData {
  const card: Card = {
    due: reviewData.due,
    stability: reviewData.stability,
    difficulty: reviewData.difficulty,
    elapsed_days: reviewData.elapsedDays,
    scheduled_days: reviewData.scheduledDays,
    learning_steps: reviewData.learningSteps,
    reps: reviewData.reps,
    lapses: reviewData.lapses,
    state: reviewData.state,
    last_review: reviewData.lastReview ?? undefined,
  };

  const ratingMap: Record<string, Grade> = {
    again: Rating.Again,
    hard: Rating.Hard,
    good: Rating.Good,
    easy: Rating.Easy,
  };

  const scheduling = fsrs.repeat(card, now || new Date());
  const recordLog = scheduling[ratingMap[rating]];

  return {
    due: recordLog.card.due,
    stability: recordLog.card.stability,
    difficulty: recordLog.card.difficulty,
    elapsedDays: recordLog.card.elapsed_days,
    scheduledDays: recordLog.card.scheduled_days,
    learningSteps: recordLog.card.learning_steps,
    reps: recordLog.card.reps,
    lapses: recordLog.card.lapses,
    state: recordLog.card.state,
    lastReview: recordLog.card.last_review ? new Date(recordLog.card.last_review) : null,
  };
}

export function getDueCards(reviews: ReviewData[], now?: Date): ReviewData[] {
  const currentTime = now || new Date();
  return reviews.filter(review => review.due <= currentTime);
}
