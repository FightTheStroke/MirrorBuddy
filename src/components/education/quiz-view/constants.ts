/**
 * Constants for QuizView
 */

import type { Quiz } from '@/types';

// Sample quizzes for demonstration
export const sampleQuizzes: Quiz[] = [
  {
    id: 'math-basics',
    title: 'Matematica - Le basi',
    subject: 'mathematics',
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
    ],
    masteryThreshold: 70,
    xpReward: 20,
  },
];
