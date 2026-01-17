// ============================================================================
// STUDY KIT - PROCESS PDF
// Process PDF and generate complete study kit
// ============================================================================

import { logger } from '@/lib/logger';
import type { StudyKit } from '@/types/study-kit';
import { extractTextFromPDF } from './pdf-extraction';
import { generateSummary } from './summary';
import { generateMindmap } from './mindmap';
import { generateDemo } from './demo';
import { generateQuiz } from './quiz';

/**
 * Process PDF and generate complete study kit
 */
export async function processStudyKit(
  pdfBuffer: Buffer,
  title: string,
  subject?: string,
  onProgress?: (step: string, progress: number) => void
): Promise<Omit<StudyKit, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {
  try {
    // Step 1: Extract text from PDF
    onProgress?.('parsing', 0.1);
    const { text, pageCount } = await extractTextFromPDF(pdfBuffer);
    const wordCount = text.split(/\s+/).length;

    logger.info('Extracted PDF text', { pageCount, wordCount });

    // Step 2: Generate summary
    onProgress?.('generating_summary', 0.25);
    const summary = await generateSummary(text, title, subject);
    logger.info('Generated summary');

    // Step 3: Generate mindmap
    onProgress?.('generating_mindmap', 0.45);
    const mindmap = await generateMindmap(text, title, subject);
    logger.info('Generated mindmap');

    // Step 4: Generate demo (optional for STEM)
    onProgress?.('generating_demo', 0.65);
    const demo = await generateDemo(text, title, subject);
    if (demo) {
      logger.info('Generated demo');
    }

    // Step 5: Generate quiz
    onProgress?.('generating_quiz', 0.85);
    const quiz = await generateQuiz(text, title, subject);
    logger.info('Generated quiz');

    onProgress?.('complete', 1.0);

    return {
      sourceFile: 'uploaded.pdf',
      title,
      summary,
      mindmap,
      demo: demo || undefined,
      quiz,
      status: 'ready',
      subject,
      pageCount,
      wordCount,
      originalText: text,
    };
  } catch (error) {
    logger.error('Failed to process study kit', { error });
    throw error;
  }
}
