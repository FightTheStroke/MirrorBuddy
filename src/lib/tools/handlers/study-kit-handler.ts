// ============================================================================
// STUDY KIT HANDLER
// Process PDF and generate study materials (summary, mindmap, demo, quiz)
// Wave 2: Auto-generate study kit from PDF upload
// ============================================================================

// Re-export all from modular study-kit-handler directory
export { extractTextFromPDF } from './study-kit-handler/pdf-extraction';
export { generateSummary } from './study-kit-handler/summary';
export { generateMindmap } from './study-kit-handler/mindmap';
export { generateDemo } from './study-kit-handler/demo';
export { generateQuiz } from './study-kit-handler/quiz';
export { processStudyKit } from './study-kit-handler/process';
