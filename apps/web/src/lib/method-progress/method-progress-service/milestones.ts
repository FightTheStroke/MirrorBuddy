import type { MethodProgress, MethodMilestone } from '../types';
import { METHOD_MILESTONES } from '../types';
import { getNestedValue } from './utils';

export function checkMilestones(
  progress: MethodProgress,
  previousMilestones: string[]
): MethodMilestone[] {
  const newMilestones: MethodMilestone[] = [];

  for (const milestone of METHOD_MILESTONES) {
    if (previousMilestones.includes(milestone.id)) continue;

    const value = getNestedValue(progress, milestone.requirements.metric);
    if (value >= milestone.requirements.threshold) {
      newMilestones.push(milestone);
    }
  }

  return newMilestones;
}

