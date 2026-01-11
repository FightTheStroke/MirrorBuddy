/**
 * Hook for saved materials (mindmaps, quizzes, flashcards)
 * Barrel export from modular implementation
 */

export { useMindmaps } from './use-saved-materials/hooks/use-mindmaps';
export { useQuizzes } from './use-saved-materials/hooks/use-quizzes';
export { useFlashcardDecks } from './use-saved-materials/hooks/use-flashcard-decks';
export { useHomeworkSessions } from './use-saved-materials/hooks/use-homework-sessions';
export { useDemos } from './use-saved-materials/hooks/use-demos';
export { useSavedTools } from './use-saved-materials/hooks/use-saved-tools';
export { autoSaveMaterial, forceSaveMaterial } from './use-saved-materials/utils/auto-save';

export type {
  SavedMaterial,
  SavedMindmap,
  SavedQuiz,
  SavedFlashcardDeck,
  SavedHomework,
  SavedDemo,
  MindmapNode,
  QuizQuestion,
  FlashcardCard,
  HomeworkStep,
} from './use-saved-materials/types';
