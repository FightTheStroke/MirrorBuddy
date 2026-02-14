/**
 * @file bias-detector.test.ts
 * @brief Tests for bias detection module (EU AI Act Art. 10 compliance)
 */

import { describe, it, expect } from 'vitest';
import { detectBias, isSafeFromBias, getBiasCategories } from './bias-detector';

describe('BiasDetector', () => {
  describe('detectBias', () => {
    it('returns clean result for neutral text', () => {
      const result = detectBias('La matematica è una materia affascinante.');
      expect(result.hasBias).toBe(false);
      expect(result.riskScore).toBe(0);
      expect(result.detections).toHaveLength(0);
      expect(result.safeForEducation).toBe(true);
    });

    it('handles empty input', () => {
      const result = detectBias('');
      expect(result.hasBias).toBe(false);
      expect(result.analyzedLength).toBe(0);
    });

    // --- Gender bias ---
    it('detects Italian gender bias', () => {
      const result = detectBias('Le donne non possono fare matematica.');
      expect(result.hasBias).toBe(true);
      expect(result.detections[0].category).toBe('gender');
      expect(result.detections[0].severity).toBe('high');
      expect(result.safeForEducation).toBe(false);
    });

    it('detects English gender bias', () => {
      const result = detectBias("Girls can't understand physics.");
      expect(result.hasBias).toBe(true);
      expect(result.detections[0].category).toBe('gender');
    });

    it('detects naturalistic gender stereotypes', () => {
      const result = detectBias('Boys are naturally better at math.');
      expect(result.hasBias).toBe(true);
      expect(result.detections[0].category).toBe('gender');
    });

    // --- Racial/ethnic bias ---
    it('detects racial hierarchy language (IT)', () => {
      const result = detectBias('Le razze superiori hanno dominato.');
      expect(result.hasBias).toBe(true);
      expect(result.detections[0].category).toBe('racial_ethnic');
      expect(result.detections[0].severity).toBe('critical');
    });

    // --- Disability bias ---
    it('detects ableist slurs (IT)', () => {
      const result = detectBias('Quello studente è un ritardato.');
      expect(result.hasBias).toBe(true);
      expect(result.detections[0].category).toBe('disability');
      expect(result.detections[0].severity).toBe('critical');
    });

    it('detects negative disability framing (EN)', () => {
      const result = detectBias('He is suffering from dyslexia.');
      expect(result.hasBias).toBe(true);
      expect(result.detections[0].category).toBe('disability');
      expect(result.detections[0].suggestion).toContain('neutral');
    });

    // --- Educational ability bias ---
    it('detects intellectual insults (IT)', () => {
      const result = detectBias('Sei stupido, non capisci niente.');
      expect(result.hasBias).toBe(true);
      expect(result.detections[0].category).toBe('educational_ability');
      expect(result.detections[0].severity).toBe('critical');
    });

    it('detects difficulty minimization', () => {
      const result = detectBias('Questo è facile, tutti lo sanno.');
      expect(result.hasBias).toBe(true);
      const categories = result.detections.map((d) => d.category);
      expect(categories).toContain('educational_ability');
    });

    // --- Socioeconomic bias ---
    it('detects socioeconomic stereotyping (IT)', () => {
      const result = detectBias('I poveri non possono studiare.');
      expect(result.hasBias).toBe(true);
      expect(result.detections[0].category).toBe('socioeconomic');
    });

    // --- Cultural bias ---
    it('detects cultural hierarchy language (IT)', () => {
      const result = detectBias('Quei popoli primitivi non avevano cultura.');
      expect(result.hasBias).toBe(true);
      expect(result.detections[0].category).toBe('cultural');
      expect(result.detections[0].severity).toBe('critical');
    });

    // --- Multiple biases ---
    it('detects multiple bias categories in same text', () => {
      const text = 'Le donne non sanno fare matematica e i poveri non possono studiare.';
      const result = detectBias(text);
      expect(result.detections.length).toBeGreaterThanOrEqual(2);
      const categories = new Set(result.detections.map((d) => d.category));
      expect(categories.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('risk scoring', () => {
    it('scores critical bias higher than low', () => {
      const critical = detectBias('Sei stupido e incapace.');
      const low = detectBias('Questo è facile da capire.');
      expect(critical.riskScore).toBeGreaterThan(low.riskScore);
    });

    it('caps risk score at 100', () => {
      const extreme =
        'Le donne non possono, gli uomini non sanno, ' +
        'sei stupido, razze inferiori, popoli primitivi, ' +
        'i poveri non possono, sei scemo e incapace.';
      const result = detectBias(extreme);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('isSafeFromBias', () => {
    it('returns true for neutral educational content', () => {
      expect(isSafeFromBias('Il teorema di Pitagora afferma che...')).toBe(true);
    });

    it('returns false for biased content', () => {
      expect(isSafeFromBias('Le ragazze non capiscono la fisica.')).toBe(false);
    });
  });

  describe('getBiasCategories', () => {
    it('returns empty array for clean text', () => {
      expect(getBiasCategories('Impariamo insieme.')).toEqual([]);
    });

    it('returns detected categories', () => {
      const cats = getBiasCategories('Le donne non possono studiare.');
      expect(cats).toContain('gender');
    });
  });

  describe('educational context safety', () => {
    it('allows legitimate historical discussion', () => {
      const text = 'Nel periodo storico della schiavitù, le condizioni erano disumane.';
      const result = detectBias(text);
      expect(result.safeForEducation).toBe(true);
    });

    it('allows discussion of accessibility needs', () => {
      const text = 'Gli studenti con dislessia possono utilizzare strumenti compensativi.';
      const result = detectBias(text);
      expect(result.safeForEducation).toBe(true);
    });

    it('allows growth mindset language', () => {
      const text = 'Non hai ancora capito, ma con la pratica migliorerai.';
      const result = detectBias(text);
      expect(result.safeForEducation).toBe(true);
    });
  });
});
