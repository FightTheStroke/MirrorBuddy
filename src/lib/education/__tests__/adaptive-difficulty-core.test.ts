/**
 * Unit tests for Adaptive Difficulty Core functions
 */

import { describe, it, expect } from 'vitest';
import {
  isAdaptiveDifficultyMode,
  normalizeAdaptiveDifficultyMode,
  clamp,
  roundToHalf,
  ema,
  calculateAdaptiveContext,
  buildAdaptiveInstruction,
} from '../adaptive-difficulty-core';
import type { AdaptiveProfile } from '@/types';

describe('adaptive-difficulty-core', () => {
  describe('isAdaptiveDifficultyMode', () => {
    it('returns true for valid modes', () => {
      expect(isAdaptiveDifficultyMode('manual')).toBe(true);
      expect(isAdaptiveDifficultyMode('guided')).toBe(true);
      expect(isAdaptiveDifficultyMode('balanced')).toBe(true);
      expect(isAdaptiveDifficultyMode('automatic')).toBe(true);
    });

    it('returns false for invalid modes', () => {
      expect(isAdaptiveDifficultyMode('invalid')).toBe(false);
      expect(isAdaptiveDifficultyMode(null)).toBe(false);
      expect(isAdaptiveDifficultyMode(undefined)).toBe(false);
      expect(isAdaptiveDifficultyMode('')).toBe(false);
    });
  });

  describe('normalizeAdaptiveDifficultyMode', () => {
    it('returns the mode if valid', () => {
      expect(normalizeAdaptiveDifficultyMode('manual')).toBe('manual');
      expect(normalizeAdaptiveDifficultyMode('automatic')).toBe('automatic');
    });

    it('returns fallback for invalid modes', () => {
      expect(normalizeAdaptiveDifficultyMode('invalid')).toBe('balanced');
      expect(normalizeAdaptiveDifficultyMode(null)).toBe('balanced');
      expect(normalizeAdaptiveDifficultyMode(undefined, 'guided')).toBe('guided');
    });
  });

  describe('clamp', () => {
    it('clamps values within range', () => {
      expect(clamp(5, 1, 10)).toBe(5);
      expect(clamp(0, 1, 10)).toBe(1);
      expect(clamp(15, 1, 10)).toBe(10);
      expect(clamp(-5, 0, 1)).toBe(0);
    });
  });

  describe('roundToHalf', () => {
    it('rounds to nearest 0.5', () => {
      expect(roundToHalf(2.3)).toBe(2.5);
      expect(roundToHalf(2.1)).toBe(2);
      expect(roundToHalf(2.75)).toBe(3);
      expect(roundToHalf(2.25)).toBe(2.5);
    });
  });

  describe('ema', () => {
    it('calculates exponential moving average correctly', () => {
      expect(ema(0, 1, 0.5)).toBe(0.5);
      expect(ema(0.5, 1, 0.5)).toBe(0.75);
      expect(ema(10, 20, 0.1)).toBe(11);
    });
  });

  describe('calculateAdaptiveContext', () => {
    const createProfile = (overrides: Partial<AdaptiveProfile> = {}): AdaptiveProfile => ({
      global: {
        frustration: 0,
        repeatRate: 0,
        questionRate: 0,
        averageResponseMs: 12000,
        lastUpdatedAt: new Date().toISOString(),
      },
      subjects: {},
      updatedAt: new Date().toISOString(),
      ...overrides,
    });

    it('returns baseline difficulty when no signals', () => {
      const profile = createProfile();
      const context = calculateAdaptiveContext(profile, {
        mode: 'balanced',
        baselineDifficulty: 3,
      });

      expect(context.targetDifficulty).toBe(3);
      expect(context.apply).toBe(true);
    });

    it('reduces difficulty on high frustration', () => {
      const profile = createProfile({
        global: {
          frustration: 0.8,
          repeatRate: 0,
          questionRate: 0,
          averageResponseMs: 12000,
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      const context = calculateAdaptiveContext(profile, {
        mode: 'balanced',
        baselineDifficulty: 3,
      });

      expect(context.targetDifficulty).toBeLessThan(3);
      expect(context.reason).toContain('prerequisiti');
    });

    it('increases difficulty on high question rate with low frustration', () => {
      const profile = createProfile({
        global: {
          frustration: 0.1,
          repeatRate: 0,
          questionRate: 0.8,
          averageResponseMs: 12000,
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      const context = calculateAdaptiveContext(profile, {
        mode: 'balanced',
        baselineDifficulty: 3,
      });

      expect(context.targetDifficulty).toBeGreaterThan(3);
      expect(context.reason).toContain('sfida');
    });

    it('respects mode limits', () => {
      const profile = createProfile({
        global: {
          frustration: 0.9,
          repeatRate: 0.9,
          questionRate: 0,
          averageResponseMs: 25000,
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      const manualContext = calculateAdaptiveContext(profile, {
        mode: 'manual',
        baselineDifficulty: 3,
      });

      const automaticContext = calculateAdaptiveContext(profile, {
        mode: 'automatic',
        baselineDifficulty: 3,
      });

      // Manual mode should not apply adjustments
      expect(manualContext.targetDifficulty).toBe(3);
      expect(manualContext.apply).toBe(false);

      // Automatic mode should apply full adjustments
      expect(automaticContext.targetDifficulty).toBeLessThan(3);
    });

    it('respects mastery-based constraints', () => {
      const lowMasteryProfile = createProfile({
        subjects: {
          math: {
            mastery: 30,
            targetDifficulty: 3,
            lastUpdatedAt: new Date().toISOString(),
          },
        },
      });

      const context = calculateAdaptiveContext(lowMasteryProfile, {
        mode: 'automatic',
        subject: 'math',
        baselineDifficulty: 5,
      });

      // Should cap at maxDifficulty for low mastery
      expect(context.targetDifficulty).toBeLessThanOrEqual(2.5);
      expect(context.constraints.maxDifficulty).toBe(2.5);
    });

    it('limits downward adjustment in pragmatic mode', () => {
      const frustratedProfile = createProfile({
        global: {
          frustration: 0.9,
          repeatRate: 0.9,
          questionRate: 0,
          averageResponseMs: 25000,
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      const normalContext = calculateAdaptiveContext(frustratedProfile, {
        mode: 'automatic',
        baselineDifficulty: 3,
        pragmatic: false,
      });

      const pragmaticContext = calculateAdaptiveContext(frustratedProfile, {
        mode: 'automatic',
        baselineDifficulty: 3,
        pragmatic: true,
      });

      // Pragmatic mode should have smaller reduction
      expect(pragmaticContext.targetDifficulty).toBeGreaterThanOrEqual(
        normalContext.targetDifficulty
      );
    });
  });

  describe('buildAdaptiveInstruction', () => {
    it('generates instruction with correct mode label', () => {
      const context = {
        mode: 'balanced' as const,
        baselineDifficulty: 3,
        targetDifficulty: 2.5,
        apply: true,
        reason: 'Test reason',
        pragmatic: false,
        constraints: { minDifficulty: 2, maxDifficulty: 4 },
      };

      const instruction = buildAdaptiveInstruction(context);

      expect(instruction).toContain('Bilanciata');
      expect(instruction).toContain('2.5/5');
      expect(instruction).toContain('Applica direttamente');
    });

    it('generates suggestion prompt for manual mode', () => {
      const context = {
        mode: 'manual' as const,
        baselineDifficulty: 3,
        targetDifficulty: 3,
        apply: false,
        reason: 'Test reason',
        pragmatic: false,
        constraints: { minDifficulty: 2, maxDifficulty: 4 },
      };

      const instruction = buildAdaptiveInstruction(context);

      expect(instruction).toContain('Manuale');
      expect(instruction).toContain('Suggerisci gli aggiustamenti');
      expect(instruction).toContain('chiedi conferma');
    });

    it('includes pragmatic line when pragmatic mode', () => {
      const context = {
        mode: 'balanced' as const,
        baselineDifficulty: 3,
        targetDifficulty: 2.5,
        apply: true,
        reason: 'Test reason',
        pragmatic: true,
        constraints: { minDifficulty: 2, maxDifficulty: 4 },
      };

      const instruction = buildAdaptiveInstruction(context);

      expect(instruction).toContain('pragmatica');
    });
  });
});
