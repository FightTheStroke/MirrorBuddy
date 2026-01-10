/**
 * Knowledge Base Types and Version
 */

// ============================================================================
// VERSION INFO
// ============================================================================

export const APP_VERSION = {
  version: '2.0.0',
  lastUpdated: '2026-01',
  releaseNotes: 'https://github.com/MirrorBuddy/mirrorbuddy/releases',
};

// ============================================================================
// CATEGORY TYPES
// ============================================================================

export type KnowledgeCategory =
  | 'maestri'
  | 'voice'
  | 'tools'
  | 'flashcards'
  | 'mindmaps'
  | 'quizzes'
  | 'coach'
  | 'buddy'
  | 'gamification'
  | 'navigation'
  | 'pomodoro'
  | 'scheduler'
  | 'notifications'
  | 'ambient_audio'
  | 'accessibility'
  | 'account'
  | 'privacy'
  | 'troubleshooting';
