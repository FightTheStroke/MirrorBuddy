/**
 * Tests for Azure Speech timing analysis
 */

import { describe, it, expect } from 'vitest';
import {
  parseAzureResult,
  detectPauses,
  calculateHesitation,
  analyzeTimings,
  categorizeSpeed,
} from '../azure-timing';
import type { WordTiming } from '../azure-timing';

describe('azure-timing', () => {
  describe('parseAzureResult', () => {
    it('parses Azure NBest format', () => {
      const azureResult = {
        NBest: [
          {
            Words: [
              { Word: 'Hello', Offset: 10000000, Duration: 5000000, Confidence: 0.95 },
              { Word: 'world', Offset: 20000000, Duration: 5000000, Confidence: 0.90 },
            ],
          },
        ],
      };

      const words = parseAzureResult(azureResult);

      expect(words.length).toBe(2);
      expect(words[0].word).toBe('Hello');
      expect(words[0].offset).toBe(1000); // 10000000 / 10000
      expect(words[0].duration).toBe(500);
      expect(words[0].confidence).toBe(0.95);
    });

    it('returns empty array for missing data', () => {
      expect(parseAzureResult({})).toEqual([]);
      expect(parseAzureResult({ NBest: [] })).toEqual([]);
      expect(parseAzureResult({ NBest: [{}] })).toEqual([]);
    });
  });

  describe('detectPauses', () => {
    it('detects pauses between words', () => {
      const words: WordTiming[] = [
        { word: 'Hello', offset: 0, duration: 500, confidence: 0.9 },
        { word: 'world', offset: 2000, duration: 500, confidence: 0.9 }, // 1500ms gap
      ];

      const pauses = detectPauses(words);

      expect(pauses.length).toBe(1);
      expect(pauses[0].duration).toBe(1500);
      expect(pauses[0].type).toBe('long');
    });

    it('categorizes pause types correctly', () => {
      // Thresholds: micro>150, short>300, medium>800, long>1500, sigh>2500
      const words: WordTiming[] = [
        { word: 'a', offset: 0, duration: 100, confidence: 0.9 },
        { word: 'b', offset: 500, duration: 100, confidence: 0.9 }, // 400ms gap - short
        { word: 'c', offset: 1500, duration: 100, confidence: 0.9 }, // 900ms gap - medium
        { word: 'd', offset: 3200, duration: 100, confidence: 0.9 }, // 1600ms gap - long
        { word: 'e', offset: 6000, duration: 100, confidence: 0.9 }, // 2700ms gap - sigh
      ];

      const pauses = detectPauses(words);

      expect(pauses[0].type).toBe('short');
      expect(pauses[1].type).toBe('medium');
      expect(pauses[2].type).toBe('long');
      expect(pauses[3].type).toBe('sigh');
    });

    it('ignores micro pauses', () => {
      const words: WordTiming[] = [
        { word: 'Hello', offset: 0, duration: 500, confidence: 0.9 },
        { word: 'world', offset: 600, duration: 500, confidence: 0.9 }, // 100ms gap
      ];

      const pauses = detectPauses(words);
      expect(pauses.length).toBe(0);
    });
  });

  describe('calculateHesitation', () => {
    it('returns zero hesitation for fluent speech', () => {
      const words: WordTiming[] = Array.from({ length: 10 }, (_, i) => ({
        word: `word${i}`,
        offset: i * 600,
        duration: 500,
        confidence: 0.95,
      }));

      const result = calculateHesitation(words);

      expect(result.hesitationScore).toBeLessThan(0.3);
      expect(result.longPauseCount).toBe(0);
    });

    it('detects hesitation from long pauses', () => {
      const words: WordTiming[] = [
        { word: 'I', offset: 0, duration: 200, confidence: 0.9 },
        { word: 'um', offset: 2000, duration: 300, confidence: 0.6 }, // long pause
        { word: 'think', offset: 4500, duration: 400, confidence: 0.7 }, // long pause
        { word: 'maybe', offset: 7000, duration: 400, confidence: 0.6 }, // long pause
      ];

      const result = calculateHesitation(words);

      expect(result.hesitationScore).toBeGreaterThan(0.4);
      expect(result.longPauseCount).toBeGreaterThan(1);
    });

    it('detects hesitation from low confidence', () => {
      const words: WordTiming[] = Array.from({ length: 10 }, (_, i) => ({
        word: `word${i}`,
        offset: i * 600,
        duration: 500,
        confidence: 0.5, // Low confidence
      }));

      const result = calculateHesitation(words);

      expect(result.avgConfidence).toBe(0.5);
      expect(result.lowConfidenceWords).toBe(10);
      expect(result.hesitationScore).toBeGreaterThan(0.1);
    });

    it('handles empty input', () => {
      const result = calculateHesitation([]);

      expect(result.hesitationScore).toBe(0);
      expect(result.speechRate).toBe(0);
    });
  });

  describe('categorizeSpeed', () => {
    it('categorizes speech rates', () => {
      expect(categorizeSpeed(60)).toBe('very_slow');
      expect(categorizeSpeed(100)).toBe('slow');
      expect(categorizeSpeed(140)).toBe('normal');
      expect(categorizeSpeed(180)).toBe('fast');
      expect(categorizeSpeed(220)).toBe('very_fast');
    });
  });

  describe('analyzeTimings', () => {
    it('provides full analysis', () => {
      const words: WordTiming[] = [
        { word: 'Non', offset: 0, duration: 300, confidence: 0.85 },
        { word: 'capisco', offset: 1800, duration: 500, confidence: 0.7 }, // pause
        { word: 'bene', offset: 3500, duration: 400, confidence: 0.6 }, // pause
      ];

      const result = analyzeTimings(words);

      expect(result.pauses.length).toBeGreaterThan(0);
      expect(result.hesitation.hesitationScore).toBeGreaterThan(0);
      expect(result.speedCategory).toBeDefined();
      expect(result.confidenceIssues).toBe(true);
    });
  });
});
