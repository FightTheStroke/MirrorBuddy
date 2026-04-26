/**
 * Tests for unified frustration classifier
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FrustrationClassifier, createClassifier } from '../classifier';
import type { WordTiming } from '../azure-timing';

describe('FrustrationClassifier', () => {
  let classifier: FrustrationClassifier;

  beforeEach(() => {
    classifier = createClassifier({ locale: 'it' });
  });

  describe('classify - text only', () => {
    it('classifies frustrated text', () => {
      const result = classifier.classify({
        text: 'Non ce la faccio più, è troppo difficile!',
      });

      expect(result.frustrationScore).toBeGreaterThan(0.6);
      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).not.toBe('none');
    });

    it('classifies neutral text', () => {
      const result = classifier.classify({
        text: 'La capitale della Francia è Parigi',
      });

      expect(result.frustrationScore).toBeLessThan(0.3);
      expect(result.shouldIntervene).toBe(false);
      expect(result.interventionType).toBe('none');
    });

    it('provides text analysis in raw results', () => {
      const result = classifier.classify({
        text: 'Non capisco questo esercizio',
      });

      expect(result.rawResults.text).toBeDefined();
      expect(result.rawResults.text?.textAnalysis).toBeDefined();
    });
  });

  describe('classify - with word timings', () => {
    it('incorporates hesitation from timings', () => {
      const wordTimings: WordTiming[] = [
        { word: 'Non', offset: 0, duration: 300, confidence: 0.7 },
        { word: 'capisco', offset: 2000, duration: 500, confidence: 0.5 }, // Long pause
        { word: 'questo', offset: 4500, duration: 400, confidence: 0.6 }, // Long pause
      ];

      const result = classifier.classify({
        text: 'Non capisco questo',
        wordTimings,
      });

      expect(result.breakdown.hesitation).toBeGreaterThan(0);
      expect(result.rawResults.timing).toBeDefined();
    });

    it('increases confidence with timing data', () => {
      const textOnly = classifier.classify({
        text: 'Non capisco',
      });

      // Need more than 3 words for timing confidence boost
      const withTimings = classifier.classify({
        text: 'Non capisco questo esercizio',
        wordTimings: [
          { word: 'Non', offset: 0, duration: 200, confidence: 0.9 },
          { word: 'capisco', offset: 300, duration: 300, confidence: 0.9 },
          { word: 'questo', offset: 700, duration: 300, confidence: 0.9 },
          { word: 'esercizio', offset: 1100, duration: 400, confidence: 0.9 },
        ],
      });

      expect(withTimings.confidence).toBeGreaterThan(textOnly.confidence);
    });
  });

  describe('classify - with audio', () => {
    it('incorporates prosody analysis', () => {
      const sampleRate = 16000;
      const audioSamples = new Float32Array(sampleRate * 0.5);

      // Generate some audio
      for (let i = 0; i < audioSamples.length; i++) {
        audioSamples[i] = 0.1 * Math.sin((2 * Math.PI * 200 * i) / sampleRate);
      }

      const result = classifier.classify({
        text: 'Test',
        audioSamples,
        sampleRate,
      });

      expect(result.rawResults.prosody).toBeDefined();
      expect(result.breakdown.prosody).toBeDefined();
    });
  });

  describe('intervention determination', () => {
    it('suggests help for explicit frustration', () => {
      const result = classifier.classify({
        text: 'Odio la matematica, non ci riesco mai!',
      });

      expect(result.shouldIntervene).toBe(true);
      expect(result.interventionType).toBe('help');
    });

    it('suggests simplify for confusion', () => {
      const result = classifier.classify({
        text: 'Non ho capito, puoi spiegare ancora?',
      });

      if (result.shouldIntervene) {
        expect(['simplify', 'encourage']).toContain(result.interventionType);
      }
    });

    it('provides reason for intervention', () => {
      const result = classifier.classify({
        text: 'Non ce la faccio più!',
      });

      expect(result.reason).toBeTruthy();
      expect(result.reason.length).toBeGreaterThan(0);
    });
  });

  describe('trend tracking', () => {
    it('tracks frustration trend', () => {
      // Neutral interactions
      classifier.classify({ text: 'Okay' });
      classifier.classify({ text: 'Hmm' });

      // Frustrated interactions
      classifier.classify({ text: 'Non capisco' });
      classifier.classify({ text: 'È difficile' });
      classifier.classify({ text: 'Non ce la faccio' });

      const trend = classifier.getTrend();
      expect(trend).toBe('declining');
    });

    it('resets trend on reset', () => {
      classifier.classify({ text: 'Non ce la faccio' });
      classifier.classify({ text: 'È troppo difficile' });
      classifier.classify({ text: 'Odio tutto' });

      classifier.reset();

      const trend = classifier.getTrend();
      expect(trend).toBe('stable');
    });
  });

  describe('locale handling', () => {
    it('works with English', () => {
      classifier.setLocale('en');

      const result = classifier.classify({
        text: "I can't do this anymore, it's too hard!",
      });

      expect(result.frustrationScore).toBeGreaterThan(0.6);
    });

    it('works with Spanish', () => {
      classifier.setLocale('es');

      const result = classifier.classify({
        text: 'No puedo más, es muy difícil!',
      });

      expect(result.frustrationScore).toBeGreaterThan(0.6);
    });
  });

  describe('createClassifier factory', () => {
    it('creates classifier with config', () => {
      const custom = createClassifier({
        locale: 'en',
        interventionThreshold: 0.8,
        textWeight: 0.5,
      });

      expect(custom).toBeInstanceOf(FrustrationClassifier);

      // High threshold means less intervention
      const result = custom.classify({
        text: "I don't understand",
      });

      // With threshold 0.8, moderate frustration shouldn't trigger
      expect(result.shouldIntervene).toBe(false);
    });
  });
});
