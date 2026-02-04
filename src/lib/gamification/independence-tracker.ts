/**
 * Independence Tracker
 * Reference: Amodei "The Adolescence of Technology" (2026)
 *
 * Detects when students mention:
 * - Getting help from parents/teachers
 * - Studying with classmates
 * - Solving problems independently
 *
 * Awards XP to encourage human relationships over AI dependency.
 */

import { INDEPENDENCE_XP } from "@/lib/constants/xp-rewards";

/**
 * Patterns indicating the student got help from humans
 */
const HUMAN_HELP_PATTERNS = [
  // Italian - parents
  /ho chiesto a (mio padre|mia madre|i miei genitori)/gi,
  /mio padre mi ha (aiutato|spiegato)/gi,
  /mia madre mi ha (aiutato|spiegato)/gi,
  /i miei genitori mi hanno/gi,

  // Italian - teachers
  /ho chiesto (al|alla) (mio|mia) (professore|professoressa|insegnante)/gi,
  /(il|la) (professore|professoressa|insegnante) mi ha (spiegato|aiutato)/gi,
  /ho parlato con (il|la) (professore|professoressa)/gi,

  // English - parents
  /my (dad|mom|parents) (helped|explained|told)/gi,
  /i asked my (dad|mom|parents)/gi,

  // English - teachers
  /my teacher (helped|explained|told)/gi,
  /i asked my teacher/gi,
  /the teacher explained/gi,
];

/**
 * Patterns indicating the student studied with classmates
 */
const STUDY_GROUP_PATTERNS = [
  // Italian
  /ho studiato con (un amico|un compagno|i miei compagni)/gi,
  /abbiamo studiato insieme/gi,
  /il mio compagno mi ha (aiutato|spiegato)/gi,
  /ho chiesto a (un amico|un compagno)/gi,
  /studiando in gruppo/gi,

  // English
  /i studied with (a friend|my classmate|my friends)/gi,
  /we studied together/gi,
  /my friend (helped|explained)/gi,
  /i asked my friend/gi,
  /studying in a group/gi,
];

/**
 * Patterns indicating the student solved something independently
 */
const INDEPENDENT_SOLUTION_PATTERNS = [
  // Italian
  /ho risolto da solo/gi,
  /ce l'ho fatta da sol[oa]/gi,
  /sono riuscit[oa] da sol[oa]/gi,
  /ho capito da sol[oa]/gi,
  /ho trovato la soluzione da sol[oa]/gi,

  // English
  /i solved it (by myself|on my own)/gi,
  /i figured it out (by myself|on my own)/gi,
  /i did it (by myself|on my own)/gi,
  /i managed (by myself|on my own)/gi,
];

export interface IndependenceAnalysis {
  /** Whether human help was mentioned */
  mentionedHumanHelp: boolean;
  /** Whether studying with classmates was mentioned */
  mentionedStudyGroup: boolean;
  /** Whether independent problem solving was mentioned */
  mentionedIndependentSolution: boolean;
  /** Total XP to award for independence behaviors */
  xpToAward: number;
  /** Detected patterns (for logging) */
  detectedPatterns: string[];
}

/**
 * Analyze a message for independence behaviors
 *
 * @param message The user's message
 * @returns Analysis result with XP to award
 */
export function analyzeIndependence(message: string): IndependenceAnalysis {
  const detectedPatterns: string[] = [];
  let xpToAward = 0;

  // Check for human help mentions
  const mentionedHumanHelp = HUMAN_HELP_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    if (pattern.test(message)) {
      detectedPatterns.push(`human_help: ${pattern.source}`);
      return true;
    }
    return false;
  });

  if (mentionedHumanHelp) {
    xpToAward += INDEPENDENCE_XP.HUMAN_HELP_MENTION;
  }

  // Check for study group mentions
  const mentionedStudyGroup = STUDY_GROUP_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    if (pattern.test(message)) {
      detectedPatterns.push(`study_group: ${pattern.source}`);
      return true;
    }
    return false;
  });

  if (mentionedStudyGroup) {
    xpToAward += INDEPENDENCE_XP.STUDY_GROUP_MENTION;
  }

  // Check for independent solutions
  const mentionedIndependentSolution = INDEPENDENT_SOLUTION_PATTERNS.some(
    (pattern) => {
      pattern.lastIndex = 0;
      if (pattern.test(message)) {
        detectedPatterns.push(`independent: ${pattern.source}`);
        return true;
      }
      return false;
    },
  );

  if (mentionedIndependentSolution) {
    xpToAward += INDEPENDENCE_XP.SOLVED_INDEPENDENTLY;
  }

  return {
    mentionedHumanHelp,
    mentionedStudyGroup,
    mentionedIndependentSolution,
    xpToAward,
    detectedPatterns,
  };
}

/**
 * Check if a message deserves independence celebration
 * Used by AI to generate appropriate celebratory response
 */
export function shouldCelebrateIndependence(message: string): {
  celebrate: boolean;
  type: "human_help" | "study_group" | "independent" | null;
} {
  const analysis = analyzeIndependence(message);

  if (analysis.mentionedIndependentSolution) {
    return { celebrate: true, type: "independent" };
  }
  if (analysis.mentionedHumanHelp) {
    return { celebrate: true, type: "human_help" };
  }
  if (analysis.mentionedStudyGroup) {
    return { celebrate: true, type: "study_group" };
  }

  return { celebrate: false, type: null };
}
