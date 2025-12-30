/**
 * Method Progress Tracking Types
 * Measure autonomy, not just content knowledge
 *
 * This module tracks HOW students learn, not just WHAT they learn.
 * Focus areas:
 * - Mind map creation skill
 * - Flashcard design skill
 * - Self-assessment ability
 * - Help-seeking behavior (autonomy)
 * - Method transfer across subjects
 *
 * Related: Issue #28
 */

/**
 * Skill mastery levels (growth mindset language)
 */
export const SKILL_LEVELS = ['novice', 'learning', 'competent', 'expert'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

/**
 * Tool types that students can create
 */
export type ToolType = 'mind_map' | 'flashcard' | 'quiz' | 'summary' | 'diagram';

/**
 * Level of help received when creating a tool
 */
export type HelpLevel = 'none' | 'hints' | 'full';

/**
 * Subject areas for tracking method transfer
 */
export type Subject =
  | 'matematica'
  | 'italiano'
  | 'storia'
  | 'geografia'
  | 'scienze'
  | 'inglese'
  | 'arte'
  | 'musica'
  | 'other';

/**
 * Method events that get tracked
 */
export type MethodEvent =
  | {
      type: 'tool_created';
      tool: ToolType;
      helpLevel: HelpLevel;
      subject?: Subject;
      qualityScore?: number; // 0-1, AI-evaluated
      timestamp: Date;
    }
  | {
      type: 'self_correction';
      context: string;
      subject?: Subject;
      timestamp: Date;
    }
  | {
      type: 'help_requested';
      context: string;
      timeElapsedSeconds: number; // Time trying before asking
      subject?: Subject;
      timestamp: Date;
    }
  | {
      type: 'method_transferred';
      fromSubject: Subject;
      toSubject: Subject;
      method: ToolType;
      timestamp: Date;
    }
  | {
      type: 'problem_solved_alone';
      context: string;
      subject?: Subject;
      timestamp: Date;
    };

/**
 * Mind map creation progress
 */
export interface MindMapProgress {
  /** Maps created without any help */
  createdAlone: number;
  /** Maps created with occasional hints */
  createdWithHints: number;
  /** Maps created with heavy assistance */
  createdWithFullHelp: number;
  /** Average quality score (0-1) */
  avgQualityScore: number;
  /** Current skill level */
  level: SkillLevel;
}

/**
 * Flashcard design progress
 */
export interface FlashcardProgress {
  /** Cards created without help */
  createdAlone: number;
  /** Cards created with guidance */
  createdWithHints: number;
  /** Effectiveness score based on retention rates */
  effectivenessScore: number;
  /** Types of cards used (basic, cloze, image, etc.) */
  formatVariety: string[];
  /** Current skill level */
  level: SkillLevel;
}

/**
 * Self-assessment skill progress
 */
export interface SelfAssessmentProgress {
  /** Times student correctly identified weak areas */
  correctIdentifications: number;
  /** Times student created targeted practice */
  targetedPracticeCreated: number;
  /** Times student over/underestimated abilities */
  miscalibrations: number;
  /** Current skill level */
  level: SkillLevel;
}

/**
 * Help-seeking behavior metrics
 */
export interface HelpBehavior {
  /** Total questions asked */
  questionsAsked: number;
  /** Self-corrections made */
  selfCorrections: number;
  /** Problems solved without help */
  solvedAlone: number;
  /** Average time (seconds) trying before asking */
  avgTimeBeforeAsking: number;
  /** Current skill level (more independent = higher) */
  level: SkillLevel;
}

/**
 * Method transfer across subjects
 */
export interface MethodTransfer {
  /** Subjects where methods were successfully applied */
  subjectsApplied: Subject[];
  /** Number of method adaptations for new contexts */
  adaptations: number;
  /** Methods that transferred well */
  successfulMethods: ToolType[];
  /** Current skill level */
  level: SkillLevel;
}

/**
 * Complete method progress for a student
 */
export interface MethodProgress {
  /** User ID */
  userId: string;
  /** Mind map creation skill */
  mindMaps: MindMapProgress;
  /** Flashcard design skill */
  flashcards: FlashcardProgress;
  /** Self-assessment ability */
  selfAssessment: SelfAssessmentProgress;
  /** Help-seeking behavior */
  helpBehavior: HelpBehavior;
  /** Method transfer across subjects */
  methodTransfer: MethodTransfer;
  /** Event history */
  events: MethodEvent[];
  /** Overall autonomy score (0-1) */
  autonomyScore: number;
  /** Last updated */
  updatedAt: Date;
}

/**
 * Skill progress display for UI
 */
export interface SkillDisplay {
  /** Skill name in Italian */
  name: string;
  /** Skill icon */
  icon: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current level */
  level: SkillLevel;
  /** Encouraging message */
  message: string;
  /** Color for UI */
  color: string;
}

/**
 * Milestone achievement
 */
export interface MethodMilestone {
  /** Unique milestone ID */
  id: string;
  /** Milestone type */
  type: 'mind_map' | 'flashcard' | 'autonomy' | 'transfer';
  /** Title in Italian */
  title: string;
  /** Description in Italian */
  description: string;
  /** Fun badge name */
  badgeName: string;
  /** Requirements to unlock */
  requirements: {
    metric: string;
    threshold: number;
  };
  /** XP reward */
  xpReward: number;
}

/**
 * Skill level thresholds
 */
export const LEVEL_THRESHOLDS: Record<SkillLevel, number> = {
  novice: 0,
  learning: 25,
  competent: 60,
  expert: 85,
};

/**
 * Level display in Italian
 */
export const LEVEL_DISPLAY: Record<SkillLevel, { name: string; emoji: string }> = {
  novice: { name: 'Principiante', emoji: '🌱' },
  learning: { name: 'In crescita', emoji: '🌿' },
  competent: { name: 'Competente', emoji: '🌳' },
  expert: { name: 'Esperto', emoji: '🌲' },
};

/**
 * Default empty progress
 */
export const DEFAULT_METHOD_PROGRESS: Omit<MethodProgress, 'userId'> = {
  mindMaps: {
    createdAlone: 0,
    createdWithHints: 0,
    createdWithFullHelp: 0,
    avgQualityScore: 0,
    level: 'novice',
  },
  flashcards: {
    createdAlone: 0,
    createdWithHints: 0,
    effectivenessScore: 0,
    formatVariety: [],
    level: 'novice',
  },
  selfAssessment: {
    correctIdentifications: 0,
    targetedPracticeCreated: 0,
    miscalibrations: 0,
    level: 'novice',
  },
  helpBehavior: {
    questionsAsked: 0,
    selfCorrections: 0,
    solvedAlone: 0,
    avgTimeBeforeAsking: 0,
    level: 'novice',
  },
  methodTransfer: {
    subjectsApplied: [],
    adaptations: 0,
    successfulMethods: [],
    level: 'novice',
  },
  events: [],
  autonomyScore: 0,
  updatedAt: new Date(),
};

/**
 * Method milestones (achievements)
 */
export const METHOD_MILESTONES: MethodMilestone[] = [
  {
    id: 'mind_map_5_alone',
    type: 'mind_map',
    title: 'Cartografo della Mente',
    description: 'Hai creato 5 mappe mentali senza aiuto!',
    badgeName: 'Cartografo della Mente',
    requirements: { metric: 'mindMaps.createdAlone', threshold: 5 },
    xpReward: 100,
  },
  {
    id: 'flashcard_expert',
    type: 'flashcard',
    title: 'Maestro delle Flashcard',
    description: 'Hai creato 20 flashcard efficaci!',
    badgeName: 'Maestro delle Flashcard',
    requirements: { metric: 'flashcards.createdAlone', threshold: 20 },
    xpReward: 150,
  },
  {
    id: 'autonomy_week',
    type: 'autonomy',
    title: 'Settimana Autonoma',
    description: 'Hai risolto 10 problemi da solo questa settimana!',
    badgeName: 'Esploratore Indipendente',
    requirements: { metric: 'helpBehavior.solvedAlone', threshold: 10 },
    xpReward: 200,
  },
  {
    id: 'method_transfer_3',
    type: 'transfer',
    title: 'Mente Flessibile',
    description: 'Hai applicato lo stesso metodo a 3 materie diverse!',
    badgeName: 'Mente Flessibile',
    requirements: { metric: 'methodTransfer.subjectsApplied.length', threshold: 3 },
    xpReward: 250,
  },
  {
    id: 'self_correction_10',
    type: 'autonomy',
    title: 'Auto-Correttore',
    description: 'Hai corretto 10 tuoi errori da solo!',
    badgeName: 'Auto-Correttore',
    requirements: { metric: 'helpBehavior.selfCorrections', threshold: 10 },
    xpReward: 100,
  },
];
