/**
 * Tests for profile-generator.ts
 * Issue #69: Increase unit test coverage
 *
 * @vitest-environment node
 * @module profile/__tests__/profile-generator.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateStudentProfile,
  createSynthesisContext,
  formatSynthesisPrompt,
  MELISSA_SYNTHESIS_PROMPT,
  type MaestroInsightInput,
  type ProfileGenerationOptions,
} from '../profile-generator';
import type { ObservationCategory } from '@/types';

// Helper to create mock insight
function createMockInsight(overrides: Partial<MaestroInsightInput> = {}): MaestroInsightInput {
  return {
    maestroId: 'archimede',
    maestroName: 'Archimede',
    category: 'logical_reasoning' as ObservationCategory,
    content: 'Dimostra buona capacità di ragionamento',
    isStrength: true,
    confidence: 0.8,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('profile-generator', () => {
  // ============================================================================
  // generateStudentProfile
  // ============================================================================
  describe('generateStudentProfile', () => {
    const defaultSessionStats = {
      totalSessions: 10,
      totalMinutes: 300,
      maestriInteracted: ['archimede', 'darwin'],
    };

    it('should generate a profile with basic student info', () => {
      const profile = generateStudentProfile(
        'student-1',
        'Mario',
        [],
        defaultSessionStats
      );

      expect(profile.studentId).toBe('student-1');
      expect(profile.studentName).toBe('Mario');
      expect(profile.totalSessions).toBe(10);
      expect(profile.totalMinutes).toBe(300);
      expect(profile.maestriInteracted).toEqual(['archimede', 'darwin']);
    });

    it('should separate strengths and growth areas', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({ isStrength: true, content: 'Eccelle nel ragionamento' }),
        createMockInsight({ isStrength: false, content: 'Difficoltà con le frazioni' }),
        createMockInsight({ isStrength: true, content: 'Curioso e motivato' }),
      ];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);

      expect(profile.strengths).toHaveLength(2);
      expect(profile.growthAreas).toHaveLength(1);
    });

    it('should filter insights below confidence threshold', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({ confidence: 0.9, content: 'High confidence' }),
        createMockInsight({ confidence: 0.5, content: 'Low confidence' }),
        createMockInsight({ confidence: 0.7, content: 'Medium confidence' }),
      ];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats, {
        minConfidence: 0.6,
      });

      // Only insights with confidence >= 0.6 should be included
      const allObservations = [...profile.strengths, ...profile.growthAreas];
      expect(allObservations.every((o) => o.confidence >= 0.6)).toBe(true);
    });

    it('should limit insights to maxInsights option', () => {
      const insights: MaestroInsightInput[] = [];
      for (let i = 0; i < 20; i++) {
        insights.push(createMockInsight({ content: `Insight ${i}` }));
      }

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats, {
        maxInsights: 5,
      });

      const allObservations = [...profile.strengths, ...profile.growthAreas];
      expect(allObservations.length).toBeLessThanOrEqual(5);
    });

    it('should generate learning strategies for growth areas', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({ isStrength: false, category: 'logical_reasoning' as ObservationCategory }),
        createMockInsight({ isStrength: false, category: 'study_method' as ObservationCategory }),
      ];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);

      expect(profile.strategies.length).toBeGreaterThan(0);
      profile.strategies.forEach((strategy) => {
        expect(strategy.id).toMatch(/^strat_/);
        expect(strategy.title).toBeTruthy();
        expect(strategy.description).toBeTruthy();
      });
    });

    it('should infer learning style from observations', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({ category: 'spatial_memory' as ObservationCategory }),
        createMockInsight({ category: 'artistic_sensitivity' as ObservationCategory }),
        createMockInsight({ category: 'creativity' as ObservationCategory }),
      ];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);

      expect(profile.learningStyle).toBeDefined();
      expect(profile.learningStyle.preferredChannel).toBe('visual');
    });

    it('should include lastUpdated timestamp', () => {
      const beforeTest = new Date();
      const profile = generateStudentProfile('s1', 'Mario', [], defaultSessionStats);
      const afterTest = new Date();

      expect(profile.lastUpdated.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(profile.lastUpdated.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });

    it('should handle empty insights array', () => {
      const profile = generateStudentProfile('s1', 'Mario', [], defaultSessionStats);

      expect(profile.strengths).toHaveLength(0);
      expect(profile.growthAreas).toHaveLength(0);
      expect(profile.strategies).toHaveLength(0);
    });

    it('should convert insights to MaestroObservation format', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({
          maestroId: 'darwin',
          maestroName: 'Darwin',
          content: 'Ottima osservazione naturalistica',
          sessionId: 'session-123',
        }),
      ];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);

      expect(profile.strengths[0]).toMatchObject({
        maestroId: 'darwin',
        maestroName: 'Darwin',
        observation: 'Ottima osservazione naturalistica',
        sessionId: 'session-123',
      });
      expect(profile.strengths[0].id).toMatch(/^obs_/);
    });
  });

  // ============================================================================
  // Learning Style Inference
  // ============================================================================
  describe('Learning Style Inference', () => {
    const defaultSessionStats = {
      totalSessions: 5,
      totalMinutes: 150,
      maestriInteracted: [],
    };

    it('should infer visual learning style', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({ category: 'spatial_memory' as ObservationCategory }),
        createMockInsight({ category: 'artistic_sensitivity' as ObservationCategory }),
      ];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);
      expect(profile.learningStyle.preferredChannel).toBe('visual');
    });

    it('should infer auditory learning style', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({ category: 'verbal_expression' as ObservationCategory }),
        createMockInsight({ category: 'linguistic_ability' as ObservationCategory }),
        createMockInsight({ category: 'narrative_skill' as ObservationCategory }),
      ];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);
      expect(profile.learningStyle.preferredChannel).toBe('auditory');
    });

    it('should infer kinesthetic learning style', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({ category: 'experimental_approach' as ObservationCategory }),
        createMockInsight({ category: 'physical_awareness' as ObservationCategory }),
        createMockInsight({ category: 'collaborative_spirit' as ObservationCategory }),
      ];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);
      expect(profile.learningStyle.preferredChannel).toBe('kinesthetic');
    });

    it('should infer reading/writing learning style', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({ category: 'historical_understanding' as ObservationCategory }),
        createMockInsight({ category: 'philosophical_depth' as ObservationCategory }),
        createMockInsight({ category: 'study_method' as ObservationCategory }),
      ];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);
      expect(profile.learningStyle.preferredChannel).toBe('reading_writing');
    });

    it('should include motivators based on strengths', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({ category: 'creativity' as ObservationCategory, isStrength: true }),
        createMockInsight({ category: 'logical_reasoning' as ObservationCategory, isStrength: true }),
      ];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);

      expect(profile.learningStyle.motivators).toContain('Espressione creativa');
      expect(profile.learningStyle.motivators).toContain('Sfide logiche');
    });

    it('should default motivators when no strengths match', () => {
      const insights: MaestroInsightInput[] = [];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);

      expect(profile.learningStyle.motivators).toContain('Apprendimento interattivo');
      expect(profile.learningStyle.motivators).toContain('Feedback positivo');
    });
  });

  // ============================================================================
  // Strategy Generation
  // ============================================================================
  describe('Strategy Generation', () => {
    const defaultSessionStats = {
      totalSessions: 5,
      totalMinutes: 150,
      maestriInteracted: [],
    };

    it('should generate strategies for growth areas', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({
          category: 'logical_reasoning' as ObservationCategory,
          isStrength: false,
          maestroId: 'archimede'
        }),
      ];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);

      expect(profile.strategies.length).toBeGreaterThan(0);
      const strategy = profile.strategies[0];
      expect(strategy.title).toBe('Ragionamento Logico');
      expect(strategy.forAreas).toContain('logical_reasoning');
    });

    it('should include suggestedBy maestri IDs', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({
          category: 'study_method' as ObservationCategory,
          isStrength: false,
          maestroId: 'melissa'
        }),
        createMockInsight({
          category: 'study_method' as ObservationCategory,
          isStrength: false,
          maestroId: 'davide'
        }),
      ];

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);

      const studyStrategy = profile.strategies.find(s => s.forAreas.includes('study_method'));
      if (studyStrategy) {
        expect(studyStrategy.suggestedBy).toContain('melissa');
        expect(studyStrategy.suggestedBy).toContain('davide');
      }
    });

    it('should limit strategies to top 5 areas', () => {
      const categories: ObservationCategory[] = [
        'logical_reasoning',
        'mathematical_intuition',
        'critical_thinking',
        'study_method',
        'verbal_expression',
        'linguistic_ability',
        'creativity',
        'artistic_sensitivity',
      ];

      const insights: MaestroInsightInput[] = categories.map(cat =>
        createMockInsight({ category: cat, isStrength: false })
      );

      const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);

      expect(profile.strategies.length).toBeLessThanOrEqual(5);
    });
  });

  // ============================================================================
  // createSynthesisContext
  // ============================================================================
  describe('createSynthesisContext', () => {
    it('should create context with student name', () => {
      const context = createSynthesisContext('Mario', [], { totalSessions: 0, totalMinutes: 0 });
      expect(context.studentName).toBe('Mario');
    });

    it('should separate strengths and growth areas', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({ isStrength: true, content: 'Strength 1' }),
        createMockInsight({ isStrength: false, content: 'Growth 1' }),
        createMockInsight({ isStrength: true, content: 'Strength 2' }),
      ];

      const context = createSynthesisContext('Mario', insights, { totalSessions: 5, totalMinutes: 100 });

      expect(context.strengths).toHaveLength(2);
      expect(context.growthAreas).toHaveLength(1);
    });

    it('should include session stats', () => {
      const context = createSynthesisContext('Mario', [], { totalSessions: 15, totalMinutes: 450 });

      expect(context.recentSessions).toBe(15);
      expect(context.totalMinutes).toBe(450);
    });
  });

  // ============================================================================
  // formatSynthesisPrompt
  // ============================================================================
  describe('formatSynthesisPrompt', () => {
    it('should include student name', () => {
      const context = createSynthesisContext('Mario', [], { totalSessions: 5, totalMinutes: 100 });
      const prompt = formatSynthesisPrompt(context);

      expect(prompt).toContain('Mario');
    });

    it('should include session statistics', () => {
      const context = createSynthesisContext('Mario', [], { totalSessions: 10, totalMinutes: 300 });
      const prompt = formatSynthesisPrompt(context);

      expect(prompt).toContain('10');
      expect(prompt).toContain('300');
    });

    it('should list strengths with maestro names', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({
          maestroName: 'Archimede',
          content: 'Ottimo ragionamento',
          isStrength: true
        }),
      ];
      const context = createSynthesisContext('Mario', insights, { totalSessions: 5, totalMinutes: 100 });
      const prompt = formatSynthesisPrompt(context);

      expect(prompt).toContain('[Archimede]');
      expect(prompt).toContain('Ottimo ragionamento');
    });

    it('should list growth areas with maestro names', () => {
      const insights: MaestroInsightInput[] = [
        createMockInsight({
          maestroName: 'Darwin',
          content: 'Difficoltà con le classificazioni',
          isStrength: false
        }),
      ];
      const context = createSynthesisContext('Mario', insights, { totalSessions: 5, totalMinutes: 100 });
      const prompt = formatSynthesisPrompt(context);

      expect(prompt).toContain('[Darwin]');
      expect(prompt).toContain('Difficoltà con le classificazioni');
    });

    it('should show placeholder when no observations', () => {
      const context = createSynthesisContext('Mario', [], { totalSessions: 0, totalMinutes: 0 });
      const prompt = formatSynthesisPrompt(context);

      expect(prompt).toContain('nessuna osservazione ancora');
    });
  });

  // ============================================================================
  // MELISSA_SYNTHESIS_PROMPT
  // ============================================================================
  describe('MELISSA_SYNTHESIS_PROMPT', () => {
    it('should contain growth mindset language', () => {
      expect(MELISSA_SYNTHESIS_PROMPT).toContain('growth-mindset');
    });

    it('should contain guidance for positive language', () => {
      expect(MELISSA_SYNTHESIS_PROMPT).toContain('aree di crescita');
      expect(MELISSA_SYNTHESIS_PROMPT).toContain('linguaggio positivo');
    });

    it('should contain profile structure', () => {
      expect(MELISSA_SYNTHESIS_PROMPT).toContain('Panoramica generale');
      expect(MELISSA_SYNTHESIS_PROMPT).toContain('Punti di forza');
      expect(MELISSA_SYNTHESIS_PROMPT).toContain('Aree di crescita');
      expect(MELISSA_SYNTHESIS_PROMPT).toContain('Suggerimenti per i genitori');
    });

    it('should identify Melissa as coordinator', () => {
      expect(MELISSA_SYNTHESIS_PROMPT).toContain('Melissa');
      expect(MELISSA_SYNTHESIS_PROMPT).toContain('coordinatrice');
    });
  });

  // ============================================================================
  // Category Display Names
  // ============================================================================
  describe('Category Display Names', () => {
    const defaultSessionStats = {
      totalSessions: 5,
      totalMinutes: 150,
      maestriInteracted: [],
    };

    it('should use Italian display names for categories', () => {
      const categories: ObservationCategory[] = [
        'logical_reasoning',
        'mathematical_intuition',
        'critical_thinking',
        'study_method',
      ];

      for (const category of categories) {
        const insights: MaestroInsightInput[] = [
          createMockInsight({ category, isStrength: false }),
        ];

        const profile = generateStudentProfile('s1', 'Mario', insights, defaultSessionStats);

        if (profile.strategies.length > 0) {
          // Strategy title should be in Italian, not the raw category name
          expect(profile.strategies[0].title).not.toBe(category);
          expect(profile.strategies[0].title).toMatch(/[A-Z]/); // Should start with uppercase
        }
      }
    });
  });
});
