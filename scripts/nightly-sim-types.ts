/**
 * Types for nightly simulation runner
 * Tests maestri system prompts against Ollama model tiers
 */

export type ModelTier = "3b" | "8b" | "12b";

export interface ModelConfig {
  tier: ModelTier;
  name: string;
  description: string;
  endpoint: string;
}

export interface TestQuery {
  id: string;
  prompt: string;
  description: string;
}

export interface SimulationResult {
  maestroId: string;
  maestroName: string;
  modelTier: ModelTier;
  modelName: string;
  testQueries: TestQueryResult[];
  summary: ModelTierSummary;
  timestamp: string;
  duration_ms: number;
}

export interface TestQueryResult {
  testId: string;
  testPrompt: string;
  response: string;
  latency_ms: number;
  input_tokens?: number;
  output_tokens?: number;
  safetyViolations: string[];
  passed: boolean;
}

export interface ModelTierSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageLatency_ms: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  safetyViolationsCount: number;
  passed: boolean;
}

export interface NightlyReport {
  timestamp: string;
  date: string;
  configuration: {
    modelTiers: ModelTier[];
    maestriIds: string[];
    verboseMode: boolean;
    dryRun: boolean;
  };
  results: SimulationResult[];
  summary: {
    totalSimulations: number;
    passedSimulations: number;
    failedSimulations: number;
    totalDuration_ms: number;
  };
}
