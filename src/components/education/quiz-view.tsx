'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Brain, Play, Trophy, Target, Sparkles, MessageSquare, Loader2, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Quiz } from './quiz';
import { useProgressStore } from '@/lib/stores';
import { useQuizzes } from '@/lib/hooks/use-saved-materials';
import type { Quiz as QuizType, QuizResult, Subject, Maestro } from '@/types';
import { subjectNames, subjectIcons, subjectColors } from '@/data';
import { cn } from '@/lib/utils';
import { ToolMaestroSelectionDialog } from './tool-maestro-selection-dialog';
import type { QuizViewProps } from './quiz-view/types';
import { sampleQuizzes } from './quiz-view/constants';

export type { QuizViewProps } from './quiz-view/types';


export function QuizView({ initialMaestroId, initialMode }: QuizViewProps) {
  const _router = useRouter();
  const [selectedQuiz, setSelectedQuiz] = useState<QuizType | null>(null);
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  const { addXP } = useProgressStore();
  const { quizzes: savedQuizzes, loading, deleteQuiz } = useQuizzes();
  const [showMaestroDialog, setShowMaestroDialog] = useState(false);
  const initialProcessed = useRef(false);

  // Auto-open maestro dialog when coming from Astuccio with parameters
  useEffect(() => {
    if (initialMaestroId && initialMode && !initialProcessed.current) {
      initialProcessed.current = true;
      const timer = setTimeout(() => {
        setShowMaestroDialog(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialMaestroId, initialMode]);

  // Handle maestro selection (focus mode has been removed)
  const handleMaestroConfirm = (_maestro: Maestro, _mode: 'voice' | 'chat') => {
    setShowMaestroDialog(false);
    // Focus mode has been removed
  };

  // Convert SavedQuiz to QuizType for the Quiz component
  const convertToQuizType = (saved: typeof savedQuizzes[0]): QuizType => ({
    id: saved.id,
    title: saved.title,
    subject: (saved.subject || 'mathematics') as Subject,
    questions: saved.questions.map((q, idx) => ({
      id: String(idx),
      text: q.question,
      type: 'multiple_choice' as const,
      options: q.options,
      correctAnswer: q.correctIndex ?? 0,
      hints: [],
      explanation: q.explanation || '',
      difficulty: 2,
      subject: (saved.subject || 'mathematics') as Subject,
      topic: saved.title,
    })),
    masteryThreshold: 70,
    xpReward: Math.max(20, saved.questions.length * 10),
  });

  const handleQuizComplete = (result: QuizResult) => {
    if (selectedQuiz) {
      const avgDifficulty =
        selectedQuiz.questions.reduce((sum, q) => sum + (q.difficulty || 3), 0) / selectedQuiz.questions.length;
      fetch('/api/quizzes/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: result.quizId,
          score: result.correctAnswers,
          totalQuestions: result.totalQuestions,
          subject: selectedQuiz.subject,
          topic: selectedQuiz.title,
          avgDifficulty,
          source: 'quiz',
        }),
      }).catch(() => undefined);
    }
    addXP(result.xpEarned);
    setCompletedQuizzes(prev => [...prev, result.quizId]);
    setSelectedQuiz(null);
  };

  if (selectedQuiz) {
    return (
      <Quiz
        quiz={selectedQuiz}
        onComplete={handleQuizComplete}
        onClose={() => setSelectedQuiz(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-500" />
            Quiz
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Metti alla prova le tue conoscenze e guadagna XP
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {/* PRIMARY: Conversation-first approach (Phase 6) */}
          <Button onClick={() => setShowMaestroDialog(true)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Crea Quiz con un Professore
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <Trophy className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-purple-700 dark:text-purple-300">
              {completedQuizzes.length} completati
            </span>
          </div>
        </div>
      </div>

      {/* I tuoi Quiz - Saved quizzes from database */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          <span className="ml-2 text-slate-500">Caricamento quiz salvati...</span>
        </div>
      ) : savedQuizzes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-500" />
            I tuoi Quiz
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedQuizzes.map((saved) => {
              const quiz = convertToQuizType(saved);
              const isCompleted = completedQuizzes.includes(quiz.id);
              const subjectColor = subjectColors[quiz.subject] || '#6366f1';
              const icon = subjectIcons[quiz.subject] || '📚';
              const name = subjectNames[quiz.subject] || quiz.subject;

              return (
                <motion.div
                  key={quiz.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={cn(
                      'cursor-pointer transition-all border-2 hover:shadow-lg relative group',
                      isCompleted
                        ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10'
                        : 'border-purple-200 dark:border-purple-800 hover:border-purple-400'
                    )}
                    onClick={() => !isCompleted && setSelectedQuiz(quiz)}
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Sei sicuro di voler eliminare questo quiz?')) {
                          deleteQuiz(quiz.id);
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                      title="Elimina quiz"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                          style={{ backgroundColor: `${subjectColor}20` }}
                        >
                          {icon}
                        </div>
                        {isCompleted && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <Trophy className="h-3 w-3 text-green-600" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-300">
                              Completato
                            </span>
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-lg mt-3">{quiz.title}</CardTitle>
                      <p className="text-sm text-slate-500" style={{ color: subjectColor }}>
                        {name}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Creato il {saved.createdAt.toLocaleDateString('it-IT')}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span>{quiz.questions.length} domande</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          <span>{quiz.xpReward} XP</span>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        variant={isCompleted ? 'outline' : 'default'}
                        disabled={isCompleted}
                      >
                        {isCompleted ? (
                          <>
                            <Trophy className="h-4 w-4 mr-2" />
                            Completato
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Inizia Quiz
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quiz di Esempio - Sample quizzes */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Quiz di Esempio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sampleQuizzes.map((quiz) => {
          const isCompleted = completedQuizzes.includes(quiz.id);
          const subjectColor = subjectColors[quiz.subject] || '#6366f1';
          const icon = subjectIcons[quiz.subject] || '📚';
          const name = subjectNames[quiz.subject] || quiz.subject;

          return (
            <motion.div
              key={quiz.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={cn(
                  'cursor-pointer transition-all border-2 hover:shadow-lg',
                  isCompleted
                    ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10'
                    : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                )}
                onClick={() => !isCompleted && setSelectedQuiz(quiz)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${subjectColor}20` }}
                    >
                      {icon}
                    </div>
                    {isCompleted && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <Trophy className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">
                          Completato
                        </span>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3">{quiz.title}</CardTitle>
                  <p className="text-sm text-slate-500" style={{ color: subjectColor }}>
                    {name}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      <span>{quiz.questions.length} domande</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>{quiz.xpReward} XP</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    variant={isCompleted ? 'outline' : 'default'}
                    disabled={isCompleted}
                  >
                    {isCompleted ? (
                      <>
                        <Trophy className="h-4 w-4 mr-2" />
                        Completato
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Inizia Quiz
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        </div>
      </div>

      {/* Empty state / Coming soon */}
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-2">
            Altri quiz in arrivo!
          </h3>
          <p className="text-purple-700 dark:text-purple-300 max-w-md mx-auto">
            I tuoi Professori stanno preparando nuovi quiz per ogni materia.
            Studia con loro e i quiz si adatteranno ai tuoi progressi!
          </p>
        </CardContent>
      </Card>

      {/* Maestro selection dialog */}
      <ToolMaestroSelectionDialog
        isOpen={showMaestroDialog}
        toolType="quiz"
        onConfirm={handleMaestroConfirm}
        onClose={() => setShowMaestroDialog(false)}
      />
    </div>
  );
}
