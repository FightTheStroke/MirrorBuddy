'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Lightbulb, ArrowRight, Trophy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Quiz as QuizType, QuizResult } from '@/types';

interface QuizProps {
  quiz: QuizType;
  onComplete: (result: QuizResult) => void;
  onClose: () => void;
}

export function Quiz({ quiz, onComplete, onClose }: QuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef(0);

  // Set start time on mount (avoid impure Date.now() during render)
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const currentQuestion = quiz.questions[currentIndex];
  const progress = ((currentIndex + (showResult ? 1 : 0)) / quiz.questions.length) * 100;

  const handleSelectAnswer = useCallback((index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  }, [showResult]);

  const handleSubmit = useCallback(() => {
    if (selectedAnswer === null) return;
    setShowResult(true);

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }
  }, [selectedAnswer, currentQuestion.correctAnswer]);

  const handleNext = useCallback(() => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowHint(false);
    } else {
      // Quiz complete
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      const score = Math.round((correctCount / quiz.questions.length) * 100);
      const xpEarned = Math.round(quiz.xpReward * (score / 100) * (1 - hintsUsed * 0.1));

      const result: QuizResult = {
        quizId: quiz.id,
        score,
        totalQuestions: quiz.questions.length,
        correctAnswers: correctCount,
        timeSpent,
        masteryAchieved: score >= quiz.masteryThreshold,
        xpEarned: Math.max(0, xpEarned),
        completedAt: new Date(),
      };

      setIsComplete(true);
      onComplete(result);
    }
  }, [currentIndex, quiz, correctCount, hintsUsed, onComplete]);

  const handleShowHint = useCallback(() => {
    if (!showHint && currentQuestion.hints.length > 0) {
      setShowHint(true);
      setHintsUsed(prev => prev + 1);
    }
  }, [showHint, currentQuestion.hints.length]);

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

  if (isComplete) {
    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passed = score >= quiz.masteryThreshold;

    return (
      <Card className="w-full">
        <CardContent className="p-6 sm:p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <div className={cn(
              'w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6',
              passed ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
            )}>
              <Trophy className="w-12 h-12" />
            </div>
          </motion.div>

          <h2 className="text-2xl font-bold mb-2">
            {passed ? 'Ottimo lavoro!' : 'Continua a esercitarti!'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Hai risposto correttamente a {correctCount} domande su {quiz.questions.length}
          </p>

          <div className="text-5xl font-bold mb-6" style={{ color: passed ? '#22c55e' : '#f59e0b' }}>
            {score}%
          </div>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={onClose}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Riprova
            </Button>
            <Button onClick={onClose}>
              Continua
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-500">
            Domanda {currentIndex + 1} di {quiz.questions.length}
          </span>
          <span className="text-sm font-medium text-blue-600">
            {correctCount} corrette
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-xl font-semibold mb-6">{currentQuestion.text}</h3>

            <div className="space-y-3 mb-6">
              {currentQuestion.options?.map((option, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={showResult}
                  className={cn(
                    'w-full p-4 text-left rounded-xl border-2 transition-all',
                    selectedAnswer === index
                      ? showResult
                        ? isCorrect
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : showResult && index === currentQuestion.correctAnswer
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
                    showResult && 'cursor-default'
                  )}
                  whileHover={!showResult ? { scale: 1.01 } : {}}
                  whileTap={!showResult ? { scale: 0.99 } : {}}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showResult && index === currentQuestion.correctAnswer && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {showResult && selectedAnswer === index && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Hint section */}
            {!showResult && currentQuestion.hints.length > 0 && (
              <div className="mb-6">
                {showHint ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5" />
                      <p className="text-amber-800 dark:text-amber-200">{currentQuestion.hints[0]}</p>
                    </div>
                  </motion.div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={handleShowHint}>
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Mostra suggerimento
                  </Button>
                )}
              </div>
            )}

            {/* Explanation (after answer) */}
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6"
              >
                <p className="text-slate-700 dark:text-slate-300">
                  {currentQuestion.explanation}
                </p>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              {!showResult ? (
                <Button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null}
                >
                  Verifica
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  {currentIndex < quiz.questions.length - 1 ? (
                    <>
                      Prossima
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    'Vedi risultati'
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
