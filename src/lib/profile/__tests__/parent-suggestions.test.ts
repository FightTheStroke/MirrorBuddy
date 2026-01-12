// ============================================================================
// PARENT SUGGESTIONS TESTS
// Unit tests for parent suggestions generator
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  PARENT_SUGGESTIONS,
  MAESTRO_SUBJECTS,
  CATEGORY_TO_MAESTRO,
  getParentSuggestion,
  getMaestroSubject,
  type ParentSuggestion,
} from '../parent-suggestions';
import type { ObservationCategory } from '@/types';

describe('Parent Suggestions', () => {
  describe('PARENT_SUGGESTIONS data', () => {
    const allCategories: ObservationCategory[] = [
      'logical_reasoning',
      'mathematical_intuition',
      'critical_thinking',
      'study_method',
      'verbal_expression',
      'linguistic_ability',
      'creativity',
      'artistic_sensitivity',
      'scientific_curiosity',
      'experimental_approach',
      'spatial_memory',
      'historical_understanding',
      'philosophical_depth',
      'physical_awareness',
      'environmental_awareness',
      'narrative_skill',
      'collaborative_spirit',
    ];

    it('should have suggestions for all categories', () => {
      for (const category of allCategories) {
        expect(PARENT_SUGGESTIONS[category]).toBeDefined();
        expect(Array.isArray(PARENT_SUGGESTIONS[category])).toBe(true);
      }
    });

    it('should have at least 2 suggestions per category', () => {
      for (const category of allCategories) {
        expect(PARENT_SUGGESTIONS[category].length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should have valid suggestion structure', () => {
      for (const category of allCategories) {
        for (const suggestion of PARENT_SUGGESTIONS[category]) {
          expect(suggestion.homeActivity).toBeDefined();
          expect(typeof suggestion.homeActivity).toBe('string');
          expect(suggestion.homeActivity.length).toBeGreaterThan(10);

          expect(suggestion.communicationTip).toBeDefined();
          expect(typeof suggestion.communicationTip).toBe('string');
          expect(suggestion.communicationTip.length).toBeGreaterThan(10);

          expect(suggestion.environmentTip).toBeDefined();
          expect(typeof suggestion.environmentTip).toBe('string');
          expect(suggestion.environmentTip.length).toBeGreaterThan(10);
        }
      }
    });
  });

  describe('MAESTRO_SUBJECTS data', () => {
    it('should have subjects for common maestros', () => {
      expect(MAESTRO_SUBJECTS.archimede).toBeDefined();
      expect(MAESTRO_SUBJECTS.pitagora).toBeDefined();
      expect(MAESTRO_SUBJECTS.euclide).toBeDefined();
      expect(MAESTRO_SUBJECTS.leonardo).toBeDefined();
      expect(MAESTRO_SUBJECTS.dante).toBeDefined();
    });

    it('should have non-empty subject strings', () => {
      for (const [maestro, subject] of Object.entries(MAESTRO_SUBJECTS)) {
        expect(subject).toBeDefined();
        expect(typeof subject).toBe('string');
        expect(subject.length).toBeGreaterThan(0);
      }
    });

    it('should have expected subjects for specific maestros', () => {
      expect(MAESTRO_SUBJECTS.archimede).toBe('Matematica');
      expect(MAESTRO_SUBJECTS.dante).toBe('Italiano');
      expect(MAESTRO_SUBJECTS.galileo).toBe('Fisica');
      expect(MAESTRO_SUBJECTS.socrate).toBe('Filosofia');
    });
  });

  describe('CATEGORY_TO_MAESTRO data', () => {
    const allCategories: ObservationCategory[] = [
      'logical_reasoning',
      'mathematical_intuition',
      'critical_thinking',
      'study_method',
      'verbal_expression',
      'linguistic_ability',
      'creativity',
      'artistic_sensitivity',
      'scientific_curiosity',
      'experimental_approach',
      'spatial_memory',
      'historical_understanding',
      'philosophical_depth',
      'physical_awareness',
      'environmental_awareness',
      'narrative_skill',
      'collaborative_spirit',
    ];

    it('should have maestros for all categories', () => {
      for (const category of allCategories) {
        expect(CATEGORY_TO_MAESTRO[category]).toBeDefined();
        expect(Array.isArray(CATEGORY_TO_MAESTRO[category])).toBe(true);
        expect(CATEGORY_TO_MAESTRO[category].length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should have valid maestro IDs', () => {
      for (const category of allCategories) {
        for (const maestroId of CATEGORY_TO_MAESTRO[category]) {
          expect(typeof maestroId).toBe('string');
          expect(maestroId.length).toBeGreaterThan(0);
        }
      }
    });

    it('should map logical_reasoning to correct maestros', () => {
      expect(CATEGORY_TO_MAESTRO.logical_reasoning).toContain('archimede');
      expect(CATEGORY_TO_MAESTRO.logical_reasoning).toContain('euclide');
    });

    it('should map scientific_curiosity to correct maestros', () => {
      expect(CATEGORY_TO_MAESTRO.scientific_curiosity).toContain('darwin');
      expect(CATEGORY_TO_MAESTRO.scientific_curiosity).toContain('galileo');
    });
  });

  describe('getParentSuggestion', () => {
    it('should return a valid suggestion for logical_reasoning', () => {
      const suggestion = getParentSuggestion('logical_reasoning');

      expect(suggestion).toBeDefined();
      expect(suggestion.homeActivity).toBeDefined();
      expect(suggestion.communicationTip).toBeDefined();
      expect(suggestion.environmentTip).toBeDefined();
    });

    it('should return a valid suggestion for mathematical_intuition', () => {
      const suggestion = getParentSuggestion('mathematical_intuition');

      expect(suggestion).toBeDefined();
      expect(typeof suggestion.homeActivity).toBe('string');
    });

    it('should return a valid suggestion for creativity', () => {
      const suggestion = getParentSuggestion('creativity');

      expect(suggestion).toBeDefined();
      expect(suggestion.homeActivity.length).toBeGreaterThan(0);
    });

    it('should return a suggestion from the category pool', () => {
      const category: ObservationCategory = 'study_method';
      const suggestion = getParentSuggestion(category);
      const possibleSuggestions = PARENT_SUGGESTIONS[category];

      const matchingIndex = possibleSuggestions.findIndex(
        (s) =>
          s.homeActivity === suggestion.homeActivity &&
          s.communicationTip === suggestion.communicationTip &&
          s.environmentTip === suggestion.environmentTip
      );

      expect(matchingIndex).toBeGreaterThanOrEqual(0);
    });

    it('should work for all categories', () => {
      const categories: ObservationCategory[] = [
        'logical_reasoning',
        'mathematical_intuition',
        'critical_thinking',
        'study_method',
        'verbal_expression',
        'linguistic_ability',
        'creativity',
        'artistic_sensitivity',
        'scientific_curiosity',
        'experimental_approach',
        'spatial_memory',
        'historical_understanding',
        'philosophical_depth',
        'physical_awareness',
        'environmental_awareness',
        'narrative_skill',
        'collaborative_spirit',
      ];

      for (const category of categories) {
        const suggestion = getParentSuggestion(category);
        expect(suggestion).toBeDefined();
        expect(suggestion.homeActivity).toBeDefined();
      }
    });
  });

  describe('getMaestroSubject', () => {
    it('should return correct subject for archimede', () => {
      expect(getMaestroSubject('archimede')).toBe('Matematica');
    });

    it('should return correct subject for dante', () => {
      expect(getMaestroSubject('dante')).toBe('Italiano');
    });

    it('should return correct subject for galileo', () => {
      expect(getMaestroSubject('galileo')).toBe('Fisica');
    });

    it('should handle case-insensitive input', () => {
      expect(getMaestroSubject('ARCHIMEDE')).toBe('Matematica');
      expect(getMaestroSubject('Archimede')).toBe('Matematica');
    });

    it('should handle hyphenated IDs', () => {
      // Test with hyphenated version converted to underscore
      expect(getMaestroSubject('marco-polo')).toBe('Geografia');
    });

    it('should return default for unknown maestro', () => {
      expect(getMaestroSubject('unknown_maestro')).toBe('Studio Generale');
    });

    it('should return default for empty string', () => {
      expect(getMaestroSubject('')).toBe('Studio Generale');
    });
  });
});
