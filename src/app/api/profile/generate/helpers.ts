/**
 * Profile generation helpers
 */

import type { MaestroInsightInput } from '@/lib/profile/profile-generator';
import type { ObservationCategory } from '@/types';

/**
 * Maps maestro ID to display name
 */
export function getMaestroDisplayName(maestroId: string): string {
  const names: Record<string, string> = {
    'euclide-matematica': 'Euclide',
    'feynman-fisica': 'Richard Feynman',
    'curie-chimica': 'Marie Curie',
    'darwin-biologia': 'Charles Darwin',
    'erodoto-storia': 'Erodoto',
    'humboldt-geografia': 'Alexander von Humboldt',
    'manzoni-italiano': 'Alessandro Manzoni',
    'shakespeare-inglese': 'William Shakespeare',
    'leonardo-arte': 'Leonardo da Vinci',
    'mozart-musica': 'Wolfgang Mozart',
    'montessori-civica': 'Maria Montessori',
    'smith-economia': 'Adam Smith',
    'socrate-filosofia': 'Socrate',
  };
  return names[maestroId] || maestroId;
}

/**
 * Maps Learning category to ObservationCategory
 */
export function mapCategoryFromLearning(category: string): ObservationCategory {
  const mapping: Record<string, ObservationCategory> = {
    math: 'logical_reasoning',
    mathematics: 'logical_reasoning',
    logic: 'logical_reasoning',
    physics: 'scientific_curiosity',
    chemistry: 'experimental_approach',
    biology: 'scientific_curiosity',
    history: 'historical_understanding',
    geography: 'spatial_memory',
    italian: 'linguistic_ability',
    english: 'linguistic_ability',
    art: 'artistic_sensitivity',
    music: 'artistic_sensitivity',
    philosophy: 'philosophical_depth',
    study_method: 'study_method',
    organization: 'study_method',
    expression: 'verbal_expression',
    creativity: 'creativity',
    collaboration: 'collaborative_spirit',
  };

  return mapping[category.toLowerCase()] || 'study_method';
}

/**
 * Calculates overall confidence score for the profile
 */
export function calculateConfidenceScore(insights: MaestroInsightInput[]): number {
  if (insights.length === 0) return 0;

  const quantityScore = Math.min(insights.length / 20, 1) * 0.4;

  const avgConfidence =
    insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
  const qualityScore = avgConfidence * 0.4;

  const uniqueMaestri = new Set(insights.map((i) => i.maestroId)).size;
  const diversityScore = Math.min(uniqueMaestri / 5, 1) * 0.2;

  return quantityScore + qualityScore + diversityScore;
}

/**
 * Check if profile is up to date
 */
export function isProfileUpToDate(updatedAt: Date, hoursThreshold: number = 24): boolean {
  const hoursSinceUpdate =
    (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceUpdate < hoursThreshold;
}
