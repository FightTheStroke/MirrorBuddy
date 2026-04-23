/**
 * Greeting module - Dynamic, language-aware greetings for characters
 */

export {
  generateGreeting,
  generateMaestroGreeting,
  generateCoachGreeting,
  generateBuddyGreeting,
  LANGUAGE_TEACHERS,
  AMICI,
} from './greeting-generator';

export {
  GENERIC_GREETINGS,
  COACH_GREETINGS,
  BUDDY_GREETINGS,
  BILINGUAL_GREETINGS,
  MASCETTI_GREETINGS,
  applyGreetingTemplate,
} from './templates';

// Comprehensive re-exports for all sub-module names
export * from './i18n-templates';
export * from './greeting-generator';
