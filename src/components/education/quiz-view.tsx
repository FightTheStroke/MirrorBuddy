'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Brain, Play, Trophy, Target, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Quiz } from './quiz';
import { useProgressStore } from '@/lib/stores/app-store';
import type { Quiz as QuizType, QuizResult, Subject } from '@/types';
import { subjectNames, subjectIcons, subjectColors } from '@/data';
import { cn } from '@/lib/utils';

// Sample quizzes for demonstration
const sampleQuizzes: QuizType[] = [
  {
    id: 'math-basics',
    title: 'Matematica - Le basi',
    subject: 'mathematics' as Subject,
    questions: [
      {
        id: '1',
        text: 'Quanto fa 7 x 8?',
        type: 'multiple_choice',
        options: ['54', '56', '58', '64'],
        correctAnswer: 1,
        hints: ['Pensa: 7 x 8 = 7 x (10-2)'],
        explanation: '7 x 8 = 56. Un trucco: 56 = 7 x 8, i numeri sono in ordine: 5, 6, 7, 8!',
        difficulty: 1,
        subject: 'mathematics',
        topic: 'Moltiplicazioni',
      },
      {
        id: '2',
        text: 'Quale di queste frazioni è equivalente a 1/2?',
        type: 'multiple_choice',
        options: ['2/3', '3/6', '4/6', '5/8'],
        correctAnswer: 1,
        hints: ['Moltiplica numeratore e denominatore per lo stesso numero'],
        explanation: '3/6 = 1/2 perché 3 ÷ 3 = 1 e 6 ÷ 3 = 2',
        difficulty: 2,
        subject: 'mathematics',
        topic: 'Frazioni',
      },
      {
        id: '3',
        text: 'Il teorema di Pitagora dice che in un triangolo rettangolo...',
        type: 'multiple_choice',
        options: [
          'La somma degli angoli è 180°',
          'L\'ipotenusa al quadrato è uguale alla somma dei quadrati dei cateti',
          'I lati sono tutti uguali',
          'L\'area è base per altezza diviso 2',
        ],
        correctAnswer: 1,
        hints: ['Pensa a un triangolo con un angolo retto (90°)'],
        explanation: 'a² + b² = c², dove c è l\'ipotenusa e a, b sono i cateti',
        difficulty: 3,
        subject: 'mathematics',
        topic: 'Geometria',
      },
    ],
    masteryThreshold: 70,
    xpReward: 50,
  },
  {
    id: 'history-rome',
    title: 'Storia - Roma Antica',
    subject: 'history' as Subject,
    questions: [
      {
        id: '1',
        text: 'In che anno fu fondata Roma secondo la tradizione?',
        type: 'multiple_choice',
        options: ['853 a.C.', '753 a.C.', '653 a.C.', '553 a.C.'],
        correctAnswer: 1,
        hints: ['Il numero contiene due cifre uguali'],
        explanation: 'Roma fu fondata tradizionalmente il 21 aprile 753 a.C. da Romolo',
        difficulty: 2,
        subject: 'history',
        topic: 'Roma Antica',
      },
      {
        id: '2',
        text: 'Chi era Giulio Cesare?',
        type: 'multiple_choice',
        options: [
          'Un imperatore romano',
          'Un generale e dittatore romano',
          'Un filosofo greco',
          'Un re di Roma',
        ],
        correctAnswer: 1,
        hints: ['Fu assassinato alle Idi di Marzo'],
        explanation: 'Giulio Cesare fu un generale e dittatore romano, assassinato nel 44 a.C.',
        difficulty: 1,
        subject: 'history',
        topic: 'Roma Antica',
      },
    ],
    masteryThreshold: 70,
    xpReward: 40,
  },
  {
    id: 'science-body',
    title: 'Scienze - Il Corpo Umano',
    subject: 'biology' as Subject,
    questions: [
      {
        id: '1',
        text: 'Quante ossa ha il corpo umano adulto?',
        type: 'multiple_choice',
        options: ['106', '206', '306', '406'],
        correctAnswer: 1,
        hints: ['Il numero inizia con 2'],
        explanation: 'Il corpo umano adulto ha 206 ossa. I neonati ne hanno circa 270, ma alcune si fondono durante la crescita.',
        difficulty: 2,
        subject: 'biology',
        topic: 'Anatomia',
      },
      {
        id: '2',
        text: 'Qual è l\'organo più grande del corpo umano?',
        type: 'multiple_choice',
        options: ['Il fegato', 'Il cervello', 'La pelle', 'I polmoni'],
        correctAnswer: 2,
        hints: ['Lo puoi vedere e toccare ogni giorno'],
        explanation: 'La pelle è l\'organo più grande, con una superficie di circa 2 metri quadrati!',
        difficulty: 1,
        subject: 'biology',
        topic: 'Anatomia',
      },
    ],
    masteryThreshold: 70,
    xpReward: 40,
  },
];

export function QuizView() {
  const router = useRouter();
  const [selectedQuiz, setSelectedQuiz] = useState<QuizType | null>(null);
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  const { addXP } = useProgressStore();

  const handleQuizComplete = (result: QuizResult) => {
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
          <Button onClick={() => router.push('/conversation?tool=quiz')}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Crea Quiz con un Maestro
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <Trophy className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-purple-700 dark:text-purple-300">
              {completedQuizzes.length} completati
            </span>
          </div>
        </div>
      </div>

      {/* Quiz Grid */}
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
            I tuoi Maestri stanno preparando nuovi quiz per ogni materia.
            Studia con loro e i quiz si adatteranno ai tuoi progressi!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
