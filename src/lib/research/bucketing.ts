/**
 * 🪣 User Bucketing Engine
 * 
 * Manages A/B testing and experimental group assignment for students.
 */

export type ExperimentalGroup = 'Control' | 'Test-A' | 'Test-B';

export interface BucketAssignment {
  userId: string;
  experimentId: string;
  group: ExperimentalGroup;
  assignedAt: DateTime;
  metadata?: Record<string, any>;
}

import { DateTime } from "luxon";

/**
 * Simple hash-based bucketing to ensure deterministic assignment
 */
export function assignUserToBucket(userId: string, experimentId: string): ExperimentalGroup {
  // Simple deterministic hash based on userId and experimentId
  const hash = Array.from(`${userId}-${experimentId}`).reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const remainder = hash % 3;
  if (remainder === 0) return 'Control';
  if (remainder === 1) return 'Test-A';
  return 'Test-B';
}

/**
 * Get configuration based on assigned bucket
 */
export function getExperimentConfig(group: ExperimentalGroup) {
  switch (group) {
    case 'Test-A':
      return { provider: 'azure', model: 'gpt-4o' };
    case 'Test-B':
      return { provider: 'ollama', model: 'llama3.2' };
    default:
      return { provider: 'azure', model: 'gpt-4o-mini' };
  }
}
