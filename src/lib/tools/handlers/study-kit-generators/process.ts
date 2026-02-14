/**
 * Study Kit Processing
 * Process PDF and generate complete study kit
 * Per-feature AI config (ADR 0073)
 */

import { logger } from '@/lib/logger';
import type { StudyKit } from '@/types/study-kit';
import { extractTextFromPDF } from '../study-kit-extraction';
import { buildAdaptiveInstruction } from '@/lib/education';
import { getAdaptiveContextForUser } from '@/lib/education/server';
import { tierService } from '@/lib/tier/server';
import type { FeatureAIConfig } from '@/lib/tier/server';
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
  onProgress?: (step: string, progress: number) => void,
  userId?: string,
): Promise<Omit<StudyKit, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {
  try {
    let adaptiveInstruction: string | undefined;
    if (userId) {
      try {
        const context = await getAdaptiveContextForUser(userId, {
          subject,
          baselineDifficulty: 3,
          pragmatic: true,
        });
        adaptiveInstruction = buildAdaptiveInstruction(context);
      } catch (error) {
        logger.warn('Adaptive context unavailable for study kit', {
          error: String(error),
        });
      }
    }

    // Fetch AI configs for each feature (ADR 0073)
    let summaryConfig: FeatureAIConfig | undefined;
    let mindmapConfig: FeatureAIConfig | undefined;
    let demoConfig: FeatureAIConfig | undefined;
    let quizConfig: FeatureAIConfig | undefined;

    try {
      [summaryConfig, mindmapConfig, demoConfig, quizConfig] = await Promise.all([
        tierService.getFeatureAIConfigForUser(userId ?? null, 'summary'),
        tierService.getFeatureAIConfigForUser(userId ?? null, 'mindmap'),
        tierService.getFeatureAIConfigForUser(userId ?? null, 'demo'),
        tierService.getFeatureAIConfigForUser(userId ?? null, 'quiz'),
      ]);
    } catch (error) {
      logger.warn('AI configs unavailable, using generator defaults', {
        error: String(error),
      });
    }

    // Step 1: Extract text from PDF
    onProgress?.('parsing', 0.1);
    const { text, pageCount } = await extractTextFromPDF(pdfBuffer);
    const wordCount = text.split(/\s+/).length;

    logger.info('Extracted PDF text', { pageCount, wordCount });

    // Step 2: Generate summary
    onProgress?.('generating_summary', 0.25);
    const summary = await generateSummary(text, title, subject, adaptiveInstruction, summaryConfig);
    logger.info('Generated summary');

    // Step 3: Generate mindmap
    onProgress?.('generating_mindmap', 0.45);
    const mindmap = await generateMindmap(text, title, subject, adaptiveInstruction, mindmapConfig);
    logger.info('Generated mindmap');

    // Step 4: Generate demo (optional for STEM)
    onProgress?.('generating_demo', 0.65);
    const demo = await generateDemo(text, title, subject, demoConfig);
    if (demo) {
      logger.info('Generated demo');
    }

    // Step 5: Generate quiz
    onProgress?.('generating_quiz', 0.85);
    const quiz = await generateQuiz(text, title, subject, adaptiveInstruction, quizConfig);
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
    logger.error('Failed to process study kit', undefined, error);
    throw error;
  }
}
