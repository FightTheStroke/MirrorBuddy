import { describe, it, expect } from 'vitest';
import { containsCrisisKeywords, CRISIS_RESPONSE } from './crisis-detection';

describe('crisis-detection', () => {
  describe('containsCrisisKeywords', () => {
    // --- Italian ---
    it('detects "non voglio più vivere" (with insertion)', () => {
      expect(containsCrisisKeywords('Non voglio più vivere, non ce la faccio più.')).toBe(true);
    });

    it('detects "mi faccio del male"', () => {
      expect(containsCrisisKeywords('Mi faccio del male ogni giorno e nessuno lo sa.')).toBe(true);
    });

    it('detects "voglio morire"', () => {
      expect(containsCrisisKeywords('Voglio morire')).toBe(true);
    });

    it('detects "voglio farla finita"', () => {
      expect(containsCrisisKeywords('Voglio farla finita con tutto')).toBe(true);
    });

    it('detects "voglio sparire"', () => {
      expect(containsCrisisKeywords('Voglio sparire da tutto')).toBe(true);
    });

    it('does NOT flag normal sadness (IT)', () => {
      expect(
        containsCrisisKeywords("Oggi sono un po' triste perché ho preso un brutto voto."),
      ).toBe(false);
    });

    // --- English ---
    it('detects "I want to die" (EN)', () => {
      expect(containsCrisisKeywords('I want to die')).toBe(true);
    });

    it('detects "don\'t want to live anymore" (EN)', () => {
      expect(containsCrisisKeywords("I don't want to live anymore")).toBe(true);
    });

    it('detects "hurting myself" (EN)', () => {
      expect(containsCrisisKeywords('I keep hurting myself')).toBe(true);
    });

    it('does NOT flag normal sadness (EN)', () => {
      expect(containsCrisisKeywords('I am sad because I failed the test.')).toBe(false);
    });

    // --- French ---
    it('detects "je veux mourir" (FR)', () => {
      expect(containsCrisisKeywords('Je veux mourir')).toBe(true);
    });

    it('detects "me faire du mal" (FR)', () => {
      expect(containsCrisisKeywords('Je veux me faire du mal')).toBe(true);
    });

    // --- German ---
    it('detects "ich will sterben" (DE)', () => {
      expect(containsCrisisKeywords('Ich will sterben')).toBe(true);
    });

    it('detects "will nicht mehr leben" (DE)', () => {
      expect(containsCrisisKeywords('Ich will nicht mehr leben')).toBe(true);
    });

    // --- Spanish ---
    it('detects "quiero morir" (ES)', () => {
      expect(containsCrisisKeywords('Quiero morir')).toBe(true);
    });

    it('detects "no quiero vivir" (ES)', () => {
      expect(containsCrisisKeywords('No quiero vivir más')).toBe(true);
    });

    it('detects "hacerme daño" (ES)', () => {
      expect(containsCrisisKeywords('Quiero hacerme daño')).toBe(true);
    });
  });

  describe('CRISIS_RESPONSE', () => {
    it('contains helpline numbers', () => {
      expect(CRISIS_RESPONSE).toContain('19696');
      expect(CRISIS_RESPONSE).toContain('02 2327 2327');
    });
  });
});
