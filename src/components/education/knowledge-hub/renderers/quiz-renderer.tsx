'use client';

/**
 * Knowledge Hub Quiz Renderer
 *
 * Displays saved quiz materials with questions and answer options.
 * Supports read-only review mode for Knowledge Hub.
 *
 * Expected data format:
 * {
 *   title?: string;
 *   questions: QuizQuestion[];
 *   showAnswers?: boolean;
 * }
 */

import { useState } from 'react';
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
  questions: QuizQuestion[];
  showAnswers?: boolean;
}

/**
 * Render a quiz for review in Knowledge Hub.
 */
export function QuizRenderer({ data, className, readOnly }: BaseRendererProps) {
  const quizData = data as unknown as QuizData;
  const [showAnswers, setShowAnswers] = useState(quizData.showAnswers ?? readOnly ?? false);

  const questions = quizData.questions || [];
  const title = quizData.title || 'Quiz';

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
            key={q.id}
            className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <p className="font-medium text-slate-900 dark:text-slate-100 mb-3">
              {qIndex + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt) => (
                <div
                  key={opt.id}
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
