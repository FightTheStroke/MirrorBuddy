'use client';

/**
 * Knowledge Hub Quiz Renderer
 *
 * Displays saved quiz materials with questions and answer options.
 * Supports read-only review mode for Knowledge Hub.
 *
 * Supports two data formats:
 * 1. Knowledge Hub format: { title, questions: [{id, question, options: [{id, text, isCorrect}]}] }
 * 2. Tool format (Study Kit): { topic, questions: [{question, options: string[], correctIndex}] }
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BaseRendererProps } from './index';

interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  explanation?: string;
}

interface QuizData {
  title?: string;
  topic?: string; // From tools format
  questions: QuizQuestion[];
  showAnswers?: boolean;
}

// Input format from tools/Study Kit
interface ToolQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface ToolQuizData {
  topic?: string;
  title?: string;
  questions: ToolQuizQuestion[];
}

/**
 * Normalize quiz data from either format to the renderer format
 */
function normalizeQuizData(data: unknown): QuizData {
  const rawData = data as Record<string, unknown>;

  // Check if it's the tool format (options is string[])
  const questions = rawData.questions as unknown[];
  if (questions && questions.length > 0) {
    const firstQuestion = questions[0] as Record<string, unknown>;

    // Tool format: options is string[] with correctIndex
    if (Array.isArray(firstQuestion.options) && typeof firstQuestion.options[0] === 'string') {
      const toolData = rawData as unknown as ToolQuizData;
      return {
        title: toolData.title || toolData.topic,
        questions: toolData.questions.map((q, qIndex) => ({
          id: `question-${qIndex}`,
          question: q.question,
          options: q.options.map((opt, optIndex) => ({
            id: `option-${qIndex}-${optIndex}`,
            text: opt,
            isCorrect: optIndex === q.correctIndex,
          })),
          explanation: q.explanation,
        })),
      };
    }
  }

  // Already in QuizData format
  return rawData as unknown as QuizData;
}

/**
 * Render a quiz for review in Knowledge Hub.
 */
export function QuizRenderer({ data, className, readOnly }: BaseRendererProps) {
  // Normalize data from either format
  const quizData = useMemo(() => normalizeQuizData(data), [data]);
  const [showAnswers, setShowAnswers] = useState(quizData.showAnswers ?? readOnly ?? false);

  const questions = quizData.questions || [];
  const title = quizData.title || quizData.topic || 'Quiz';

  if (questions.length === 0) {
    return (
      <div className={cn('p-4 text-center text-slate-500', className)}>
        Nessuna domanda disponibile
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('space-y-6', className)}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <button
          onClick={() => setShowAnswers(!showAnswers)}
          className="text-sm text-accent-themed hover:underline"
        >
          {showAnswers ? 'Nascondi risposte' : 'Mostra risposte'}
        </button>
      </div>

      <div className="space-y-4">
        {questions.map((q, qIndex) => (
          <div
            key={q.id || `question-${qIndex}`}
            className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <p className="font-medium text-slate-900 dark:text-slate-100 mb-3">
              {qIndex + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, optIndex) => (
                <div
                  key={opt.id || `option-${qIndex}-${optIndex}`}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg transition-colors',
                    showAnswers && opt.isCorrect && 'bg-green-100 dark:bg-green-900/30',
                    showAnswers && !opt.isCorrect && 'bg-slate-50 dark:bg-slate-700/50'
                  )}
                >
                  {showAnswers ? (
                    opt.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    )
                  ) : (
                    <HelpCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  )}
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {opt.text}
                  </span>
                </div>
              ))}
            </div>
            {showAnswers && q.explanation && (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 italic">
                {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
