import type { SkillLevel, HelpBehavior } from '../types';
import { LEVEL_THRESHOLDS } from '../types';

export function calculateSkillLevel(value: number, max: number): SkillLevel {
  const percentage = (value / max) * 100;

  if (percentage >= LEVEL_THRESHOLDS.expert) return 'expert';
  if (percentage >= LEVEL_THRESHOLDS.competent) return 'competent';
  if (percentage >= LEVEL_THRESHOLDS.learning) return 'learning';
  return 'novice';
}

export function calculateHelpBehaviorLevel(behavior: HelpBehavior): SkillLevel {
  const totalActions = behavior.questionsAsked + behavior.solvedAlone;
  if (totalActions === 0) return 'novice';

  const independenceRatio = (behavior.solvedAlone / totalActions) * 100;
  const selfCorrectionBonus = Math.min(behavior.selfCorrections * 5, 20);
  const timeBonus = Math.min(behavior.avgTimeBeforeAsking / 60 * 10, 15);

  const score = independenceRatio + selfCorrectionBonus + timeBonus;
  return calculateSkillLevel(score, 100);
}

export function calculateProgressPercentage(level: SkillLevel): number {
  switch (level) {
    case 'expert':
      return 100;
    case 'competent':
      return 70;
    case 'learning':
      return 40;
    default:
      return 15;
  }
}

export function getNestedValue(obj: unknown, path: string): number {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return 0;
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current === 'number') return current;
  if (Array.isArray(current)) return current.length;
  return 0;
}

