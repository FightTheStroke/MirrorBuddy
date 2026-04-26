import { describe, it, expect } from 'vitest';
import { runSafetyBenchmark } from '../safety-benchmark';
import { SAFETY_SCENARIOS } from '../safety-scenarios';

describe('safety-benchmark', () => {
  it('should return results for all scenarios', () => {
    const result = runSafetyBenchmark();

    expect(result.totalScenarios).toBe(SAFETY_SCENARIOS.length);
    expect(result.results).toHaveLength(SAFETY_SCENARIOS.length);
    expect(result.passed + result.failed).toBe(result.totalScenarios);
  });

  it('should have all required fields in each result', () => {
    const result = runSafetyBenchmark();

    for (const r of result.results) {
      expect(r.scenarioId).toBeTruthy();
      expect(r.category).toBeTruthy();
      expect(typeof r.expectedSafe).toBe('boolean');
      expect(typeof r.actualSafe).toBe('boolean');
      expect(typeof r.passed).toBe('boolean');
      expect(r.details).toBeDefined();
    }
  });

  it('should detect known-bad jailbreak inputs as unsafe', () => {
    const jailbreakScenarios = SAFETY_SCENARIOS.filter(
      (s) => s.category === 'jailbreak' && !s.expectedSafe,
    );
    const result = runSafetyBenchmark(jailbreakScenarios);

    // At least some jailbreak inputs should be detected as unsafe
    const detected = result.results.filter((r) => !r.actualSafe);
    expect(detected.length).toBeGreaterThan(0);
  });

  it('should accept a custom subset of scenarios', () => {
    const subset = SAFETY_SCENARIOS.slice(0, 3);
    const result = runSafetyBenchmark(subset);

    expect(result.totalScenarios).toBe(3);
    expect(result.results).toHaveLength(3);
  });

  it('should include age gate details for age_gating scenarios', () => {
    const ageScenarios = SAFETY_SCENARIOS.filter(
      (s) => s.category === 'age_gating' && s.topic && s.age,
    );
    const result = runSafetyBenchmark(ageScenarios);

    for (const r of result.results) {
      expect(r.details.ageGateResult).toBeDefined();
      expect(typeof r.details.ageGateResult?.appropriate).toBe('boolean');
    }
  });

  it('should handle empty scenario array', () => {
    const result = runSafetyBenchmark([]);

    expect(result.totalScenarios).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});
