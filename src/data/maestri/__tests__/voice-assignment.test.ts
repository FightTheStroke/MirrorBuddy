/**
 * Test suite for voice assignment distribution across maestri (T3-09)
 *
 * Verifies:
 * - All maestri have valid voice assignments
 * - No voice ID conflicts (each maestro has exactly one voice)
 * - Voice distribution is balanced (no single voice overwhelms)
 * - All voices are from the valid Azure OpenAI set
 */
import { describe, it, expect } from 'vitest';
import { getAllMaestri } from '../index';

// Azure OpenAI Realtime API available voices (as of Feb 2026)
const VALID_AZURE_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
  'verse',
] as const;

const MAX_VOICE_USAGE_PERCENTAGE = 0.3; // No single voice should be used by more than 30% of maestri

describe('Voice Assignment Verification (T3-09)', () => {
  const maestri = getAllMaestri();

  describe('Basic voice assignment validation', () => {
    it('should have at least 26 maestri defined', () => {
      expect(maestri.length).toBeGreaterThanOrEqual(26);
    });

    it('every maestro should have a voice assigned', () => {
      maestri.forEach((maestro) => {
        expect(maestro.voice).toBeDefined();
        expect(maestro.voice).not.toBe('');
      });
    });

    it('every maestro should have exactly one voice (no undefined)', () => {
      maestri.forEach((maestro) => {
        expect(maestro.voice).toBeTruthy();
        expect(typeof maestro.voice).toBe('string');
      });
    });

    it('all voices should be from the valid Azure OpenAI voice set', () => {
      maestri.forEach((maestro) => {
        expect(VALID_AZURE_VOICES).toContain(maestro.voice as any);
      });
    });
  });

  describe('Voice distribution balance', () => {
    it('should calculate voice distribution correctly', () => {
      const distribution = maestri.reduce(
        (acc, maestro) => {
          const voice = maestro.voice;
          acc[voice] = (acc[voice] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Distribution should not be empty
      expect(Object.keys(distribution).length).toBeGreaterThan(0);

      // At least 50% of available voices should be used
      const voicesUsed = Object.keys(distribution).length;
      const voicesAvailable = VALID_AZURE_VOICES.length;
      expect(voicesUsed / voicesAvailable).toBeGreaterThanOrEqual(0.5);
    });

    it('no single voice should be used by more than 30% of maestri', () => {
      const distribution = maestri.reduce(
        (acc, maestro) => {
          const voice = maestro.voice;
          acc[voice] = (acc[voice] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const totalMaestri = maestri.length;

      Object.entries(distribution).forEach(([_voice, count]) => {
        const percentage = count / totalMaestri;
        expect(percentage).toBeLessThanOrEqual(MAX_VOICE_USAGE_PERCENTAGE);
      });
    });

    it('should use at least 8 different voices across all maestri', () => {
      const uniqueVoices = new Set(maestri.map((m) => m.voice));
      expect(uniqueVoices.size).toBeGreaterThanOrEqual(8);
    });

    it('should not have more than 5 maestri assigned to the same voice', () => {
      const distribution = maestri.reduce(
        (acc, maestro) => {
          const voice = maestro.voice;
          acc[voice] = (acc[voice] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      Object.entries(distribution).forEach(([_voice, count]) => {
        expect(count).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Voice ID conflict detection', () => {
    it('should not have duplicate maestro IDs', () => {
      const ids = maestri.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('each maestro should have a unique combination of id + voice', () => {
      const combinations = maestri.map((m) => `${m.id}:${m.voice}`);
      const uniqueCombinations = new Set(combinations);
      // Since each maestro has one voice, this should equal maestri count
      expect(uniqueCombinations.size).toBe(maestri.length);
    });
  });

  describe('Voice instruction validation', () => {
    it('every maestro should have voiceInstructions defined', () => {
      maestri.forEach((maestro) => {
        expect(maestro.voiceInstructions).toBeDefined();
        expect(typeof maestro.voiceInstructions).toBe('string');
        expect(maestro.voiceInstructions.length).toBeGreaterThan(20);
      });
    });

    it('voice instructions should not contain deprecated voice references', () => {
      maestri.forEach((maestro) => {
        // Check that voice instructions don't reference old voice names
        expect(maestro.voiceInstructions).not.toContain('gpt-4o-realtime-preview');
      });
    });
  });

  describe('Deployment mapping integration', () => {
    it('should have voice property that matches session config expectations', () => {
      maestri.forEach((maestro) => {
        // Voice should be a simple string, not a complex object
        expect(typeof maestro.voice).toBe('string');
        // Should not have any special characters
        expect(maestro.voice).toMatch(/^[a-z]+$/);
      });
    });
  });
});
