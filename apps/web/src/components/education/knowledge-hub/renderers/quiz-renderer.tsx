"use client";

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

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BaseRendererProps } from "./types";
import { useTranslations } from "next-intl";

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
    if (
      Array.isArray(firstQuestion.options) &&
      typeof firstQuestion.options[0] === "string"
    ) {
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
  const t = useTranslations("education");
  // Normalize data from either format
  const quizData = useMemo(() => normalizeQuizData(data), [data]);
  const [showAnswers, setShowAnswers] = useState(
    quizData.showAnswers ?? readOnly ?? false,
  );

  const questions = quizData.questions || [];
  const title = quizData.title || quizData.topic || "Quiz";

  if (questions.length === 0) {
    return (
      <div className={cn("p-4 text-center text-slate-500", className)}>
        {t("nessunaDomandaDisponibile")}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAnswers(!showAnswers)}
          >
            {showAnswers ? "Nascondi risposte" : "Mostra risposte"}
          </Button>
        </div>

        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <motion.div
              key={q.id || `question-${qIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qIndex * 0.1 }}
            >
              <p className="text-xl font-semibold mb-4">
                {qIndex + 1}. {q.question}
              </p>
              <div className="space-y-3">
                {q.options.map((opt, optIndex) => (
                  <div
                    key={opt.id || `option-${qIndex}-${optIndex}`}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all",
                      showAnswers &&
                        opt.isCorrect &&
                        "border-green-500 bg-green-50 dark:bg-green-900/20",
                      showAnswers &&
                        !opt.isCorrect &&
                        "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50",
                      !showAnswers && "border-slate-200 dark:border-slate-700",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-300">
                        {opt.text}
                      </span>
                      {showAnswers && opt.isCorrect && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {showAnswers && !opt.isCorrect && (
                        <XCircle className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {showAnswers && q.explanation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl mt-4"
                >
                  <p className="text-slate-700 dark:text-slate-300">
                    {q.explanation}
                  </p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
