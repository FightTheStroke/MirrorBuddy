export { Quiz } from "./quiz";
export { QuizView } from "./quiz-view";
export { FlashcardStudy, FlashcardPreview } from "./flashcard";
export { FlashcardsView } from "./flashcards-view";
export { MindmapsView } from "./mindmaps-view";
export { SummariesView } from "./summaries-view";
export { CalendarView } from "./calendar-view";
export { HTMLPreview } from "./html-preview";
export { HTMLSnippetsView } from "./html-snippets-view";
export { ArchiveView } from "./archive-view";

// Lazy-loaded versions for performance
export {
  LazyQuizView,
  LazyFlashcardsView,
  LazyMindmapsView,
  LazySummariesView,
  LazyCalendarView,
  LazyHTMLSnippetsView,
  LazyArchiveView,
  LazyStudyKitView,
  LazyGenitoriView,
} from "./lazy";
