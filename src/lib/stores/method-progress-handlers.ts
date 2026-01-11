/**
 * Method Progress Event Handlers
 * Handles recording and processing autonomy-related events
 */

import type {
  MethodProgress,
  MethodEvent,
  ToolType,
  HelpLevel,
  Subject,
} from '@/lib/method-progress/types';
import { calculateLevel } from './method-progress-utils';

/**
 * Handle tool creation event
 */
export function handleToolCreation(
  state: MethodProgress,
  tool: ToolType,
  helpLevel: HelpLevel,
  subject: Subject | undefined,
  qualityScore: number | undefined
): Partial<MethodProgress> {
  const event: MethodEvent = {
    type: 'tool_created',
    tool,
    helpLevel,
    subject,
    qualityScore,
    timestamp: new Date(),
  };

  const newState: Partial<MethodProgress> = { ...state };

  if (tool === 'mind_map') {
    const mindMaps = { ...state.mindMaps };
    if (helpLevel === 'none') mindMaps.createdAlone++;
    else if (helpLevel === 'hints') mindMaps.createdWithHints++;
    else mindMaps.createdWithFullHelp++;

    if (qualityScore !== undefined) {
      const total =
        mindMaps.createdAlone +
        mindMaps.createdWithHints +
        mindMaps.createdWithFullHelp;
      mindMaps.avgQualityScore =
        (mindMaps.avgQualityScore * (total - 1) + qualityScore) / total;
    }

    const progress = (mindMaps.createdAlone * 3 + mindMaps.createdWithHints) * 5;
    mindMaps.level = calculateLevel(Math.min(100, progress));
    newState.mindMaps = mindMaps;
  } else if (tool === 'flashcard') {
    const flashcards = { ...state.flashcards };
    if (helpLevel === 'none') flashcards.createdAlone++;
    else flashcards.createdWithHints++;

    const progress = (flashcards.createdAlone * 2 + flashcards.createdWithHints) * 3;
    flashcards.level = calculateLevel(Math.min(100, progress));
    newState.flashcards = flashcards;
  }

  newState.events = [...state.events, event].slice(-100);
  newState.updatedAt = new Date();

  return newState;
}

/**
 * Handle self correction event
 */
export function handleSelfCorrection(
  state: MethodProgress,
  context: string,
  subject: Subject | undefined
): Partial<MethodProgress> {
  const event: MethodEvent = {
    type: 'self_correction',
    context,
    subject,
    timestamp: new Date(),
  };

  const helpBehavior = { ...state.helpBehavior };
  helpBehavior.selfCorrections++;

  const progress = helpBehavior.selfCorrections * 5 + helpBehavior.solvedAlone * 3;
  helpBehavior.level = calculateLevel(Math.min(100, progress));

  return {
    helpBehavior,
    events: [...state.events, event].slice(-100),
    updatedAt: new Date(),
  };
}

/**
 * Handle help request event
 */
export function handleHelpRequest(
  state: MethodProgress,
  context: string,
  timeElapsedSeconds: number,
  subject: Subject | undefined
): Partial<MethodProgress> {
  const event: MethodEvent = {
    type: 'help_requested',
    context,
    timeElapsedSeconds,
    subject,
    timestamp: new Date(),
  };

  const helpBehavior = { ...state.helpBehavior };
  helpBehavior.questionsAsked++;

  const total = helpBehavior.questionsAsked;
  helpBehavior.avgTimeBeforeAsking =
    (helpBehavior.avgTimeBeforeAsking * (total - 1) + timeElapsedSeconds) /
    total;

  return {
    helpBehavior,
    events: [...state.events, event].slice(-100),
    updatedAt: new Date(),
  };
}

/**
 * Handle problem solved alone event
 */
export function handleProblemSolvedAlone(
  state: MethodProgress,
  context: string,
  subject: Subject | undefined
): Partial<MethodProgress> {
  const event: MethodEvent = {
    type: 'problem_solved_alone',
    context,
    subject,
    timestamp: new Date(),
  };

  const helpBehavior = { ...state.helpBehavior };
  helpBehavior.solvedAlone++;

  const progress = helpBehavior.selfCorrections * 5 + helpBehavior.solvedAlone * 3;
  helpBehavior.level = calculateLevel(Math.min(100, progress));

  return {
    helpBehavior,
    events: [...state.events, event].slice(-100),
    updatedAt: new Date(),
  };
}

/**
 * Handle method transfer event
 */
export function handleMethodTransfer(
  state: MethodProgress,
  fromSubject: Subject,
  toSubject: Subject,
  method: ToolType
): Partial<MethodProgress> {
  const event: MethodEvent = {
    type: 'method_transferred',
    fromSubject,
    toSubject,
    method,
    timestamp: new Date(),
  };

  const methodTransfer = { ...state.methodTransfer };
  methodTransfer.adaptations++;

  if (!methodTransfer.subjectsApplied.includes(toSubject)) {
    methodTransfer.subjectsApplied = [...methodTransfer.subjectsApplied, toSubject];
  }

  if (!methodTransfer.successfulMethods.includes(method)) {
    methodTransfer.successfulMethods = [...methodTransfer.successfulMethods, method];
  }

  const progress =
    methodTransfer.subjectsApplied.length * 15 + methodTransfer.adaptations * 5;
  methodTransfer.level = calculateLevel(Math.min(100, progress));

  return {
    methodTransfer,
    events: [...state.events, event].slice(-100),
    updatedAt: new Date(),
  };
}
