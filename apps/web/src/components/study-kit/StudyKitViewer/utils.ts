/**
 * Utility functions for StudyKitViewer
 */

import type { StudyKit } from '@/types/study-kit';
import type { Quiz, Question, Subject } from '@/types/index';
import type { DemoData, QuizData, QuizQuestion } from '@/types/tools';
import { buildDemoHTML } from '@/lib/tools/demo-html-builder';

const normalizeDifficulty = (value?: number): Question['difficulty'] => {
  const rounded = Math.round(value ?? 2);
  return Math.min(5, Math.max(1, rounded)) as Question['difficulty'];
};

/**
 * Simple markdown to HTML parser for basic formatting
 */
export function parseMarkdown(text: string): string {
  if (!text) return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>');
}

/**
 * Build HTML code for demo from DemoData
 */
export function buildDemoCode(demoData: DemoData): string | null {
  return buildDemoHTML({
    html: demoData.html || '',
    css: demoData.css || '',
    js: demoData.js || '',
    code: ('code' in demoData && typeof demoData.code === 'string') ? demoData.code : undefined,
  });
}

/**
 * Transform Study Kit QuizData to interactive Quiz component format
 */
export function transformQuizData(
  quizData: QuizData,
  studyKit: StudyKit,
  difficultyOverride?: number
): Quiz {
  const subjectMap: Record<string, Subject> = {
    'matematica': 'mathematics',
    'fisica': 'physics',
    'chimica': 'chemistry',
    'biologia': 'biology',
    'storia': 'history',
    'geografia': 'geography',
    'italiano': 'italian',
    'inglese': 'english',
    'arte': 'art',
    'musica': 'music',
    'educazione civica': 'civics',
    'economia': 'economics',
    'informatica': 'computerScience',
    'salute': 'health',
    'filosofia': 'philosophy',
  };

  const subject: Subject = (studyKit.subject && subjectMap[studyKit.subject.toLowerCase()]) || 'computerScience';
  const fallbackDifficulty = normalizeDifficulty(difficultyOverride ?? 2);

  const questions: Question[] = quizData.questions.map((q: QuizQuestion, index: number) => ({
    id: `q-${index}`,
    text: q.question,
    type: 'multiple_choice' as const,
    options: q.options,
    correctAnswer: q.correctIndex,
    hints: [],
    explanation: q.explanation || '',
    difficulty: q.difficulty ?? fallbackDifficulty,
    subject: subject,
    topic: studyKit.title,
  }));

  return {
    id: `study-kit-${studyKit.id}`,
    title: studyKit.title,
    subject,
    questions,
    masteryThreshold: 70,
    xpReward: Math.max(20, questions.length * 10),
  };
}
