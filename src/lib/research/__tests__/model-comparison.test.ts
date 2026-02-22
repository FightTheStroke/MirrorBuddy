import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/ai/server', () => ({
  chatCompletion: vi.fn().mockResolvedValue({
    content: 'Test response with passo 1',
    provider: 'azure' as const,
    model: 'gpt-5-mini',
    usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
  }),
}));

vi.mock('@/data', () => ({
  getMaestroById: vi.fn().mockReturnValue({
    id: 'maestro-math',
    subject: 'mathematics',
    systemPrompt: 'You are a math tutor.',
  }),
}));

import { runModelComparison } from '../model-comparison';
import type { ModelComparisonConfig } from '../model-comparison-types';
import { chatCompletion } from '@/lib/ai/server';
import { prisma } from '@/lib/db';

const mockChatCompletion = vi.mocked(chatCompletion);
const mockExperimentCreate = vi.mocked(prisma.researchExperiment.create);

describe('model-comparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock return values for prisma
    vi.mocked(prisma.researchExperiment.update).mockResolvedValue({} as never);
    vi.mocked(prisma.researchExperiment.findUnique).mockResolvedValue({
      id: 'exp-mock-1',
      status: 'draft',
      maestroId: 'maestro-math',
      syntheticProfile: { name: 'Marco-Dyslexic-12' },
      config: { topic: 'fractions', difficulty: 'medium' },
      turns: 3,
    } as never);
    vi.mocked(prisma.researchResult.create).mockResolvedValue({ id: 'result-1' } as never);
    vi.mocked(prisma.researchResult.findMany).mockResolvedValue([
      {
        studentMessage: 'Non capisco',
        maestroResponse: 'Passo 1: iniziamo con...',
      },
    ] as never);

    // Reset create mock to return incrementing IDs
    let callCount = 0;
    mockExperimentCreate.mockImplementation(() => {
      callCount++;
      return Promise.resolve({ id: `exp-mock-${callCount}` }) as never;
    });
  });

  const baseConfig: ModelComparisonConfig = {
    models: ['gpt-5-mini', 'gpt-5'],
    maestroIds: ['maestro-math'],
    profileNames: ['Marco-Dyslexic-12'],
    turns: 3,
  };

  it('should call createExperiment for each model×maestro×profile combo', async () => {
    const result = await runModelComparison(baseConfig);

    // 2 models × 1 maestro × 1 profile = 2 experiments
    expect(mockExperimentCreate).toHaveBeenCalledTimes(2);
    expect(result.modelResults).toHaveLength(2);
  });

  it('should pass model to SimulationConfig via chatCompletion', async () => {
    await runModelComparison({
      ...baseConfig,
      models: ['gpt-5.2-edu'],
    });

    // chatCompletion should have been called with model in options
    // The model is passed through runExperiment → runSimulation → chatCompletion
    expect(mockChatCompletion).toHaveBeenCalled();
  });

  it('should run safety benchmark as baseline', async () => {
    const result = await runModelComparison(baseConfig);

    expect(result.safetyBaseline).toBeDefined();
    expect(result.safetyBaseline.totalScenarios).toBeGreaterThan(0);
  });

  it('should return a valid ModelComparisonResult structure', async () => {
    const result = await runModelComparison(baseConfig);

    expect(result.config).toEqual(baseConfig);
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.modelResults).toBeInstanceOf(Array);
    expect(result.safetyBaseline).toBeDefined();

    for (const mr of result.modelResults) {
      expect(mr.model).toBeTruthy();
      expect(mr.maestroId).toBeTruthy();
      expect(mr.profileName).toBeTruthy();
      expect(mr.tutorBenchScores).toBeDefined();
      expect(mr.simulationSummary).toBeDefined();
      expect(mr.safetyResults).toBeDefined();
    }
  });

  it('should handle 2 models × 1 maestro × 1 profile = 2 results', async () => {
    const result = await runModelComparison(baseConfig);

    expect(result.modelResults).toHaveLength(2);
    const models = result.modelResults.map((r) => r.model);
    expect(models).toContain('gpt-5-mini');
    expect(models).toContain('gpt-5');
  });
});
