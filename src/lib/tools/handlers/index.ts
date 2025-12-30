// ============================================================================
// TOOL HANDLERS INDEX
// Import this file to register all handlers
// ============================================================================

// Import handlers to trigger registration
import './mindmap-handler';
import './quiz-handler';
import './demo-handler';
import './search-handler';
import './flashcard-handler';

// Re-export utilities for testing
export { generateMarkdownFromNodes } from './mindmap-handler';
export { validateQuestions } from './quiz-handler';
export { validateCode, sanitizeHtml, DANGEROUS_JS_PATTERNS } from './demo-handler';
export { performWebSearch, performYouTubeSearch } from './search-handler';
export { validateCards } from './flashcard-handler';
