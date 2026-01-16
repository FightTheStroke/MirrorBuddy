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
import './summary-handler';
import './diagram-handler';
import './timeline-handler';
import './archive-handler';
import './calculator-handler';
import './formula-handler';
import './chart-handler';
import './webcam-handler';
import './pdf-handler';
import './homework-handler';

// Re-export utilities for testing
export { generateMarkdownFromNodes } from './mindmap-handler';
export { validateQuestions } from './quiz-handler';
export { validateCode, sanitizeHtml, DANGEROUS_JS_PATTERNS } from './demo-handler';
export { performWebSearch, performYouTubeSearch } from './search-handler';
export { validateCards } from './flashcard-handler';
export { validateSections } from './summary-handler';
export { validateMermaidCode } from './diagram-handler';
export { validateEvents } from './timeline-handler';
export { validateExpression, generateSteps } from './calculator-handler';
export { isLatex, validateLatex, generateLatexFromDescription } from './formula-handler';
export { validateChartType, validateChartData, generateChartConfig } from './chart-handler';
export { analyzeImageWithVision } from './webcam-handler';
export { validatePDFBuffer, formatPDFForContext } from './pdf-handler';
export { analyzeHomework, extractTextFromImage } from './homework-handler';
