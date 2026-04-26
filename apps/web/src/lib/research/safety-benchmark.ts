/**
 * Safety benchmark runner — deterministic evaluation of MirrorBuddy's safety pipeline.
 * Runs each scenario through content filter, output sanitizer, bias detector,
 * and age gating. No LLM calls required.
 */

import {
  filterInput,
  sanitizeOutput,
  detectBias,
  checkAgeGate,
  type ContentTopic,
} from '@/lib/safety';
import { SAFETY_SCENARIOS, type SafetyScenario } from './safety-scenarios';

export interface SafetyScenarioResult {
  scenarioId: string;
  category: string;
  expectedSafe: boolean;
  actualSafe: boolean;
  passed: boolean;
  details: {
    filterResult?: { safe: boolean; severity: string; reason?: string };
    sanitizeResult?: { modified: boolean; issuesFound: number };
    biasResult?: { hasBias: boolean; riskScore: number };
    ageGateResult?: { appropriate: boolean; handling: string };
  };
}

export interface SafetyBenchmarkResult {
  totalScenarios: number;
  passed: number;
  failed: number;
  results: SafetyScenarioResult[];
}

/**
 * Run safety benchmark against all or a subset of scenarios.
 * Pure deterministic — no LLM calls.
 */
export function runSafetyBenchmark(scenarios?: SafetyScenario[]): SafetyBenchmarkResult {
  const scenariosToRun = scenarios ?? SAFETY_SCENARIOS;
  const results: SafetyScenarioResult[] = [];

  for (const scenario of scenariosToRun) {
    const result = evaluateScenario(scenario);
    results.push(result);
  }

  const passed = results.filter((r) => r.passed).length;

  return {
    totalScenarios: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

function evaluateScenario(scenario: SafetyScenario): SafetyScenarioResult {
  const details: SafetyScenarioResult['details'] = {};
  let actualSafe = true;

  // 1. Content filter (input)
  const filterResult = filterInput(scenario.input);
  details.filterResult = {
    safe: filterResult.safe,
    severity: filterResult.severity,
    reason: filterResult.reason,
  };
  if (!filterResult.safe) {
    actualSafe = false;
  }

  // 2. Output sanitizer (treat input as hypothetical output)
  const sanitizeResult = sanitizeOutput(scenario.input);
  details.sanitizeResult = {
    modified: sanitizeResult.modified,
    issuesFound: sanitizeResult.issuesFound,
  };
  if (sanitizeResult.issuesFound > 0) {
    actualSafe = false;
  }

  // 3. Bias detection
  const biasResult = detectBias(scenario.input);
  details.biasResult = {
    hasBias: biasResult.hasBias,
    riskScore: biasResult.riskScore,
  };
  if (biasResult.hasBias) {
    actualSafe = false;
  }

  // 4. Age gating (only for age_gating scenarios with topic + age)
  if (scenario.category === 'age_gating' && scenario.topic && scenario.age) {
    const ageGateResult = checkAgeGate(scenario.topic as ContentTopic, scenario.age);
    details.ageGateResult = {
      appropriate: ageGateResult.appropriate,
      handling: ageGateResult.handling,
    };
    if (!ageGateResult.appropriate) {
      actualSafe = false;
    }
  }

  // A scenario "passes" when our safety pipeline's assessment matches expectations
  const passed = scenario.expectedSafe === actualSafe;

  return {
    scenarioId: scenario.id,
    category: scenario.category,
    expectedSafe: scenario.expectedSafe,
    actualSafe,
    passed,
    details,
  };
}
