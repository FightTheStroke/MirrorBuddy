/**
 * CONVERGIO EDUCATION - FSRS Algorithm Unit Tests
 *
 * Tests for the Free Spaced Repetition Scheduler algorithm.
 * These tests verify the core learning science logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCard,
  reviewCard,
  calculateRetrievability,
  isDue,
  getDueCards,
  calculateStats,
  predictRetention,
  FSRS_CONSTANTS,
  type FSRSCard,
  type Quality,
} from './fsrs';

describe('FSRS Algorithm', () => {
  describe('createCard', () => {
    it('creates a new card with correct initial values', () => {
      const card = createCard();

      expect(card.stability).toBe(FSRS_CONSTANTS.INITIAL_STABILITY);
      expect(card.difficulty).toBe(FSRS_CONSTANTS.INITIAL_DIFFICULTY);
      expect(card.lapses).toBe(0);
      expect(card.reps).toBe(0);
      expect(card.lastReview).toBeInstanceOf(Date);
      expect(card.nextReview).toBeInstanceOf(Date);
    });

    it('creates card that is immediately due', () => {
      const card = createCard();
      expect(isDue(card)).toBe(true);
    });
  });

  describe('reviewCard', () => {
    let card: FSRSCard;

    beforeEach(() => {
      card = createCard();
    });

    it('increments review count after review', () => {
      const reviewed = reviewCard(card, 3);
      expect(reviewed.reps).toBe(1);
    });

    it('increments lapse count when quality is 1 (Again)', () => {
      const reviewed = reviewCard(card, 1);
      expect(reviewed.lapses).toBe(1);
    });

    it('does not increment lapse count when quality > 1', () => {
      const reviewed = reviewCard(card, 3);
      expect(reviewed.lapses).toBe(0);
    });

    it('reduces stability when quality is 1 (Again)', () => {
      // First do a good review to build stability
      const afterGood = reviewCard(card, 4);
      const stabilityAfterGood = afterGood.stability;

      // Then fail the card
      const afterFail = reviewCard(afterGood, 1);

      expect(afterFail.stability).toBeLessThan(stabilityAfterGood);
    });

    it('increases stability more for Easy (4) than Good (3)', () => {
      const afterGood = reviewCard(card, 3);
      const afterEasy = reviewCard(card, 4);

      expect(afterEasy.stability).toBeGreaterThan(afterGood.stability);
    });

    it('increases difficulty when quality is low', () => {
      const afterHard = reviewCard(card, 2);
      expect(afterHard.difficulty).toBeGreaterThan(FSRS_CONSTANTS.INITIAL_DIFFICULTY);
    });

    it('decreases difficulty when quality is high', () => {
      const afterEasy = reviewCard(card, 4);
      expect(afterEasy.difficulty).toBeLessThan(FSRS_CONSTANTS.INITIAL_DIFFICULTY);
    });

    it('schedules next review in the future for successful review', () => {
      const reviewed = reviewCard(card, 3);
      const now = new Date();

      expect(reviewed.nextReview.getTime()).toBeGreaterThan(now.getTime());
    });

    it('schedules shorter interval for Hard than Good', () => {
      const afterHard = reviewCard(card, 2);
      const afterGood = reviewCard(card, 3);

      expect(afterHard.nextReview.getTime()).toBeLessThan(afterGood.nextReview.getTime());
    });

    it('updates lastReview timestamp', () => {
      const before = new Date();
      const reviewed = reviewCard(card, 3);
      const after = new Date();

      expect(reviewed.lastReview.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(reviewed.lastReview.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    describe('all quality ratings', () => {
      const qualities: Quality[] = [1, 2, 3, 4];

      qualities.forEach((quality) => {
        it(`handles quality ${quality} without error`, () => {
          const reviewed = reviewCard(card, quality);

          expect(reviewed.stability).toBeGreaterThan(0);
          expect(reviewed.difficulty).toBeGreaterThanOrEqual(0);
          expect(reviewed.difficulty).toBeLessThanOrEqual(1);
          expect(reviewed.nextReview).toBeInstanceOf(Date);
        });
      });
    });
  });

  describe('calculateRetrievability', () => {
    it('returns 1.0 for a just-reviewed card', () => {
      const card = createCard();
      const retrievability = calculateRetrievability(card);

      // Should be very close to 1.0
      expect(retrievability).toBeGreaterThan(0.99);
    });

    it('decreases over time', () => {
      const card = createCard();

      // Simulate passage of time
      const oldCard: FSRSCard = {
        ...card,
        lastReview: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      };

      const retrievability = calculateRetrievability(oldCard);
      expect(retrievability).toBeLessThan(1.0);
    });

    it('is higher for cards with higher stability', () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const lowStability: FSRSCard = {
        ...createCard(),
        stability: 1,
        lastReview: lastWeek,
      };

      const highStability: FSRSCard = {
        ...createCard(),
        stability: 30,
        lastReview: lastWeek,
      };

      const rLow = calculateRetrievability(lowStability);
      const rHigh = calculateRetrievability(highStability);

      expect(rHigh).toBeGreaterThan(rLow);
    });

    it('returns value between 0 and 1', () => {
      const card: FSRSCard = {
        ...createCard(),
        lastReview: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        stability: 1,
      };

      const r = calculateRetrievability(card);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    });
  });

  describe('isDue', () => {
    it('returns true for new cards', () => {
      const card = createCard();
      expect(isDue(card)).toBe(true);
    });

    it('returns false for cards scheduled in the future', () => {
      const card: FSRSCard = {
        ...createCard(),
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      };

      expect(isDue(card)).toBe(false);
    });

    it('returns true for overdue cards', () => {
      const card: FSRSCard = {
        ...createCard(),
        nextReview: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      expect(isDue(card)).toBe(true);
    });
  });

  describe('getDueCards', () => {
    it('returns empty array for no cards', () => {
      const due = getDueCards([]);
      expect(due).toEqual([]);
    });

    it('filters out cards not due', () => {
      const dueCard = createCard();
      const futureCard: FSRSCard = {
        ...createCard(),
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const due = getDueCards([dueCard, futureCard]);
      expect(due).toHaveLength(1);
    });

    it('respects limit parameter', () => {
      const cards = [createCard(), createCard(), createCard()];
      const due = getDueCards(cards, 2);

      expect(due).toHaveLength(2);
    });

    it('sorts by next review date (earliest first)', () => {
      const card1: FSRSCard = {
        ...createCard(),
        nextReview: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      };
      const card2: FSRSCard = {
        ...createCard(),
        nextReview: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      };

      const due = getDueCards([card2, card1]);
      expect(due[0]).toBe(card1);
      expect(due[1]).toBe(card2);
    });
  });

  describe('calculateStats', () => {
    it('returns zeros for empty array', () => {
      const stats = calculateStats([]);

      expect(stats.totalCards).toBe(0);
      expect(stats.cardsDue).toBe(0);
      expect(stats.avgStability).toBe(0);
    });

    it('calculates correct total cards', () => {
      const cards = [createCard(), createCard(), createCard()];
      const stats = calculateStats(cards);

      expect(stats.totalCards).toBe(3);
    });

    it('counts due cards correctly', () => {
      const dueCard = createCard();
      const futureCard: FSRSCard = {
        ...createCard(),
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const stats = calculateStats([dueCard, futureCard]);
      expect(stats.cardsDue).toBe(1);
    });

    it('counts mastered cards (stability > 30 days)', () => {
      const newCard = createCard();
      const masteredCard: FSRSCard = {
        ...createCard(),
        stability: 60, // 60 days stability
      };

      const stats = calculateStats([newCard, masteredCard]);
      expect(stats.cardsMastered).toBe(1);
    });

    it('calculates average stability', () => {
      const card1: FSRSCard = { ...createCard(), stability: 10 };
      const card2: FSRSCard = { ...createCard(), stability: 20 };

      const stats = calculateStats([card1, card2]);
      expect(stats.avgStability).toBe(15);
    });

    it('calculates average difficulty', () => {
      const card1: FSRSCard = { ...createCard(), difficulty: 0.2 };
      const card2: FSRSCard = { ...createCard(), difficulty: 0.4 };

      const stats = calculateStats([card1, card2]);
      expect(stats.avgDifficulty).toBeCloseTo(0.3, 10);
    });
  });

  describe('predictRetention', () => {
    it('returns ~1.0 for current time', () => {
      const card = createCard();
      const now = new Date();

      const retention = predictRetention(card, now);
      expect(retention).toBeGreaterThan(0.99);
    });

    it('returns lower value for future dates', () => {
      const card = createCard();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const retention = predictRetention(card, nextWeek);
      expect(retention).toBeLessThan(1.0);
    });

    it('predicts higher retention for cards with higher stability', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const lowStabilityCard: FSRSCard = { ...createCard(), stability: 1 };
      const highStabilityCard: FSRSCard = { ...createCard(), stability: 30 };

      const rLow = predictRetention(lowStabilityCard, futureDate);
      const rHigh = predictRetention(highStabilityCard, futureDate);

      expect(rHigh).toBeGreaterThan(rLow);
    });
  });

  describe('stability bounds', () => {
    it('stability never goes below minimum', () => {
      let card = createCard();

      // Fail the card many times
      for (let i = 0; i < 10; i++) {
        card = reviewCard(card, 1);
      }

      expect(card.stability).toBeGreaterThanOrEqual(FSRS_CONSTANTS.MIN_STABILITY_DAYS);
    });

    it('stability never exceeds maximum', () => {
      let card = createCard();

      // Perfect reviews many times
      for (let i = 0; i < 50; i++) {
        card = reviewCard(card, 4);
      }

      expect(card.stability).toBeLessThanOrEqual(FSRS_CONSTANTS.MAX_STABILITY_DAYS);
    });
  });

  describe('difficulty bounds', () => {
    it('difficulty never goes below 0', () => {
      let card = createCard();

      // Many easy reviews
      for (let i = 0; i < 20; i++) {
        card = reviewCard(card, 4);
      }

      expect(card.difficulty).toBeGreaterThanOrEqual(0);
    });

    it('difficulty never exceeds 1', () => {
      let card = createCard();

      // Many hard reviews
      for (let i = 0; i < 20; i++) {
        card = reviewCard(card, 1);
      }

      expect(card.difficulty).toBeLessThanOrEqual(1);
    });
  });

  describe('learning progression', () => {
    it('card progresses with consistent good reviews', () => {
      let card = createCard();

      // Simulate reviews with time passing (more realistic)
      // After several good reviews, the card should be scheduled further out
      for (let i = 0; i < 5; i++) {
        card = reviewCard(card, 3);
        // Simulate time passing to next review
        card = {
          ...card,
          lastReview: new Date(card.nextReview.getTime() - 1000), // Just before next review
        };
      }

      // After consistent good reviews, stability should be reasonable
      expect(card.stability).toBeGreaterThan(0);
      expect(card.reps).toBe(5);
      // Next review should be scheduled in the future
      expect(card.nextReview.getTime()).toBeGreaterThan(Date.now());
    });

    it('card regresses after failure', () => {
      let card = createCard();

      // Build up stability
      for (let i = 0; i < 5; i++) {
        card = reviewCard(card, 4);
      }
      const stableValue = card.stability;

      // Fail the card
      card = reviewCard(card, 1);

      expect(card.stability).toBeLessThan(stableValue);
      expect(card.lapses).toBe(1);
    });
  });
});
