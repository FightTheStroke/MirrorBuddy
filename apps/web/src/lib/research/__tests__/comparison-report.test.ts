import { describe, it, expect } from 'vitest';
import { generateComparisonReport } from '../comparison-report';
import type { ModelComparisonResult, ModelResult } from '../model-comparison-types';
import type { TutorBenchScores } from '../benchmarks';
import type { SimulationSummary } from '../simulation-engine';
import type { SafetyBenchmarkResult } from '../safety-benchmark';

function buildMockScores(overall: number): TutorBenchScores {
  return {
    scaffolding: overall - 5,
    hinting: overall + 5,
    adaptation: overall,
    misconceptionHandling: overall - 2,
    overall,
    details: [],
  };
}

function buildMockSummary(model: string): SimulationSummary {
  return {
    experimentId: `exp-${model}`,
    turnsCompleted: 5,
    totalTokens: 500,
    avgResponseTimeMs: 200,
    status: 'completed',
  };
}

const mockSafety: SafetyBenchmarkResult = {
  totalScenarios: 25,
  passed: 23,
  failed: 2,
  results: [],
};

function buildMockResult(overrides?: Partial<ModelComparisonResult>): ModelComparisonResult {
  const modelResults: ModelResult[] = [
    {
      model: 'gpt-5-mini',
      maestroId: 'maestro-math',
      profileName: 'Marco-Dyslexic-12',
      tutorBenchScores: buildMockScores(75),
      simulationSummary: buildMockSummary('gpt-5-mini'),
      safetyResults: mockSafety,
    },
    {
      model: 'gpt-5',
      maestroId: 'maestro-math',
      profileName: 'Marco-Dyslexic-12',
      tutorBenchScores: buildMockScores(85),
      simulationSummary: buildMockSummary('gpt-5'),
      safetyResults: mockSafety,
    },
  ];

  return {
    config: {
      models: ['gpt-5-mini', 'gpt-5'],
      maestroIds: ['maestro-math'],
      profileNames: ['Marco-Dyslexic-12'],
      turns: 5,
    },
    startedAt: new Date('2026-02-16T10:00:00Z'),
    completedAt: new Date('2026-02-16T10:30:00Z'),
    modelResults,
    safetyBaseline: mockSafety,
    ...overrides,
  };
}

describe('comparison-report', () => {
  it('should contain markdown headers', () => {
    const report = generateComparisonReport(buildMockResult());

    expect(report).toContain('# Model Comparison Report');
    expect(report).toContain('## Model Summary');
    expect(report).toContain('## Per-Model Details');
    expect(report).toContain('## Safety Baseline');
    expect(report).toContain('## Winner');
  });

  it('should contain model summary table with | separators', () => {
    const report = generateComparisonReport(buildMockResult());

    expect(report).toContain('| Model |');
    expect(report).toContain('| gpt-5-mini |');
    expect(report).toContain('| gpt-5 |');
  });

  it('should contain safety section with pass rate', () => {
    const report = generateComparisonReport(buildMockResult());

    expect(report).toContain('Total Scenarios');
    expect(report).toContain('25');
    expect(report).toContain('Pass Rate');
  });

  it('should contain winner section', () => {
    const report = generateComparisonReport(buildMockResult());

    // gpt-5 has higher scores
    expect(report).toContain('gpt-5');
    expect(report).toContain('Winner');
  });

  it('should contain per-model detail sections', () => {
    const report = generateComparisonReport(buildMockResult());

    expect(report).toContain('### gpt-5-mini');
    expect(report).toContain('### gpt-5');
  });

  it('should handle empty results gracefully', () => {
    const result = buildMockResult({ modelResults: [] });
    const report = generateComparisonReport(result);

    expect(report).toContain('# Model Comparison Report');
    expect(report).toContain('No results available');
    expect(report).toContain('No results to determine a winner');
  });

  it('should include config details in header', () => {
    const report = generateComparisonReport(buildMockResult());

    expect(report).toContain('gpt-5-mini, gpt-5');
    expect(report).toContain('maestro-math');
    expect(report).toContain('Marco-Dyslexic-12');
    expect(report).toContain('Turns per experiment');
  });
});
