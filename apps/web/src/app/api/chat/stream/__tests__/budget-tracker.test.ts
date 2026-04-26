/**
 * Unit tests for MidStreamBudgetTracker (F-13)
 */

import { describe, it, expect } from 'vitest';

import { MidStreamBudgetTracker, estimateTokens, TOKEN_COST_PER_UNIT } from '../budget-tracker';

describe('estimateTokens', () => {
  it('estimates tokens from text (4 chars = 1 token)', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('Hi')).toBe(1); // 2 chars -> ceil(2/4) = 1
    expect(estimateTokens('Hello')).toBe(2); // 5 chars -> ceil(5/4) = 2
    expect(estimateTokens('Hello World!')).toBe(3); // 12 chars -> ceil(12/4) = 3
  });

  it('handles unicode characters', () => {
    // Italian text with accents
    expect(estimateTokens('Ciao!')).toBe(2); // 5 chars
    expect(estimateTokens('perché')).toBe(2); // 6 chars
  });
});

describe('MidStreamBudgetTracker', () => {
  const userId = 'test-user';

  it('tracks content chunks and estimates tokens', () => {
    const tracker = new MidStreamBudgetTracker(50.0, 0, userId);

    tracker.trackChunk('Hello');
    expect(tracker.getEstimatedTokens()).toBe(2); // 5 chars -> 2 tokens

    tracker.trackChunk(' World');
    expect(tracker.getEstimatedTokens()).toBe(4); // +6 chars -> +2 tokens
  });

  it('calculates estimated cost correctly', () => {
    const tracker = new MidStreamBudgetTracker(50.0, 0, userId);

    // Add 1000 chars = 250 tokens
    tracker.trackChunk('a'.repeat(1000));

    const expectedCost = 250 * TOKEN_COST_PER_UNIT;
    expect(tracker.getEstimatedCost()).toBeCloseTo(expectedCost, 10);
  });

  it('returns true when budget exceeded', () => {
    // Budget: $0.01, spent: $0, remaining with 95% margin: $0.0095
    // Max tokens: 0.0095 / 0.000002 = 4750 tokens
    // At 4 chars/token, that's ~19000 chars
    const tracker = new MidStreamBudgetTracker(0.01, 0, userId);

    // Add content that exceeds budget
    const exceeded = tracker.trackChunk('a'.repeat(80000)); // 20000 tokens

    expect(exceeded).toBe(true);
  });

  it('returns false when within budget', () => {
    const tracker = new MidStreamBudgetTracker(50.0, 0, userId);

    // Small chunk - well within budget
    const exceeded = tracker.trackChunk('Hello world');

    expect(exceeded).toBe(false);
  });

  it('accounts for already spent budget', () => {
    // Budget: $50, spent: $49.99, remaining: $0.01 * 0.95 = $0.0095
    const tracker = new MidStreamBudgetTracker(50.0, 49.99, userId);

    // Should trigger budget exceeded quickly
    const exceeded = tracker.trackChunk('a'.repeat(80000));

    expect(exceeded).toBe(true);
  });

  it('handles zero remaining budget', () => {
    // Budget: $10, spent: $10
    const tracker = new MidStreamBudgetTracker(10.0, 10.0, userId);

    // Any content should exceed budget
    const exceeded = tracker.trackChunk('Hi');

    expect(exceeded).toBe(true);
  });

  it('handles negative remaining budget gracefully', () => {
    // Budget: $10, spent: $15 (overspent)
    const tracker = new MidStreamBudgetTracker(10.0, 15.0, userId);

    const exceeded = tracker.trackChunk('Hi');

    expect(exceeded).toBe(true);
  });
});
