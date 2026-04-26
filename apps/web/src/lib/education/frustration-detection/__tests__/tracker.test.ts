/**
 * Tests for frustration tracker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FrustrationTracker } from '../tracker';

describe('FrustrationTracker', () => {
  let tracker: FrustrationTracker;

  beforeEach(() => {
    tracker = new FrustrationTracker('it');
  });

  describe('analyze', () => {
    it('analyzes single frustration message', () => {
      const result = tracker.analyze('Non ce la faccio più!');

      expect(result.overall).toBeGreaterThan(0.7);
      expect(result.textAnalysis.frustrationScore).toBeGreaterThan(0.8);
      expect(result.trend).toBe('stable');
    });

    it('analyzes neutral message', () => {
      const result = tracker.analyze('La capitale della Francia è Parigi');

      expect(result.overall).toBe(0);
      expect(result.textAnalysis.frustrationScore).toBe(0);
    });

    it('tracks fillers', () => {
      const result = tracker.analyze('Ehm, allora, cioè, tipo, non so...');

      expect(result.fillerCount).toBeGreaterThan(3);
      expect(result.breakdown.fillerPenalty).toBeGreaterThan(0);
    });
  });

  describe('repeated attempts', () => {
    it('detects repeated similar questions', () => {
      // Ask similar question multiple times
      tracker.analyze('Come si risolve questa equazione?');
      tracker.analyze('Come risolvo questa equazione?');
      const result = tracker.analyze('Come posso risolvere questa equazione?');

      expect(result.repeatMultiplier).toBeGreaterThan(1);
      expect(result.breakdown.repeatedAttempts).toBeGreaterThan(0);
    });

    it('tracks separate questions independently', () => {
      tracker.analyze('Qual è la capitale della Francia?');
      tracker.analyze('Come si calcola la derivata?');
      const result = tracker.analyze('Quanto fa 2 + 2?');

      expect(result.repeatMultiplier).toBe(1);
    });

    it('returns repeated attempts list', () => {
      tracker.analyze('Non capisco le frazioni');
      tracker.analyze('Non capisco le frazioni');
      tracker.analyze('Non capisco le frazioni');

      const attempts = tracker.getRepeatedAttempts(2);
      expect(attempts.length).toBeGreaterThan(0);
      expect(attempts[0].count).toBe(3);
    });
  });

  describe('trend tracking', () => {
    it('detects declining trend', () => {
      // Start neutral
      tracker.analyze('Okay, proviamo');
      tracker.analyze('Hmm, vediamo');
      tracker.analyze('Non sono sicuro');

      // Then frustrated
      tracker.analyze('Non capisco');
      tracker.analyze('È difficile');
      const result = tracker.analyze('Non ce la faccio');

      expect(result.trend).toBe('declining');
    });

    it('detects improving trend', () => {
      // Start frustrated
      tracker.analyze('Non ce la faccio');
      tracker.analyze('È troppo difficile');
      tracker.analyze('Odio questo');

      // Then neutral
      tracker.analyze('Okay, forse ho capito');
      tracker.analyze('Sì, ora è più chiaro');
      const result = tracker.analyze('Perfetto, grazie');

      expect(result.trend).toBe('improving');
    });
  });

  describe('reset', () => {
    it('resets tracker state', () => {
      tracker.analyze('Non ce la faccio');
      tracker.analyze('Non ce la faccio');
      tracker.analyze('Non ce la faccio');

      tracker.reset();

      const result = tracker.analyze('Non ce la faccio');
      expect(result.repeatMultiplier).toBe(1);
      expect(result.trend).toBe('stable');
    });
  });

  describe('locale handling', () => {
    it('auto-detects locale', () => {
      const tracker = new FrustrationTracker();

      tracker.analyze("I can't do this anymore");
      const result = tracker.analyze("It's too hard for me");

      expect(result.textAnalysis.detectedLocale).toBe('en');
    });

    it('respects set locale', () => {
      tracker.setLocale('en');

      const result = tracker.analyze("I can't do this");
      expect(result.textAnalysis.frustrationScore).toBeGreaterThan(0.8);
    });
  });
});
