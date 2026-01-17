/**
 * Tests for Profile Generator Utilities
 */

import { describe, it, expect } from 'vitest';
import { getCategoryDisplayName, inferLearningStyle } from '../utils';
import type { MaestroInsightInput } from '../types';
import type { ObservationCategory } from '@/types';

describe('profile-generator-utils', () => {
  describe('getCategoryDisplayName', () => {
    const categoryMappings: Array<[ObservationCategory, string]> = [
      ['logical_reasoning', 'Ragionamento Logico'],
      ['mathematical_intuition', 'Intuizione Matematica'],
      ['critical_thinking', 'Pensiero Critico'],
      ['study_method', 'Metodo di Studio'],
      ['verbal_expression', 'Espressione Verbale'],
      ['linguistic_ability', 'Abilità Linguistiche'],
      ['creativity', 'Creatività'],
      ['artistic_sensitivity', 'Sensibilità Artistica'],
      ['scientific_curiosity', 'Curiosità Scientifica'],
      ['experimental_approach', 'Approccio Sperimentale'],
      ['spatial_memory', 'Memoria Spaziale'],
      ['historical_understanding', 'Comprensione Storica'],
      ['philosophical_depth', 'Profondità Filosofica'],
      ['physical_awareness', 'Consapevolezza Corporea'],
      ['environmental_awareness', 'Consapevolezza Ambientale'],
      ['narrative_skill', 'Abilità Narrative'],
      ['collaborative_spirit', 'Spirito Collaborativo'],
    ];

    it.each(categoryMappings)('maps %s to %s', (category, expected) => {
      expect(getCategoryDisplayName(category)).toBe(expected);
    });

    it('returns category as-is for unknown category', () => {
      expect(getCategoryDisplayName('unknown_category' as ObservationCategory)).toBe('unknown_category');
    });
  });

  describe('inferLearningStyle', () => {
    const createInsight = (
      category: ObservationCategory,
      isStrength = false
    ): MaestroInsightInput => ({
      maestroId: 'test-maestro',
      maestroName: 'Test Maestro',
      category,
      content: 'Test observation',
      isStrength,
      confidence: 0.8,
      createdAt: new Date().toISOString(),
      sessionId: 'test-session',
    });

    it('infers visual channel from visual categories', () => {
      const insights = [
        createInsight('spatial_memory'),
        createInsight('artistic_sensitivity'),
        createInsight('creativity'),
      ];
      const result = inferLearningStyle(insights);
      expect(result.preferredChannel).toBe('visual');
    });

    it('infers auditory channel from auditory categories', () => {
      const insights = [
        createInsight('verbal_expression'),
        createInsight('linguistic_ability'),
        createInsight('narrative_skill'),
      ];
      const result = inferLearningStyle(insights);
      expect(result.preferredChannel).toBe('auditory');
    });

    it('infers kinesthetic channel from kinesthetic categories', () => {
      const insights = [
        createInsight('experimental_approach'),
        createInsight('physical_awareness'),
        createInsight('collaborative_spirit'),
      ];
      const result = inferLearningStyle(insights);
      expect(result.preferredChannel).toBe('kinesthetic');
    });

    it('infers reading_writing channel from reading categories', () => {
      const insights = [
        createInsight('historical_understanding'),
        createInsight('philosophical_depth'),
        createInsight('study_method'),
      ];
      const result = inferLearningStyle(insights);
      expect(result.preferredChannel).toBe('reading_writing');
    });

    it('returns default visual channel for empty insights', () => {
      const result = inferLearningStyle([]);
      expect(result.preferredChannel).toBe('visual');
    });

    it('includes creative expression motivator for creativity strength', () => {
      const insights = [createInsight('creativity', true)];
      const result = inferLearningStyle(insights);
      expect(result.motivators).toContain('Espressione creativa');
    });

    it('includes logical challenges motivator for logical reasoning strength', () => {
      const insights = [createInsight('logical_reasoning', true)];
      const result = inferLearningStyle(insights);
      expect(result.motivators).toContain('Sfide logiche');
    });

    it('includes group work motivator for collaborative spirit strength', () => {
      const insights = [createInsight('collaborative_spirit', true)];
      const result = inferLearningStyle(insights);
      expect(result.motivators).toContain('Lavoro di gruppo');
    });

    it('includes discovery motivator for scientific curiosity strength', () => {
      const insights = [createInsight('scientific_curiosity', true)];
      const result = inferLearningStyle(insights);
      expect(result.motivators).toContain('Scoperte ed esperimenti');
    });

    it('includes default motivators when no strengths match', () => {
      const insights = [createInsight('study_method', false)];
      const result = inferLearningStyle(insights);
      expect(result.motivators).toContain('Apprendimento interattivo');
      expect(result.motivators).toContain('Feedback positivo');
    });

    it('returns fixed session duration of 30 minutes', () => {
      const result = inferLearningStyle([]);
      expect(result.optimalSessionDuration).toBe(30);
    });

    it('returns afternoon as preferred time of day', () => {
      const result = inferLearningStyle([]);
      expect(result.preferredTimeOfDay).toBe('afternoon');
    });

    it('returns step_by_step challenge preference', () => {
      const result = inferLearningStyle([]);
      expect(result.challengePreference).toBe('step_by_step');
    });

    it('determines dominant channel with mixed categories', () => {
      const insights = [
        createInsight('spatial_memory'),
        createInsight('verbal_expression'),
        createInsight('spatial_memory'),
        createInsight('creativity'),
      ];
      const result = inferLearningStyle(insights);
      // 3 visual vs 1 auditory
      expect(result.preferredChannel).toBe('visual');
    });
  });
});
