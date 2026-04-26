/**
 * @file fsrs.ts
 * @brief FSRS-5 algorithm implementation
 */

import type { Flashcard, Rating, CardState } from '@/types';

export const FSRS_PARAMS = {
  w: [
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
    0.34, 1.26, 0.29, 2.61,
  ],
  requestRetention: 0.9,
  maximumInterval: 36500,
};

export function fsrs5Schedule(
  card: Flashcard,
  rating: Rating
): Partial<Flashcard> {
  const ratingMap: Record<Rating, number> = {
    again: 1,
    hard: 2,
    good: 3,
    easy: 4,
  };
  const r = ratingMap[rating];

  let newState: CardState = card.state;
  let newStability = card.stability;
  let newDifficulty = card.difficulty;
  let newReps = card.reps;
  let newLapses = card.lapses;
  let scheduledDays = 1;

  if (card.state === 'new') {
    newState = 'learning';
    newStability = FSRS_PARAMS.w[r - 1];
    newDifficulty =
      FSRS_PARAMS.w[4] - Math.exp(FSRS_PARAMS.w[5] * (r - 3)) + 1;
    newDifficulty = Math.max(1, Math.min(10, newDifficulty));
    newReps = 1;
  } else if (rating === 'again') {
    newState = 'relearning';
    newLapses = card.lapses + 1;
    newStability = Math.max(0.1, card.stability * FSRS_PARAMS.w[11]);
  } else {
    newState = 'review';
    newReps = card.reps + 1;

    const deltaDifficulty = -FSRS_PARAMS.w[6] * (r - 3);
    newDifficulty = Math.max(
      1,
      Math.min(10, card.difficulty + deltaDifficulty)
    );

    const retrievability = Math.pow(
      1 + card.elapsedDays / (9 * card.stability),
      -1
    );
    const stabilityIncrease =
      Math.exp(FSRS_PARAMS.w[8]) *
      (11 - newDifficulty) *
      Math.pow(card.stability, -FSRS_PARAMS.w[9]) *
      (Math.exp((1 - retrievability) * FSRS_PARAMS.w[10]) - 1);

    if (rating === 'hard') {
      newStability =
        card.stability * (1 + stabilityIncrease * FSRS_PARAMS.w[15]);
    } else if (rating === 'easy') {
      newStability =
        card.stability * (1 + stabilityIncrease * FSRS_PARAMS.w[16]);
    } else {
      newStability = card.stability * (1 + stabilityIncrease);
    }
  }

  const requestedRetention = FSRS_PARAMS.requestRetention;
  scheduledDays = Math.round(
    9 * newStability * (1 / requestedRetention - 1)
  );
  scheduledDays = Math.max(
    1,
    Math.min(scheduledDays, FSRS_PARAMS.maximumInterval)
  );

  return {
    state: newState,
    stability: newStability,
    difficulty: newDifficulty,
    reps: newReps,
    lapses: newLapses,
    scheduledDays,
    elapsedDays: 0,
    lastReview: new Date(),
    nextReview: new Date(Date.now() + scheduledDays * 24 * 60 * 60 * 1000),
  };
}

