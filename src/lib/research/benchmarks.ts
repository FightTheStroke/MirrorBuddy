/**
 * 📊 MirrorBuddy Pedagogical Benchmarking Framework
 * 
 * Grounded in:
 * - TutorBench (arXiv:2510.02663)
 * - MathTutorBench (eth-lre.github.io/mathtutorbench)
 */

export interface PedagogicalMetrics {
  scaffoldingScore: number; // 0-1: Ability to guide without giving answers
  hintingQuality: number;    // 0-1: Relevance and clarity of hints
  misconceptionHandling: number; // 0-1: Ability to identify and fix wrong mental models
  conciseness: number;       // 0-1: Appropriateness of length for the profile
  engagementRetained: number; // 0-1: Ability to keep the synthetic student on track
}

export interface EvaluationResult {
  sessionId: string;
  studentProfileId: string;
  maestroId: string;
  metrics: PedagogicalMetrics;
  rawTranscript: string;
  critique: string; // AI-generated critique of the pedagogical interaction
}

/**
 * Dimensions for TutorBench evaluation
 */
export const TUTOR_DIMENSIONS = {
  SCAFFOLDING: "The tutor provides structure but lets the student do the cognitive work.",
  HINTING: "The tutor provides small, incremental clues when the student is stuck.",
  MISCONCEPTION_FIX: "The tutor identifies WHY the student is wrong, not just THAT they are wrong.",
  ADAPTATION: "The tutor adjusts language and depth based on the student's reaction."
};

/**
 * Prompt for the "Pedagogical Judge" LLM
 */
export function getJudgePrompt(transcript: string, dimensions: typeof TUTOR_DIMENSIONS): string {
  return `You are a Senior Pedagogical Auditor. 
  Review the following transcript between an AI Maestro and a Synthetic Student.  

  Evaluate based on these dimensions:
  ${Object.entries(dimensions).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
  
  Transcript:
  ${transcript}
  
  Provide a score from 0 to 1 for each dimension and a brief qualitative critique.`;
}
