// ============================================================================
// STORES BARREL EXPORT - Backward compatibility
// ============================================================================

// Re-export all stores
export { useSettingsStore } from './settings-store';
export { useProgressStore } from './progress-store';
export { useVoiceSessionStore } from './voice-session-store';
export { useConversationStore } from './conversation-store';
export { useLearningsStore } from './learnings-store';
export { useHTMLSnippetsStore } from './html-snippets-store';
export { useCalendarStore } from './calendar-store';
export { useUIStore } from './ui-store';

// Re-export sync utilities
export { initializeStores, setupAutoSync } from './use-store-sync';

// Re-export types
export type {
  TeachingStyle,
  LearningDifference,
  ExtendedStudentProfile,
  ProviderPreference,
} from './settings-store';

export type { SessionGrade } from './progress-store';
export type { HTMLSnippet } from './html-snippets-store';
export type { SchoolEvent } from './calendar-store';
