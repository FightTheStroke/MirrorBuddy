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
  SkillLevel,
  SkillDisplay,
  ToolType,
  HelpLevel,
  Subject,
  MethodMilestone,
  MindMapProgress,
  FlashcardProgress,
  HelpBehavior,
} from './types';
import {
  DEFAULT_METHOD_PROGRESS,
  LEVEL_THRESHOLDS,
  LEVEL_DISPLAY,
  METHOD_MILESTONES,
} from './types';

/**
 * Create a new method progress record for a user
 */
export function createMethodProgress(userId: string): MethodProgress {
  return {
    userId,
    ...DEFAULT_METHOD_PROGRESS,
    updatedAt: new Date(),
  };
}

/**
 * Record a tool creation event
 */
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

  // Update specific tool progress
  if (tool === 'mind_map') {
    updated.mindMaps = updateMindMapProgress(updated.mindMaps, helpLevel, qualityScore);
  } else if (tool === 'flashcard') {
    updated.flashcards = updateFlashcardProgress(updated.flashcards, helpLevel);
  }

  // Track method transfer if subject is different from previous
  if (subject) {
    updated.methodTransfer = trackMethodTransfer(updated.methodTransfer, tool, subject);
  }

  // Recalculate overall autonomy score
  updated.autonomyScore = calculateAutonomyScore(updated);
  updated.updatedAt = new Date();

  return updated;
}

/**
 * Record a self-correction event
 */
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

  // Update self-assessment level
  updated.selfAssessment = {
    ...updated.selfAssessment,
    correctIdentifications: updated.selfAssessment.correctIdentifications + 1,
    level: calculateSkillLevel(updated.selfAssessment.correctIdentifications + 1, 20),
  };

  // Update help behavior level
  updated.helpBehavior.level = calculateHelpBehaviorLevel(updated.helpBehavior);

  updated.autonomyScore = calculateAutonomyScore(updated);
  updated.updatedAt = new Date();

  return updated;
}

/**
 * Record a help request
 */
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

/**
 * Record a problem solved without help
 */
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

/**
 * Update mind map progress based on help level
 */
function updateMindMapProgress(
  current: MindMapProgress,
  helpLevel: HelpLevel,
  qualityScore?: number
): MindMapProgress {
  const updated = { ...current };

  switch (helpLevel) {
    case 'none':
      updated.createdAlone += 1;
      break;
    case 'hints':
      updated.createdWithHints += 1;
      break;
    case 'full':
      updated.createdWithFullHelp += 1;
      break;
  }

  // Update average quality score
  if (qualityScore !== undefined) {
    const total =
      updated.createdAlone + updated.createdWithHints + updated.createdWithFullHelp;
    const currentTotal = updated.avgQualityScore * (total - 1);
    updated.avgQualityScore = (currentTotal + qualityScore) / total;
  }

  // Calculate level based on independent creation ratio
  const total = updated.createdAlone + updated.createdWithHints + updated.createdWithFullHelp;
  const independenceRatio = total > 0 ? (updated.createdAlone / total) * 100 : 0;
  updated.level = calculateSkillLevel(independenceRatio, 100);

  return updated;
}

/**
 * Update flashcard progress
 */
function updateFlashcardProgress(
  current: FlashcardProgress,
  helpLevel: HelpLevel
): FlashcardProgress {
  const updated = { ...current };

  switch (helpLevel) {
    case 'none':
      updated.createdAlone += 1;
      break;
    case 'hints':
    case 'full':
      updated.createdWithHints += 1;
      break;
  }

  // Calculate level
  const total = updated.createdAlone + updated.createdWithHints;
  const independenceRatio = total > 0 ? (updated.createdAlone / total) * 100 : 0;
  updated.level = calculateSkillLevel(independenceRatio, 100);

  return updated;
}

/**
 * Track method transfer across subjects
 */
function trackMethodTransfer(
  current: MethodProgress['methodTransfer'],
  method: ToolType,
  subject: Subject
): MethodProgress['methodTransfer'] {
  const updated = { ...current };

  // Add subject if not already tracked
  if (!updated.subjectsApplied.includes(subject)) {
    updated.subjectsApplied = [...updated.subjectsApplied, subject];
    updated.adaptations += 1;
  }

  // Add method if not already tracked
  if (!updated.successfulMethods.includes(method)) {
    updated.successfulMethods = [...updated.successfulMethods, method];
  }

  // Update level based on number of subjects
  updated.level = calculateSkillLevel(updated.subjectsApplied.length * 20, 100);

  return updated;
}

/**
 * Calculate help behavior skill level
 */
function calculateHelpBehaviorLevel(behavior: HelpBehavior): SkillLevel {
  // Calculate independence ratio
  const totalActions = behavior.questionsAsked + behavior.solvedAlone;
  if (totalActions === 0) return 'novice';

  const independenceRatio = (behavior.solvedAlone / totalActions) * 100;

  // Factor in self-corrections as a positive
  const selfCorrectionBonus = Math.min(behavior.selfCorrections * 5, 20);

  // Factor in avg time before asking (longer = more independent)
  const timeBonus = Math.min(behavior.avgTimeBeforeAsking / 60 * 10, 15); // up to 15% for 90+ seconds

  const score = independenceRatio + selfCorrectionBonus + timeBonus;
  return calculateSkillLevel(score, 100);
}

/**
 * Calculate skill level from a value and max
 */
function calculateSkillLevel(value: number, max: number): SkillLevel {
  const percentage = (value / max) * 100;

  if (percentage >= LEVEL_THRESHOLDS.expert) return 'expert';
  if (percentage >= LEVEL_THRESHOLDS.competent) return 'competent';
  if (percentage >= LEVEL_THRESHOLDS.learning) return 'learning';
  return 'novice';
}

/**
 * Calculate overall autonomy score (0-1)
 */
export function calculateAutonomyScore(progress: MethodProgress): number {
  // Weight different aspects of autonomy
  const weights = {
    mindMaps: 0.2,
    flashcards: 0.2,
    selfAssessment: 0.15,
    helpBehavior: 0.3,
    methodTransfer: 0.15,
  };

  // Convert levels to scores
  const levelToScore = (level: SkillLevel): number => {
    switch (level) {
      case 'expert':
        return 1.0;
      case 'competent':
        return 0.7;
      case 'learning':
        return 0.4;
      default:
        return 0.1;
    }
  };

  const score =
    levelToScore(progress.mindMaps.level) * weights.mindMaps +
    levelToScore(progress.flashcards.level) * weights.flashcards +
    levelToScore(progress.selfAssessment.level) * weights.selfAssessment +
    levelToScore(progress.helpBehavior.level) * weights.helpBehavior +
    levelToScore(progress.methodTransfer.level) * weights.methodTransfer;

  return Math.round(score * 100) / 100;
}

/**
 * Get skill displays for UI
 */
export function getSkillDisplays(progress: MethodProgress): SkillDisplay[] {
  return [
    {
      name: 'Mappe Mentali',
      icon: '🗺️',
      progress: calculateProgressPercentage(progress.mindMaps.level),
      level: progress.mindMaps.level,
      message: getMindMapMessage(progress.mindMaps),
      color: '#3b82f6', // blue
    },
    {
      name: 'Flashcard',
      icon: '📇',
      progress: calculateProgressPercentage(progress.flashcards.level),
      level: progress.flashcards.level,
      message: getFlashcardMessage(progress.flashcards),
      color: '#10b981', // green
    },
    {
      name: 'Auto-valutazione',
      icon: '🔍',
      progress: calculateProgressPercentage(progress.selfAssessment.level),
      level: progress.selfAssessment.level,
      message: getSelfAssessmentMessage(progress.selfAssessment),
      color: '#f59e0b', // yellow
    },
    {
      name: 'Autonomia',
      icon: '🚀',
      progress: Math.round(progress.autonomyScore * 100),
      level: progress.helpBehavior.level,
      message: getAutonomyMessage(progress.helpBehavior),
      color: '#8b5cf6', // purple
    },
  ];
}

/**
 * Convert skill level to progress percentage
 */
function calculateProgressPercentage(level: SkillLevel): number {
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

/**
 * Get encouraging message for mind map skill
 */
function getMindMapMessage(progress: MindMapProgress): string {
  switch (progress.level) {
    case 'expert':
      return 'Sei un vero cartografo della mente!';
    case 'competent':
      return 'Sai creare mappe da solo!';
    case 'learning':
      return 'Stai migliorando ogni giorno!';
    default:
      return 'Continua a esercitarti con Melissa!';
  }
}

/**
 * Get encouraging message for flashcard skill
 */
function getFlashcardMessage(progress: FlashcardProgress): string {
  switch (progress.level) {
    case 'expert':
      return 'Esperto delle flashcard!';
    case 'competent':
      return 'Crei flashcard efficaci!';
    case 'learning':
      return 'Stai migliorando nella formulazione!';
    default:
      return 'Le tue carte diventeranno sempre migliori!';
  }
}

/**
 * Get encouraging message for self-assessment skill
 */
function getSelfAssessmentMessage(progress: MethodProgress['selfAssessment']): string {
  switch (progress.level) {
    case 'expert':
      return 'Sai esattamente cosa ripassare!';
    case 'competent':
      return 'Identifichi bene le tue aree deboli!';
    case 'learning':
      return 'Stai imparando a capire cosa non sai!';
    default:
      return 'Prova a chiederti cosa non sai prima di chiedere!';
  }
}

/**
 * Get encouraging message for autonomy
 */
function getAutonomyMessage(behavior: HelpBehavior): string {
  const ratio =
    behavior.solvedAlone + behavior.questionsAsked > 0
      ? behavior.solvedAlone / (behavior.solvedAlone + behavior.questionsAsked)
      : 0;

  if (ratio > 0.7) {
    return 'Sei super indipendente!';
  } else if (ratio > 0.5) {
    return 'Chiedi aiuto meno di prima!';
  } else if (ratio > 0.3) {
    return 'Stai diventando più autonomo!';
  } else {
    return 'Prova a risolvere da solo prima di chiedere!';
  }
}

/**
 * Check for newly unlocked milestones
 */
export function checkMilestones(
  progress: MethodProgress,
  previousMilestones: string[]
): MethodMilestone[] {
  const newMilestones: MethodMilestone[] = [];

  for (const milestone of METHOD_MILESTONES) {
    if (previousMilestones.includes(milestone.id)) continue;

    // Parse the metric path
    const value = getNestedValue(progress, milestone.requirements.metric);
    if (value >= milestone.requirements.threshold) {
      newMilestones.push(milestone);
    }
  }

  return newMilestones;
}

/**
 * Get nested object value by path
 */
function getNestedValue(obj: unknown, path: string): number {
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

/**
 * Get Melissa feedback based on progress
 */
export function getMelissaFeedback(progress: MethodProgress): string {
  const autonomyScore = progress.autonomyScore;
  const recentEvents = progress.events.slice(-10);
  const recentSolvedAlone = recentEvents.filter(
    (e) => e.type === 'problem_solved_alone'
  ).length;
  const recentHelpRequests = recentEvents.filter(
    (e) => e.type === 'help_requested'
  ).length;

  // Positive feedback for improving autonomy
  if (autonomyScore > 0.7) {
    return "Sei diventato davvero autonomo! Sono fiera di come lavori da solo. 🌟";
  }

  if (recentSolvedAlone > recentHelpRequests * 2) {
    return "Ho notato che questa settimana hai chiesto aiuto molto meno! Stai diventando bravissimo a lavorare da solo. Sono fiera di te! 🌟";
  }

  // Encouraging feedback for those still learning
  if (progress.mindMaps.level === 'novice' && progress.mindMaps.createdWithFullHelp > 3) {
    return "Vedo che le mappe mentali ti danno ancora qualche difficoltà. Vuoi che facciamo un po' di pratica insieme? Ho un trucco nuovo!";
  }

  // Default encouraging feedback
  return "Continua così! Ogni giorno stai diventando più bravo a studiare da solo. 💪";
}

/**
 * Format level for display
 */
export function formatLevel(level: SkillLevel): { name: string; emoji: string } {
  return LEVEL_DISPLAY[level];
}

/**
 * Compare progress over time
 */
export function compareProgress(
  current: MethodProgress,
  previous: MethodProgress
): {
  autonomyChange: number;
  improvingAreas: string[];
  needsWorkAreas: string[];
} {
  const autonomyChange = current.autonomyScore - previous.autonomyScore;

  const improvingAreas: string[] = [];
  const needsWorkAreas: string[] = [];

  // Compare each skill area
  const areas: { name: string; currentLevel: SkillLevel; previousLevel: SkillLevel }[] = [
    {
      name: 'Mappe Mentali',
      currentLevel: current.mindMaps.level,
      previousLevel: previous.mindMaps.level,
    },
    {
      name: 'Flashcard',
      currentLevel: current.flashcards.level,
      previousLevel: previous.flashcards.level,
    },
    {
      name: 'Auto-valutazione',
      currentLevel: current.selfAssessment.level,
      previousLevel: previous.selfAssessment.level,
    },
    {
      name: 'Autonomia',
      currentLevel: current.helpBehavior.level,
      previousLevel: previous.helpBehavior.level,
    },
  ];

  const levelOrder: SkillLevel[] = ['novice', 'learning', 'competent', 'expert'];

  for (const area of areas) {
    const currentIndex = levelOrder.indexOf(area.currentLevel);
    const previousIndex = levelOrder.indexOf(area.previousLevel);

    if (currentIndex > previousIndex) {
      improvingAreas.push(area.name);
    } else if (currentIndex < previousIndex) {
      needsWorkAreas.push(area.name);
    }
  }

  return { autonomyChange, improvingAreas, needsWorkAreas };
}
