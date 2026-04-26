/**
 * Markdown report generator for model comparison results.
 */

import type { ModelComparisonResult, ModelResult } from './model-comparison-types';

/**
 * Generate a markdown report from model comparison results.
 */
export function generateComparisonReport(result: ModelComparisonResult): string {
  const sections: string[] = [];

  // 1. Header
  sections.push(buildHeader(result));

  // 2. Model summary table
  sections.push(buildSummaryTable(result.modelResults));

  // 3. Per-model detail sections
  sections.push(buildModelDetails(result.modelResults));

  // 4. Safety baseline summary
  sections.push(buildSafetySection(result));

  // 5. Winner summary
  sections.push(buildWinnerSection(result.modelResults));

  return sections.join('\n\n');
}

function buildHeader(result: ModelComparisonResult): string {
  const lines = [
    '# Model Comparison Report',
    '',
    `**Date**: ${result.startedAt.toISOString().split('T')[0]}`,
    `**Models**: ${result.config.models.join(', ')}`,
    `**Maestros**: ${result.config.maestroIds.join(', ')}`,
    `**Profiles**: ${result.config.profileNames.join(', ')}`,
    `**Turns per experiment**: ${result.config.turns}`,
  ];
  if (result.config.topic) {
    lines.push(`**Topic**: ${result.config.topic}`);
  }
  if (result.config.difficulty) {
    lines.push(`**Difficulty**: ${result.config.difficulty}`);
  }
  return lines.join('\n');
}

function buildSummaryTable(modelResults: ModelResult[]): string {
  if (modelResults.length === 0) {
    return '## Summary\n\nNo results available.';
  }

  // Group by model for averages
  const modelAverages = computeModelAverages(modelResults);
  const lines = [
    '## Model Summary',
    '',
    '| Model | Scaffolding | Hinting | Adaptation | Misconception | Overall |',
    '|-------|-------------|---------|------------|---------------|---------|',
  ];

  for (const [model, avg] of Object.entries(modelAverages)) {
    lines.push(
      `| ${model} | ${avg.scaffolding.toFixed(1)} | ${avg.hinting.toFixed(1)} | ${avg.adaptation.toFixed(1)} | ${avg.misconception.toFixed(1)} | ${avg.overall.toFixed(1)} |`,
    );
  }

  return lines.join('\n');
}

function buildModelDetails(modelResults: ModelResult[]): string {
  if (modelResults.length === 0) return '';

  const models = [...new Set(modelResults.map((r) => r.model))];
  const sections: string[] = [];

  for (const model of models) {
    const results = modelResults.filter((r) => r.model === model);
    const lines = [`### ${model}`, ''];

    lines.push(
      '| Maestro | Profile | Scaffolding | Hinting | Adaptation | Misconception | Overall |',
    );
    lines.push(
      '|---------|---------|-------------|---------|------------|---------------|---------|',
    );

    for (const r of results) {
      const s = r.tutorBenchScores;
      lines.push(
        `| ${r.maestroId} | ${r.profileName} | ${s.scaffolding} | ${s.hinting} | ${s.adaptation} | ${s.misconceptionHandling} | ${s.overall} |`,
      );
    }

    sections.push(lines.join('\n'));
  }

  return '## Per-Model Details\n\n' + sections.join('\n\n');
}

function buildSafetySection(result: ModelComparisonResult): string {
  const s = result.safetyBaseline;
  const lines = [
    '## Safety Baseline',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Total Scenarios | ${s.totalScenarios} |`,
    `| Passed | ${s.passed} |`,
    `| Failed | ${s.failed} |`,
    `| Pass Rate | ${s.totalScenarios > 0 ? ((s.passed / s.totalScenarios) * 100).toFixed(1) : 'N/A'}% |`,
  ];
  return lines.join('\n');
}

function buildWinnerSection(modelResults: ModelResult[]): string {
  if (modelResults.length === 0) {
    return '## Winner\n\nNo results to determine a winner.';
  }

  const averages = computeModelAverages(modelResults);
  const entries = Object.entries(averages);

  if (entries.length === 0) {
    return '## Winner\n\nNo results to determine a winner.';
  }

  let bestModel = entries[0][0];
  let bestScore = entries[0][1].overall;

  for (const [model, avg] of entries) {
    if (avg.overall > bestScore) {
      bestModel = model;
      bestScore = avg.overall;
    }
  }

  const dimensions = ['scaffolding', 'hinting', 'adaptation', 'misconception'] as const;
  const dimensionWinners: string[] = [];

  for (const dim of dimensions) {
    let winner = entries[0][0];
    let best = entries[0][1][dim];
    for (const [model, avg] of entries) {
      if (avg[dim] > best) {
        best = avg[dim];
        winner = model;
      }
    }
    dimensionWinners.push(`- **${dim}**: ${winner} (${best.toFixed(1)})`);
  }

  return [
    '## Winner',
    '',
    `🏆 **Overall Winner**: ${bestModel} (${bestScore.toFixed(1)})`,
    '',
    '### Per-Dimension Winners',
    '',
    ...dimensionWinners,
  ].join('\n');
}

interface ModelAverage {
  scaffolding: number;
  hinting: number;
  adaptation: number;
  misconception: number;
  overall: number;
}

function computeModelAverages(modelResults: ModelResult[]): Record<string, ModelAverage> {
  const grouped: Record<string, ModelResult[]> = {};

  for (const r of modelResults) {
    if (!grouped[r.model]) grouped[r.model] = [];
    grouped[r.model].push(r);
  }

  const averages: Record<string, ModelAverage> = {};

  for (const [model, results] of Object.entries(grouped)) {
    const count = results.length;
    const sum = results.reduce(
      (acc, r) => ({
        scaffolding: acc.scaffolding + r.tutorBenchScores.scaffolding,
        hinting: acc.hinting + r.tutorBenchScores.hinting,
        adaptation: acc.adaptation + r.tutorBenchScores.adaptation,
        misconception: acc.misconception + r.tutorBenchScores.misconceptionHandling,
        overall: acc.overall + r.tutorBenchScores.overall,
      }),
      { scaffolding: 0, hinting: 0, adaptation: 0, misconception: 0, overall: 0 },
    );

    averages[model] = {
      scaffolding: sum.scaffolding / count,
      hinting: sum.hinting / count,
      adaptation: sum.adaptation / count,
      misconception: sum.misconception / count,
      overall: sum.overall / count,
    };
  }

  return averages;
}
