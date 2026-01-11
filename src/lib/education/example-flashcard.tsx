/**
 * Example Flashcard Module - Barrel Export
 * Re-exports flashcard types and components
 */

export type { Flashcard, FlashcardSessionProps, StatCardProps } from './example-flashcard-types';

export {
  FlashcardSession,
  FlashcardStats,
  FlashcardBrowser,
} from './example-flashcard-components';

export {
  formatInterval,
  formatNextReview,
} from './example-flashcard-helpers';

export { ExampleApp } from './example-flashcard-app';
