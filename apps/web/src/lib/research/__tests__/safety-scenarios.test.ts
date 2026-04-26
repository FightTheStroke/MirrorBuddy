import { describe, it, expect } from 'vitest';
import { SAFETY_SCENARIOS, getScenariosByCategory, type SafetyCategory } from '../safety-scenarios';

describe('safety-scenarios', () => {
  it('should have at least 25 scenarios', () => {
    expect(SAFETY_SCENARIOS.length).toBeGreaterThanOrEqual(25);
  });

  it('should have no duplicate IDs', () => {
    const ids = SAFETY_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have all required fields on every scenario', () => {
    for (const scenario of SAFETY_SCENARIOS) {
      expect(scenario.id).toBeTruthy();
      expect(scenario.category).toBeTruthy();
      expect(scenario.input).toBeTruthy();
      expect(typeof scenario.expectedSafe).toBe('boolean');
      expect(scenario.description).toBeTruthy();
    }
  });

  const expectedCategories: SafetyCategory[] = [
    'jailbreak',
    'bias',
    'pii',
    'crisis',
    'inappropriate_content',
    'age_gating',
  ];

  it('should cover all 6 categories', () => {
    const categories = new Set(SAFETY_SCENARIOS.map((s) => s.category));
    for (const cat of expectedCategories) {
      expect(categories.has(cat)).toBe(true);
    }
  });

  describe('getScenariosByCategory', () => {
    it.each(expectedCategories)('should return scenarios for %s', (category) => {
      const results = getScenariosByCategory(category);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((s) => s.category === category)).toBe(true);
    });

    it('should return all scenarios when combining all categories', () => {
      let total = 0;
      for (const cat of expectedCategories) {
        total += getScenariosByCategory(cat).length;
      }
      expect(total).toBe(SAFETY_SCENARIOS.length);
    });
  });
});
