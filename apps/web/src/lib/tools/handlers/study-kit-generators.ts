/**
 * Study Kit Generators
 * AI-powered generation of study materials (summary, mindmap, demo, quiz)
 * Issue: Wave 2 - Auto-generate study kit from PDF upload
 */

// Re-export all from modular files
export { generateSummary } from './study-kit-generators/summary';
export { generateMindmap } from './study-kit-generators/mindmap';
export { generateDemo, isSTEMSubject } from './study-kit-generators/demo';
export { generateQuiz } from './study-kit-generators/quiz';
export { processStudyKit } from './study-kit-generators/process';
