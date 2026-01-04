'use client';

import { useMemo } from 'react';
import { Zap, Flame, Trophy, Rocket, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useProgressStore } from '@/lib/stores/progress-store';
import { getMaestroById, subjectNames } from '@/data';
import type { Maestro } from '@/types';

interface PersonalizedSuggestionProps {
  onMaestroSelect?: (maestro: Maestro) => void;
}

function isSessionRecent(endedAt: Date | undefined): boolean {
  if (!endedAt) return false;
  const now = new Date();
  return now.getTime() - new Date(endedAt).getTime() < 24 * 60 * 60 * 1000;
}

export function PersonalizedSuggestion({ onMaestroSelect }: PersonalizedSuggestionProps) {
  const { sessionHistory, streak, masteries, level, mirrorBucks } = useProgressStore();

  const suggestion = useMemo(() => {
    const lastSession = sessionHistory.find((s) => s.endedAt);
    const isRecentSession = lastSession && isSessionRecent(lastSession.endedAt);
    const weakSubjects = masteries
      .filter((m) => m.percentage < 50)
      .sort((a, b) => a.percentage - b.percentage);

    let suggestedMaestro: Maestro | undefined;
    let greeting = 'Pronto a spaccare?';
    let cta = 'Scegli il tuo maestro';

    if (isRecentSession && lastSession) {
      suggestedMaestro = getMaestroById(lastSession.maestroId);
      if (suggestedMaestro) {
        greeting = `${suggestedMaestro.name} ti aspetta!`;
        cta = 'Riprendi';
      }
    } else if (weakSubjects.length > 0) {
      const maestri = ['euclide', 'feynman', 'galileo', 'curie', 'darwin', 'erodoto',
        'humboldt', 'manzoni', 'shakespeare', 'leonardo', 'mozart', 'cicerone',
        'smith', 'lovelace', 'ippocrate', 'socrate'];
      for (const id of maestri) {
        const m = getMaestroById(id);
        if (m && m.subject === weakSubjects[0].subject) {
          suggestedMaestro = m;
          greeting = `Potenzia ${subjectNames[m.subject]}!`;
          cta = `Studia con ${m.name}`;
          break;
        }
      }
    }

    return { suggestedMaestro, greeting, cta };
  }, [sessionHistory, masteries]);

  const handleClick = () => {
    if (suggestion.suggestedMaestro && onMaestroSelect) {
      onMaestroSelect(suggestion.suggestedMaestro);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      {/* Left: Greeting + CTA */}
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg"
        >
          <Rocket className="w-6 h-6" />
        </motion.div>
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold text-slate-900 dark:text-white"
          >
            {suggestion.greeting}
          </motion.h1>
          {suggestion.suggestedMaestro && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              onClick={handleClick}
              className="flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline mt-0.5"
            >
              {suggestion.cta}
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>
        {suggestion.suggestedMaestro && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="hidden sm:block"
          >
            <button
              onClick={handleClick}
              className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-slate-900 hover:ring-4 transition-all"
            >
              <Image
                src={suggestion.suggestedMaestro.avatar}
                alt={suggestion.suggestedMaestro.name}
                fill
                className="object-cover"
              />
            </button>
          </motion.div>
        )}
      </div>

      {/* Right: Stats badges */}
      <div className="flex items-center gap-2">
        {streak.current > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold shadow-md"
          >
            <Flame className="w-4 h-4" />
            {streak.current}
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold shadow-md"
        >
          <Zap className="w-4 h-4" />
          {mirrorBucks.toLocaleString()}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold shadow-md"
        >
          <Trophy className="w-4 h-4" />
          Lv.{level}
        </motion.div>
      </div>
    </div>
  );
}
