/**
 * Method Progress Service
 * Tracks HOW students learn, not just WHAT they learn
 *
 * Measures autonomy development across:
 * - Tool creation skills (mind maps, flashcards)
 * - Self-assessment ability
 * - Help-seeking behavior
 * - Method transfer across subjects
 *
 * Related: Issue #28
 */

import type {
  MethodProgress,
  MethodEvent,
  ToolType,
  HelpLevel,
  Subject,
} from './types';
import {
  DEFAULT_METHOD_PROGRESS,
} from './types';
import { updateMindMapProgress, updateFlashcardProgress, trackMethodTransfer } from './method-progress-service/progress-updaters';
import { calculateAutonomyScore, getSkillDisplays, formatLevel, compareProgress } from './method-progress-service/calculations';
import { checkMilestones } from './method-progress-service/milestones';
import { getMelissaFeedback } from './method-progress-service/messages';
import { calculateHelpBehaviorLevel, calculateSkillLevel } from './method-progress-service/utils';

export function createMethodProgress(userId: string): MethodProgress {
  return {
    userId,
    ...DEFAULT_METHOD_PROGRESS,
    updatedAt: new Date(),
  };
}

export function recordToolCreation(
  progress: MethodProgress,
  tool: ToolType,
  helpLevel: HelpLevel,
  subject?: Subject,
  qualityScore?: number
): MethodProgress {
  const event: MethodEvent = {
    type: 'tool_created',
    tool,
    helpLevel,
    subject,
    qualityScore,
    timestamp: new Date(),
  };

  const updated = { ...progress, events: [...progress.events, event] };

  if (tool === 'mind_map') {
    updated.mindMaps = updateMindMapProgress(updated.mindMaps, helpLevel, qualityScore);
  } else if (tool === 'flashcard') {
    updated.flashcards = updateFlashcardProgress(updated.flashcards, helpLevel);
  }

  if (subject) {
    updated.methodTransfer = trackMethodTransfer(updated.methodTransfer, tool, subject);
  }

  updated.autonomyScore = calculateAutonomyScore(updated);
  updated.updatedAt = new Date();

  return updated;
}

export function recordSelfCorrection(
  progress: MethodProgress,
  context: string,
  subject?: Subject
): MethodProgress {
  const event: MethodEvent = {
    type: 'self_correction',
    context,
    subject,
    timestamp: new Date(),
  };

  const updated = {
    ...progress,
    events: [...progress.events, event],
    helpBehavior: {
      ...progress.helpBehavior,
      selfCorrections: progress.helpBehavior.selfCorrections + 1,
    },
  };

  updated.selfAssessment = {
    ...updated.selfAssessment,
    correctIdentifications: updated.selfAssessment.correctIdentifications + 1,
    level: calculateSkillLevel(updated.selfAssessment.correctIdentifications + 1, 20),
  };

  updated.helpBehavior.level = calculateHelpBehaviorLevel(updated.helpBehavior);

  updated.autonomyScore = calculateAutonomyScore(updated);
  updated.updatedAt = new Date();

  return updated;
}

export function recordHelpRequest(
  progress: MethodProgress,
  context: string,
  timeElapsedSeconds: number,
  subject?: Subject
): MethodProgress {
  const event: MethodEvent = {
    type: 'help_requested',
    context,
    timeElapsedSeconds,
    subject,
    timestamp: new Date(),
  };

  const currentTotal = progress.helpBehavior.questionsAsked;
  const currentAvg = progress.helpBehavior.avgTimeBeforeAsking;
  const newAvg = (currentAvg * currentTotal + timeElapsedSeconds) / (currentTotal + 1);

  const updated = {
    ...progress,
    events: [...progress.events, event],
    helpBehavior: {
      ...progress.helpBehavior,
      questionsAsked: currentTotal + 1,
      avgTimeBeforeAsking: newAvg,
    },
  };

  updated.helpBehavior.level = calculateHelpBehaviorLevel(updated.helpBehavior);
  updated.autonomyScore = calculateAutonomyScore(updated);
  updated.updatedAt = new Date();

  return updated;
}

export function recordProblemSolvedAlone(
  progress: MethodProgress,
  context: string,
  subject?: Subject
): MethodProgress {
  const event: MethodEvent = {
    type: 'problem_solved_alone',
    context,
    subject,
    timestamp: new Date(),
  };

  const updated = {
    ...progress,
    events: [...progress.events, event],
    helpBehavior: {
      ...progress.helpBehavior,
      solvedAlone: progress.helpBehavior.solvedAlone + 1,
    },
  };

  updated.helpBehavior.level = calculateHelpBehaviorLevel(updated.helpBehavior);
  updated.autonomyScore = calculateAutonomyScore(updated);
  updated.updatedAt = new Date();

  return updated;
}

export { calculateAutonomyScore, getSkillDisplays, formatLevel, compareProgress };
export { checkMilestones };
export { getMelissaFeedback };
