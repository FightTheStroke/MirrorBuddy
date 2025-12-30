'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileQuestion, Trophy, RotateCcw, Play, BookOpen } from 'lucide-react';
import { Quiz } from '@/components/education/quiz';
import type { Quiz as QuizType, QuizResult, Question } from '@/types';

// 10 static questions for showcase (3 history, 3 science, 2 math, 2 geography)
const showcaseQuestions: Question[] = [
  // HISTORY (3)
  {
    id: 'h1',
    text: 'In che anno e caduto il Muro di Berlino?',
    type: 'multiple_choice',
    options: ['1985', '1989', '1991', '1995'],
    correctAnswer: 1,
    hints: ['Era verso la fine degli anni 80', 'Fu un evento simbolico della fine della Guerra Fredda'],
    explanation: 'Il Muro di Berlino e caduto il 9 novembre 1989, segnando la fine della divisione tra Germania Est e Ovest.',
    difficulty: 2,
    subject: 'history',
    topic: 'Storia Contemporanea',
  },
  {
    id: 'h2',
    text: 'Chi era il comandante delle forze alleate durante lo sbarco in Normandia?',
    type: 'multiple_choice',
    options: ['Winston Churchill', 'Dwight D. Eisenhower', 'George Patton', 'Bernard Montgomery'],
    correctAnswer: 1,
    hints: ['Divenne presidente degli Stati Uniti dopo la guerra', 'Le sue iniziali erano "Ike"'],
    explanation: 'Dwight D. Eisenhower fu il Comandante Supremo delle Forze Alleate e pianifichò il D-Day del 6 giugno 1944.',
    difficulty: 3,
    subject: 'history',
    topic: 'Seconda Guerra Mondiale',
  },
  {
    id: 'h3',
    text: 'Quale civilta costrui le piramidi di Giza?',
    type: 'multiple_choice',
    options: ['Mesopotamica', 'Egizia', 'Romana', 'Greca'],
    correctAnswer: 1,
    hints: ['Si trova lungo il fiume Nilo', 'I faraoni governavano questa civilta'],
    explanation: 'Le piramidi di Giza furono costruite dagli antichi Egizi circa 4.500 anni fa come tombe per i faraoni.',
    difficulty: 1,
    subject: 'history',
    topic: 'Storia Antica',
  },

  // SCIENCE (3)
  {
    id: 's1',
    text: 'Qual e il simbolo chimico dell acqua?',
    type: 'multiple_choice',
    options: ['H2O', 'CO2', 'O2', 'NaCl'],
    correctAnswer: 0,
    hints: ['E composta da idrogeno e ossigeno', 'Contiene 2 atomi di idrogeno'],
    explanation: 'H2O rappresenta la molecola dell acqua: 2 atomi di idrogeno (H) e 1 di ossigeno (O).',
    difficulty: 1,
    subject: 'chemistry',
    topic: 'Chimica di Base',
  },
  {
    id: 's2',
    text: 'Quale organo del corpo umano produce l insulina?',
    type: 'multiple_choice',
    options: ['Fegato', 'Pancreas', 'Reni', 'Cuore'],
    correctAnswer: 1,
    hints: ['E un organo vicino allo stomaco', 'Regola i livelli di zucchero nel sangue'],
    explanation: 'Il pancreas produce insulina, un ormone che regola il metabolismo del glucosio nel sangue.',
    difficulty: 2,
    subject: 'biology',
    topic: 'Sistema Endocrino',
  },
  {
    id: 's3',
    text: 'Qual e la velocita della luce nel vuoto (approssimativa)?',
    type: 'multiple_choice',
    options: ['300.000 km/s', '150.000 km/s', '1.000.000 km/s', '30.000 km/s'],
    correctAnswer: 0,
    hints: ['E la velocita piu alta possibile nell universo', 'La luce del Sole impiega circa 8 minuti per raggiungerci'],
    explanation: 'La luce viaggia a circa 299.792 km/s nel vuoto, arrotondata spesso a 300.000 km/s.',
    difficulty: 2,
    subject: 'physics',
    topic: 'Ottica',
  },

  // MATH (2)
  {
    id: 'm1',
    text: 'Quanto fa 7 x 8?',
    type: 'multiple_choice',
    options: ['54', '56', '58', '64'],
    correctAnswer: 1,
    hints: ['E maggiore di 50', 'E un numero pari'],
    explanation: '7 x 8 = 56. Un modo per ricordarlo: "5, 6, 7, 8" → 56 = 7 x 8.',
    difficulty: 1,
    subject: 'mathematics',
    topic: 'Aritmetica',
  },
  {
    id: 'm2',
    text: 'Qual e il valore di π (pi greco) approssimato?',
    type: 'multiple_choice',
    options: ['2.14', '3.14', '4.14', '3.41'],
    correctAnswer: 1,
    hints: ['E il rapporto tra circonferenza e diametro', 'Inizia con 3.1...'],
    explanation: 'π (pi greco) vale circa 3.14159... ed e il rapporto tra la circonferenza e il diametro di un cerchio.',
    difficulty: 1,
    subject: 'mathematics',
    topic: 'Geometria',
  },

  // GEOGRAPHY (2)
  {
    id: 'g1',
    text: 'Qual e la capitale dell Australia?',
    type: 'multiple_choice',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
    correctAnswer: 2,
    hints: ['Non e la citta piu grande', 'Fu scelta come compromesso tra Sydney e Melbourne'],
    explanation: 'Canberra e la capitale dell Australia. Fu costruita appositamente come capitale tra le due citta rivali Sydney e Melbourne.',
    difficulty: 2,
    subject: 'geography',
    topic: 'Capitali del Mondo',
  },
  {
    id: 'g2',
    text: 'Quale fiume attraversa Roma?',
    type: 'multiple_choice',
    options: ['Po', 'Arno', 'Tevere', 'Adige'],
    correctAnswer: 2,
    hints: ['Ha un nome simile a "tiburtino"', 'Secondo la leggenda, Romolo e Remo vi furono abbandonati'],
    explanation: 'Il Tevere attraversa Roma ed e il terzo fiume italiano per lunghezza (405 km).',
    difficulty: 1,
    subject: 'geography',
    topic: 'Geografia Italiana',
  },
];

// Create quiz object
const showcaseQuiz: QuizType = {
  id: 'showcase-quiz',
  title: 'Quiz Showcase',
  subject: 'history', // Primary subject
  questions: showcaseQuestions,
  masteryThreshold: 70,
  xpReward: 100,
};

export default function QuizShowcasePage() {
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const handleComplete = useCallback((result: QuizResult) => {
    setQuizResult(result);
    setQuizStarted(false);
  }, []);

  const handleClose = useCallback(() => {
    setQuizStarted(false);
    setQuizResult(null);
  }, []);

  const handleRestart = useCallback(() => {
    setQuizResult(null);
    setQuizStarted(true);
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 p-3 rounded-xl bg-amber-500/20 text-amber-400 mb-4">
          <FileQuestion className="w-6 h-6" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Quiz{' '}
          <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            Interattivo
          </span>
        </h1>
        <p className="text-white/70 max-w-xl mx-auto">
          Testa le tue conoscenze con domande di Storia, Scienze, Matematica e Geografia.
          10 domande con feedback immediato e spiegazioni.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!quizStarted && !quizResult && (
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Quiz Info Card */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-xl bg-white/5">
                  <div className="text-2xl font-bold text-white">10</div>
                  <div className="text-xs text-white/60">Domande</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/5">
                  <div className="text-2xl font-bold text-white">4</div>
                  <div className="text-xs text-white/60">Materie</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/5">
                  <div className="text-2xl font-bold text-white">70%</div>
                  <div className="text-xs text-white/60">Soglia</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/5">
                  <div className="text-2xl font-bold text-amber-400">100</div>
                  <div className="text-xs text-white/60">XP Reward</div>
                </div>
              </div>

              {/* Subjects breakdown */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-sm">📜 Storia (3)</span>
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-sm">🧪 Scienze (3)</span>
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm">📐 Matematica (2)</span>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm">🌍 Geografia (2)</span>
              </div>

              {/* Start Button */}
              <button
                onClick={() => setQuizStarted(true)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Inizia il Quiz
              </button>
            </div>

            {/* Info */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-white mb-1">Come funziona?</h4>
                  <p className="text-sm text-white/70">
                    Rispondi alle domande, usa i suggerimenti se hai bisogno di aiuto.
                    Dopo ogni risposta vedrai la spiegazione completa.
                    Cerca di raggiungere almeno il 70% per superare il quiz!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {quizStarted && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Quiz
              quiz={showcaseQuiz}
              onComplete={handleComplete}
              onClose={handleClose}
            />
          </motion.div>
        )}

        {quizResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <div className={`
                w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6
                ${quizResult.masteryAchieved ? 'bg-green-500/20' : 'bg-amber-500/20'}
              `}>
                <Trophy className={`w-12 h-12 ${quizResult.masteryAchieved ? 'text-green-400' : 'text-amber-400'}`} />
              </div>
            </motion.div>

            <h2 className="text-2xl font-bold text-white mb-2">
              {quizResult.masteryAchieved ? 'Ottimo lavoro!' : 'Continua a esercitarti!'}
            </h2>

            <p className="text-white/60 mb-6">
              Hai risposto correttamente a {quizResult.correctAnswers} domande su {quizResult.totalQuestions}
            </p>

            <div className={`
              text-5xl font-bold mb-6
              ${quizResult.masteryAchieved ? 'text-green-400' : 'text-amber-400'}
            `}>
              {quizResult.score}%
            </div>

            <div className="flex items-center justify-center gap-2 mb-8 text-amber-400">
              <span className="text-lg font-medium">+{quizResult.xpEarned} XP</span>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleRestart}
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Riprova
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
              >
                Torna alla Home
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
