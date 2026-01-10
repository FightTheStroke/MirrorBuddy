/**
 * Utility functions for Profile Generator
 */

import type { MaestroInsightInput } from '../profile-generator/types';
import type { MaestroObservation, LearningStrategy, LearningStyleProfile, ObservationCategory } from '@/types';
import { CATEGORY_PRIORITY, STRATEGY_TEMPLATES } from '../profile-generator/constants';

/**
 * Converts a MaestroInsightInput to a MaestroObservation.
 */
export function convertToObservation(input: MaestroInsightInput): MaestroObservation {
  return {
    id: `obs_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    maestroId: input.maestroId,
    maestroName: input.maestroName,
    category: input.category,
    observation: input.content,
    isStrength: input.isStrength,
    confidence: input.confidence,
    createdAt: input.createdAt,
    sessionId: input.sessionId,
  };
}

/**
 * Generates learning strategies based on growth areas.
 */
export function generateStrategies(growthAreas: MaestroInsightInput[]): LearningStrategy[] {
  const byCategory = new Map<ObservationCategory, MaestroInsightInput[]>();
  for (const area of growthAreas) {
    const existing = byCategory.get(area.category) || [];
    existing.push(area);
    byCategory.set(area.category, existing);
  }

  const categoryScores = Array.from(byCategory.entries())
    .map(([category, items]) => ({
      category,
      score: items.length * (CATEGORY_PRIORITY[category] || 5),
      suggestedBy: [...new Set(items.map((i) => i.maestroId))],
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const strategies: LearningStrategy[] = [];

  for (const { category, suggestedBy } of categoryScores) {
    const templates = STRATEGY_TEMPLATES[category] || [];
    if (templates.length > 0) {
      const strategyText = templates[Math.floor(Math.random() * templates.length)];

      strategies.push({
        id: `strat_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
        title: getCategoryDisplayName(category),
        description: strategyText,
        suggestedBy,
        forAreas: [category],
        priority: categoryScores.indexOf({ category, score: 0, suggestedBy }) < 2 ? 'high' : 'medium',
      });
    }
  }

  return strategies;
}

/**
 * Gets a human-readable display name for an observation category.
 */
export function getCategoryDisplayName(category: ObservationCategory): string {
  const names: Record<ObservationCategory, string> = {
    logical_reasoning: 'Ragionamento Logico',
    mathematical_intuition: 'Intuizione Matematica',
    critical_thinking: 'Pensiero Critico',
    study_method: 'Metodo di Studio',
    verbal_expression: 'Espressione Verbale',
    linguistic_ability: 'Abilita Linguistiche',
    creativity: 'Creativita',
    artistic_sensitivity: 'Sensibilita Artistica',
    scientific_curiosity: 'Curiosita Scientifica',
    experimental_approach: 'Approccio Sperimentale',
    spatial_memory: 'Memoria Spaziale',
    historical_understanding: 'Comprensione Storica',
    philosophical_depth: 'Profondita Filosofica',
    physical_awareness: 'Consapevolezza Corporea',
    environmental_awareness: 'Consapevolezza Ambientale',
    narrative_skill: 'Abilita Narrative',
    collaborative_spirit: 'Spirito Collaborativo',
  };
  return names[category] || category;
}

/**
 * Infers learning style from observation patterns.
 */
export function inferLearningStyle(insights: MaestroInsightInput[]): LearningStyleProfile {
  const categoryCounts = new Map<string, number>();
  for (const insight of insights) {
    const channel = getCategoryChannel(insight.category);
    categoryCounts.set(channel, (categoryCounts.get(channel) || 0) + 1);
  }

  let maxChannel: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' = 'visual';
  let maxCount = 0;
  for (const [channel, count] of categoryCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxChannel = channel as typeof maxChannel;
    }
  }

  const optimalDuration = 30;
  const motivators: string[] = [];
  const strengthCategories = insights
    .filter((i) => i.isStrength)
    .map((i) => i.category);

  if (strengthCategories.includes('creativity') || strengthCategories.includes('artistic_sensitivity')) {
    motivators.push('Espressione creativa');
  }
  if (strengthCategories.includes('logical_reasoning') || strengthCategories.includes('mathematical_intuition')) {
    motivators.push('Sfide logiche');
  }
  if (strengthCategories.includes('collaborative_spirit')) {
    motivators.push('Lavoro di gruppo');
  }
  if (strengthCategories.includes('scientific_curiosity') || strengthCategories.includes('experimental_approach')) {
    motivators.push('Scoperte ed esperimenti');
  }
  if (motivators.length === 0) {
    motivators.push('Apprendimento interattivo', 'Feedback positivo');
  }

  return {
    preferredChannel: maxChannel,
    optimalSessionDuration: optimalDuration,
    preferredTimeOfDay: 'afternoon',
    motivators,
    challengePreference: 'step_by_step',
  };
}

/**
 * Maps observation category to learning channel.
 */
function getCategoryChannel(category: ObservationCategory): string {
  const visual: ObservationCategory[] = ['spatial_memory', 'artistic_sensitivity', 'creativity'];
  const auditory: ObservationCategory[] = ['verbal_expression', 'linguistic_ability', 'narrative_skill'];
  const kinesthetic: ObservationCategory[] = ['experimental_approach', 'physical_awareness', 'collaborative_spirit'];
  const reading: ObservationCategory[] = ['historical_understanding', 'philosophical_depth', 'study_method'];

  if (visual.includes(category)) return 'visual';
  if (auditory.includes(category)) return 'auditory';
  if (kinesthetic.includes(category)) return 'kinesthetic';
  if (reading.includes(category)) return 'reading_writing';
  return 'visual';
}
