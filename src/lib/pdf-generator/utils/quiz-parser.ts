/**
 * Quiz Content Parser
 * Extracts sections from quiz data structures
 */

import type { ContentSection } from '../types';

/**
 * Extract sections from quiz data
 */
export function extractQuizSections(quiz: Record<string, unknown>): ContentSection[] {
  const sections: ContentSection[] = [];

  sections.push({
    type: 'heading',
    content: 'Quiz di Verifica',
    level: 2,
  });

  const questions = quiz.questions as Array<{
    question: string;
    options?: string[];
    explanation?: string;
  }> | undefined;

  if (questions && Array.isArray(questions)) {
    questions.forEach((q, index) => {
      sections.push({
        type: 'paragraph',
        content: `Domanda ${index + 1}: ${q.question}`,
      });

      if (q.options && Array.isArray(q.options)) {
        sections.push({
          type: 'list',
          content: 'Opzioni:',
          items: q.options,
        });
      }

      if (q.explanation) {
        sections.push({
          type: 'quote',
          content: `Spiegazione: ${q.explanation}`,
        });
      }
    });
  }

  return sections;
}
