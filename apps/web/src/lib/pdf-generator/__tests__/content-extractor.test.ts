/**
 * Tests for Content Extractor Utility
 * @module pdf-generator/utils/content-extractor
 */

import { describe, it, expect } from 'vitest';
import { estimateReadingTime } from '../utils/content-extractor-parsers';

describe('Content Extractor Utils', () => {
  describe('estimateReadingTime', () => {
    it('should calculate reading time for dyslexia profile (120 wpm)', () => {
      const wordCount = 240;
      const readingTime = estimateReadingTime(wordCount, 'dyslexia');
      expect(readingTime).toBe(2); // 240 / 120 = 2 minutes
    });

    it('should calculate reading time for dyscalculia profile (180 wpm)', () => {
      const wordCount = 360;
      const readingTime = estimateReadingTime(wordCount, 'dyscalculia');
      expect(readingTime).toBe(2); // 360 / 180 = 2 minutes
    });

    it('should calculate reading time for dysgraphia profile (180 wpm)', () => {
      const wordCount = 360;
      const readingTime = estimateReadingTime(wordCount, 'dysgraphia');
      expect(readingTime).toBe(2); // 360 / 180 = 2 minutes
    });

    it('should calculate reading time for dysorthography profile (150 wpm)', () => {
      const wordCount = 300;
      const readingTime = estimateReadingTime(wordCount, 'dysorthography');
      expect(readingTime).toBe(2); // 300 / 150 = 2 minutes
    });

    it('should calculate reading time for adhd profile (150 wpm)', () => {
      const wordCount = 300;
      const readingTime = estimateReadingTime(wordCount, 'adhd');
      expect(readingTime).toBe(2); // 300 / 150 = 2 minutes
    });

    it('should calculate reading time for dyspraxia profile (140 wpm)', () => {
      const wordCount = 280;
      const readingTime = estimateReadingTime(wordCount, 'dyspraxia');
      expect(readingTime).toBe(2); // 280 / 140 = 2 minutes
    });

    it('should calculate reading time for stuttering profile (100 wpm)', () => {
      const wordCount = 200;
      const readingTime = estimateReadingTime(wordCount, 'stuttering');
      expect(readingTime).toBe(2); // 200 / 100 = 2 minutes
    });

    it('should use default 180 wpm for unknown profile', () => {
      const wordCount = 360;
      const readingTime = estimateReadingTime(wordCount, 'unknown');
      expect(readingTime).toBe(2); // 360 / 180 = 2 minutes
    });

    it('should round up reading time', () => {
      const wordCount = 121;
      const readingTime = estimateReadingTime(wordCount, 'dyslexia');
      expect(readingTime).toBe(2); // Math.ceil(121 / 120) = 2
    });

    it('should handle zero words', () => {
      const readingTime = estimateReadingTime(0, 'dyslexia');
      expect(readingTime).toBe(0);
    });

    it('should handle small word counts', () => {
      const readingTime = estimateReadingTime(1, 'dyslexia');
      expect(readingTime).toBe(1); // Math.ceil(1 / 120) = 1
    });

    it('should handle large word counts', () => {
      const wordCount = 10000;
      const readingTime = estimateReadingTime(wordCount, 'stuttering');
      expect(readingTime).toBe(100); // 10000 / 100 = 100 minutes
    });

    describe('Reading speed comparison', () => {
      const wordCount = 1000;

      it('dyslexia should have slowest reading time for regular text', () => {
        const dyslexiaTime = estimateReadingTime(wordCount, 'dyslexia');
        const dysgraphiaTime = estimateReadingTime(wordCount, 'dysgraphia');
        expect(dyslexiaTime).toBeGreaterThan(dysgraphiaTime);
      });

      it('stuttering should have slowest reading time overall (for reading aloud)', () => {
        const stutteringTime = estimateReadingTime(wordCount, 'stuttering');
        const dyslexiaTime = estimateReadingTime(wordCount, 'dyslexia');
        expect(stutteringTime).toBeGreaterThan(dyslexiaTime);
      });

      it('dyscalculia and dysgraphia should have same reading time', () => {
        const dyscalculiaTime = estimateReadingTime(wordCount, 'dyscalculia');
        const dysgraphiaTime = estimateReadingTime(wordCount, 'dysgraphia');
        expect(dyscalculiaTime).toBe(dysgraphiaTime);
      });
    });
  });
});
