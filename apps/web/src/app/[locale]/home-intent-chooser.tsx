'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { BookOpenCheck, Map, Target, Lock, ArrowLeft } from 'lucide-react';
import type { ToolType, Subject, Maestro } from '@/types';
import { getAllSubjects, getMaestriBySubject } from '@/data/maestri';
import { useTierFeatures } from '@/hooks/useTierFeatures';
import { cn } from '@/lib/utils';
import type { Intent, MaestroSessionMode } from './types';

export interface IntentStart {
  intent: Intent;
  maestro: Maestro;
  mode: MaestroSessionMode;
  requestedToolType?: ToolType;
  contextMessage: string;
}

interface HomeIntentChooserProps {
  userName?: string;
  onStart: (start: IntentStart) => void;
}

interface IntentCardConfig {
  intent: Intent;
  icon: typeof BookOpenCheck;
  /** Tier feature key that unlocks this intent; undefined = always available */
  featureKey?: 'mindMaps' | 'quizzes';
}

const INTENT_CARDS: IntentCardConfig[] = [
  { intent: 'homework', icon: BookOpenCheck },
  { intent: 'study', icon: Map, featureKey: 'mindMaps' },
  { intent: 'quizMe', icon: Target, featureKey: 'quizzes' },
];

/**
 * Intention-based home screen.
 *
 * Step 1: three intent cards (homework / study / quizMe). The student always
 * sees a single "Buddy" avatar — never the 26-Maestri grid. Study and quizMe
 * are gated on tier features (mindMaps / quizzes) so Trial users only get
 * homework help.
 *
 * Step 2 (study / quizMe only): a subject picker. The Maestro is selected
 * AUTOMATICALLY from the chosen subject (getMaestriBySubject) — the student
 * never picks a professor by hand.
 */
export function HomeIntentChooser({ userName, onStart }: HomeIntentChooserProps) {
  const t = useTranslations('home');
  const { hasFeature, isLoading } = useTierFeatures();
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // Subjects that actually have at least one Maestro backing them.
  const subjects = useMemo<Subject[]>(
    () => getAllSubjects().filter((s) => getMaestriBySubject(s).length > 0),
    [],
  );

  // Move focus to the step heading only when the step CHANGES (intent→subject),
  // never on initial mount — auto-focusing on load disrupts Tab order and
  // is against WCAG 2.1 guideline 3.2 (no focus change on user input).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [pendingIntent]);

  const isIntentUnlocked = (card: IntentCardConfig): boolean =>
    !card.featureKey || hasFeature(card.featureKey);

  const handleIntentSelect = (card: IntentCardConfig) => {
    if (!isIntentUnlocked(card)) return;
    if (card.intent === 'homework') {
      startHomework();
      return;
    }
    setPendingIntent(card.intent);
  };

  const startHomework = () => {
    // Homework intent: no subject step. Buddy is the generalist coordinator;
    // the actual subject Maestro is resolved server-side from the message.
    // We open a chat with the first Maestro as the host avatar and a
    // homework-framed context message; tools (pdf/webcam/formula/search) live
    // in the session toolbar.
    const host = getMaestriBySubject('mathematics')[0] ?? getAllMaestriHost();
    if (!host) return;
    onStart({
      intent: 'homework',
      maestro: host,
      mode: 'chat',
      contextMessage: t('intent.homework.contextMessage'),
    });
  };

  const handleSubjectSelect = (subject: Subject) => {
    const maestro = getMaestriBySubject(subject)[0];
    if (!maestro || !pendingIntent) return;

    if (pendingIntent === 'study') {
      onStart({
        intent: 'study',
        maestro,
        mode: 'chat',
        requestedToolType: 'mindmap',
        contextMessage: t('intent.study.contextMessage'),
      });
    } else {
      onStart({
        intent: 'quizMe',
        maestro,
        mode: 'chat',
        requestedToolType: 'quiz',
        contextMessage: t('intent.quizMe.contextMessage'),
      });
    }
  };

  // --- Step 2: subject picker -------------------------------------------------
  if (pendingIntent) {
    return (
      <motion.section
        key="subject-step"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        aria-labelledby="intent-subject-heading"
      >
        <button
          type="button"
          onClick={() => setPendingIntent(null)}
          className="inline-flex items-center gap-2 mb-6 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed rounded-lg px-2 py-1"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('intent.back')}
        </button>
        <h2
          id="intent-subject-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-slate-900 dark:text-white mb-2 outline-none"
        >
          {t(`intent.${pendingIntent}.subjectTitle`)}
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{t('intent.subjectSubtitle')}</p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 list-none p-0">
          {subjects.map((subject) => (
            <li key={subject}>
              <button
                type="button"
                onClick={() => handleSubjectSelect(subject)}
                className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium text-left hover:border-accent-themed hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed"
              >
                {t(`subjects.${subject}`)}
              </button>
            </li>
          ))}
        </ul>
      </motion.section>
    );
  }

  // --- Step 1: intent cards ---------------------------------------------------
  return (
    <motion.section
      key="intent-step"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      aria-labelledby="intent-heading"
    >
      <h2
        id="intent-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 outline-none"
      >
        {userName ? t('intent.greetingNamed', { name: userName }) : t('intent.greeting')}
      </h2>
      <p className="text-slate-600 dark:text-slate-300 mb-8 text-lg">{t('intent.question')}</p>

      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 list-none p-0">
        {INTENT_CARDS.map((card) => {
          const unlocked = isIntentUnlocked(card);
          const Icon = card.icon;
          return (
            <li key={card.intent}>
              <button
                type="button"
                disabled={!unlocked || isLoading}
                aria-disabled={!unlocked || isLoading}
                onClick={() => handleIntentSelect(card)}
                className={cn(
                  'group relative w-full h-full min-h-[140px] text-left rounded-2xl border p-6 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed',
                  unlocked
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-accent-themed hover:shadow-xl cursor-pointer'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-dashed border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-70',
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-12 h-12 rounded-xl',
                      unlocked
                        ? 'bg-accent-themed/10 text-accent-themed'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  {!unlocked && (
                    <Lock
                      className="h-5 w-5 text-slate-400 dark:text-slate-500"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {t(`intent.${card.intent}.title`)}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {t(`intent.${card.intent}.subtitle`)}
                </p>
                {!unlocked && (
                  <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400">
                    {t('intent.lockedHint')}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

/**
 * Fallback host avatar resolver: returns the first available Maestro of any
 * subject. Used only if the preferred host subject has no Maestro.
 */
function getAllMaestriHost(): Maestro | undefined {
  const subjects = getAllSubjects();
  for (const subject of subjects) {
    const maestro = getMaestriBySubject(subject)[0];
    if (maestro) return maestro;
  }
  return undefined;
}
