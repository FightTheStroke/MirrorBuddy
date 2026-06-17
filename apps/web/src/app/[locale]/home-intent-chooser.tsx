'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { BookOpenCheck, Map, Target, Lock, ArrowLeft, Volume2 } from 'lucide-react';
import type { ToolType, Subject, Maestro } from '@/types';
import { getAllSubjects, getMaestriBySubject } from '@/data/maestri';
import { useTierFeatures } from '@/hooks/useTierFeatures';
import { useTTS } from '@/components/accessibility';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Intent, MaestroSessionMode } from './types';

export interface IntentStart {
  intent: Intent;
  maestro: Maestro;
  mode: MaestroSessionMode;
  requestedToolType?: ToolType;
  contextMessage: string;
  /** Subject chosen by the child (undefined for the "I don't know" host). */
  subject?: Subject;
  /** Localized subject label for the handoff banner (UX-01). */
  subjectLabel?: string;
}

/**
 * Per-subject emoji (UX-04). Recognition-before-reading helps dyslexic readers
 * scan the picker visually instead of decoding ~18 text labels. Emoji are
 * locale-neutral so they live here, not in the i18n catalog. Covers every
 * Subject key; child-excluded ones (supercazzola/economics/…) are listed for
 * completeness but never render.
 */
const SUBJECT_EMOJI: Partial<Record<Subject, string>> = {
  mathematics: '🔢',
  physics: '🧲',
  chemistry: '⚗️',
  biology: '🌱',
  history: '🏛️',
  geography: '🗺️',
  italian: '📖',
  english: '🇬🇧',
  spanish: '🇪🇸',
  french: '🇫🇷',
  german: '🇩🇪',
  art: '🎨',
  music: '🎵',
  civics: '⚖️',
  computerScience: '💻',
  health: '❤️',
  storytelling: '📚',
  sport: '⚽',
  economics: '💰',
  philosophy: '🤔',
  internationalLaw: '🌍',
  supercazzola: '🎭',
};

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
 * Subjects hidden from the child-facing picker. These are either adult/abstract
 * (economics, philosophy, international law) or a joke subject (supercazzola) and
 * have no place in a 6–14 learning flow. The Maestri behind them stay in the data
 * layer; we only remove the *choice* from the child.
 */
const EXCLUDED_CHILD_SUBJECTS: ReadonlySet<Subject> = new Set<Subject>([
  'supercazzola',
  'internationalLaw',
  'economics',
  'philosophy',
]);

/**
 * Child-facing subjects grouped into a few labelled areas (DEC-03). The focus-
 * group pilots found a flat 18-item list overwhelming for EVERY DSA profile —
 * too much to scan for dyslexia/low-vision ("tante tutte insieme"), too many Tab
 * stops for keyboard users ("14 Tab per Matematica"), and the implicit English-
 * key order ("Inglese" before "Francese") unpredictable. Grouping into a few
 * areas + sorting each by the LOCALIZED label gives structure and predictability
 * while keeping every subject one tap away. Areas are ordered by rough homework
 * frequency. Edit this map to re-balance the groups.
 */
const SUBJECT_AREA_ORDER = ['numbersScience', 'languages', 'worldHistory', 'artBody'] as const;
type SubjectArea = (typeof SUBJECT_AREA_ORDER)[number];
const SUBJECT_AREA: Partial<Record<Subject, SubjectArea>> = {
  mathematics: 'numbersScience',
  physics: 'numbersScience',
  chemistry: 'numbersScience',
  biology: 'numbersScience',
  computerScience: 'numbersScience',
  italian: 'languages',
  english: 'languages',
  french: 'languages',
  german: 'languages',
  spanish: 'languages',
  storytelling: 'languages',
  history: 'worldHistory',
  geography: 'worldHistory',
  civics: 'worldHistory',
  health: 'worldHistory',
  art: 'artBody',
  music: 'artBody',
  sport: 'artBody',
};

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
  const { speak, enabled: ttsEnabled } = useTTS();
  const [pendingIntent, setPendingIntent] = useState<Intent | null>(null);
  // UX-03: tapping a tier-locked card opens a child-friendly "ask a grown-up"
  // dialog instead of doing nothing. Holds the locked intent's title so the
  // dialog can name what the child tried to open.
  const [lockedDialogTitle, setLockedDialogTitle] = useState<string | null>(null);
  // WCAG 2.4.3: the lock dialog is opened programmatically (no Radix Trigger),
  // so Radix has no anchor to restore focus to on close and focus would drop
  // to <body>, stranding keyboard users. Remember WHICH locked card opened the
  // dialog so onCloseAutoFocus can put focus back on it.
  const lockedIntentRef = useRef<Intent | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // Subjects that have at least one Maestro AND are appropriate for a child,
  // grouped into labelled areas and sorted by localized label (DEC-03). Every
  // eligible subject lands in exactly one area (unmapped → artBody fallback).
  const subjectGroups = useMemo(() => {
    const eligible = getAllSubjects().filter(
      (s) => getMaestriBySubject(s).length > 0 && !EXCLUDED_CHILD_SUBJECTS.has(s),
    );
    return SUBJECT_AREA_ORDER.map((area) => ({
      area,
      subjects: eligible
        .filter((s) => (SUBJECT_AREA[s] ?? 'artBody') === area)
        .sort((a, b) => t(`subjects.${a}`).localeCompare(t(`subjects.${b}`))),
    })).filter((group) => group.subjects.length > 0);
  }, [t]);

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
    if (!isIntentUnlocked(card)) {
      // UX-03: locked cards no longer fall silently inert. Show a child-first
      // dialog ("ask a grown-up") — no prices, no Stripe, no adult copy.
      lockedIntentRef.current = card.intent;
      setLockedDialogTitle(t(`intent.${card.intent}.title`));
      return;
    }
    // Every intent now goes through the subject step. This removes the old
    // "homework always opened the maths Maestro" bug: the child tells us the
    // subject (or picks "I don't know") and we open the right Maestro.
    setPendingIntent(card.intent);
  };

  const openSession = (intent: Intent, maestro: Maestro, subject?: Subject) => {
    const requestedToolType: ToolType | undefined =
      intent === 'study' ? 'mindmap' : intent === 'quizMe' ? 'quiz' : undefined;
    onStart({
      intent,
      maestro,
      mode: 'chat',
      requestedToolType,
      contextMessage: t(`intent.${intent}.contextMessage`),
      subject,
      subjectLabel: subject ? t(`subjects.${subject}`) : undefined,
    });
  };

  const handleSubjectSelect = (subject: Subject) => {
    const maestro = getMaestriBySubject(subject)[0];
    if (!maestro || !pendingIntent) return;
    openSession(pendingIntent, maestro, subject);
  };

  // Homework only: the child taps "I don't know / a bit of everything". We open
  // a generalist host so they can just show their homework and get help.
  const handleAnySubject = () => {
    const host = getAllMaestriHost();
    if (!host || pendingIntent !== 'homework') return;
    openSession('homework', host);
  };

  // UX-02: read a card aloud on demand. Only wired when the child's profile has
  // TTS enabled; never auto-fires and never moves focus (stopPropagation keeps
  // the parent card from activating, preserving the keyboard path).
  const handleSpeak = (text: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    speak(text);
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
        {pendingIntent === 'homework' && (
          <button
            type="button"
            data-testid="intent-subject-any"
            onClick={handleAnySubject}
            className="w-full min-h-[56px] mb-4 px-5 py-4 rounded-2xl bg-accent-themed/10 border-2 border-accent-themed/30 text-slate-800 dark:text-slate-100 font-semibold text-left hover:border-accent-themed hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed"
          >
            {t('intent.subjectAny')}
          </button>
        )}
        {subjectGroups.map((group) => (
          <section
            key={group.area}
            aria-labelledby={`subject-area-${group.area}`}
            className="mb-5 last:mb-0"
          >
            <h3
              id={`subject-area-${group.area}`}
              className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2"
            >
              {t(`intent.areas.${group.area}`)}
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 list-none p-0">
              {group.subjects.map((subject) => {
                const subjectLabel = t(`subjects.${subject}`);
                const emoji = SUBJECT_EMOJI[subject];
                return (
                  <li key={subject} className="relative">
                    <button
                      type="button"
                      data-testid={`subject-${subject}`}
                      onClick={() => handleSubjectSelect(subject)}
                      className={cn(
                        'w-full min-h-[44px] px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium text-left hover:border-accent-themed hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed flex items-center gap-2',
                        ttsEnabled && 'pr-12',
                      )}
                    >
                      {emoji && (
                        <span className="text-xl leading-none shrink-0" aria-hidden="true">
                          {emoji}
                        </span>
                      )}
                      {/* A11Y-13: min-w-0 + break-words let long names (e.g. "Educazione
                      Civica") wrap onto a second line instead of clipping at the cell
                      edge or running under the TTS speaker button at 130%+ text. */}
                      <span className="min-w-0 break-words">{subjectLabel}</span>
                    </button>
                    {ttsEnabled && (
                      <button
                        type="button"
                        data-testid={`tts-subject-${subject}`}
                        onClick={handleSpeak(subjectLabel)}
                        aria-label={t('intent.ttsCardLabel', { label: subjectLabel })}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-lg text-accent-themed hover:bg-accent-themed/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed"
                      >
                        <Volume2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
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
          const hintId = `intent-locked-hint-${card.intent}`;
          const cardTitle = t(`intent.${card.intent}.title`);
          const cardSubtitle = t(`intent.${card.intent}.subtitle`);
          return (
            <li key={card.intent} className="relative">
              <button
                type="button"
                data-testid={`intent-card-${card.intent}`}
                // While tier is loading, the card is genuinely inert (nothing to
                // announce yet) → real `disabled`. Once we KNOW it is tier-locked,
                // keep it focusable with `aria-disabled` so screen-reader and
                // keyboard users can Tab to it and hear WHY it is locked
                // (WCAG 2.1 — discoverable state). The click handler still refuses
                // to start a session for locked cards.
                disabled={isLoading}
                aria-disabled={!unlocked || isLoading}
                aria-describedby={!unlocked ? hintId : undefined}
                onClick={() => handleIntentSelect(card)}
                className={cn(
                  'group relative w-full h-full min-h-[160px] text-left rounded-2xl border p-6 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed',
                  unlocked
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-accent-themed hover:shadow-xl cursor-pointer'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-dashed border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-70',
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-16 h-16 rounded-2xl',
                      unlocked
                        ? 'bg-accent-themed/10 text-accent-themed'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
                    )}
                  >
                    <Icon className="h-9 w-9" aria-hidden="true" />
                  </span>
                  {!unlocked && (
                    <Lock
                      className="h-5 w-5 text-slate-400 dark:text-slate-500"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {cardTitle}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{cardSubtitle}</p>
                {!unlocked && (
                  <p
                    id={hintId}
                    className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400"
                  >
                    {t('intent.lockedHint')}
                  </p>
                )}
              </button>
              {ttsEnabled && (
                <button
                  type="button"
                  data-testid={`tts-intent-${card.intent}`}
                  onClick={handleSpeak(`${cardTitle}. ${cardSubtitle}`)}
                  aria-label={t('intent.ttsCardLabel', { label: cardTitle })}
                  className="absolute right-3 bottom-3 inline-flex items-center justify-center w-11 h-11 rounded-xl text-accent-themed bg-white/80 dark:bg-slate-900/60 hover:bg-accent-themed/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed"
                >
                  <Volume2 className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* UX-03: child-friendly tier-lock dialog (no prices, no Stripe). */}
      <Dialog
        open={lockedDialogTitle !== null}
        onOpenChange={(open) => !open && setLockedDialogTitle(null)}
      >
        <DialogContent
          data-testid="intent-locked-dialog"
          className="max-w-md text-center sm:rounded-2xl"
          onCloseAutoFocus={(e) => {
            // Return focus to the locked card that opened the dialog (see
            // lockedIntentRef above) instead of letting it fall to <body>.
            const intent = lockedIntentRef.current;
            if (!intent) return;
            const card = document.querySelector<HTMLElement>(
              `[data-testid="intent-card-${intent}"]`,
            );
            if (card) {
              e.preventDefault();
              card.focus();
            }
          }}
        >
          <DialogHeader className="items-center text-center sm:text-center">
            <span className="text-5xl mb-2" aria-hidden="true">
              🔒
            </span>
            <DialogTitle className="text-xl">{t('intent.lockedDialog.title')}</DialogTitle>
            <DialogDescription className="text-base text-slate-600 dark:text-slate-300">
              {t('intent.lockedDialog.body')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            {ttsEnabled && (
              <Button
                type="button"
                variant="outline"
                data-testid="intent-locked-dialog-tts"
                onClick={() =>
                  speak(`${t('intent.lockedDialog.title')}. ${t('intent.lockedDialog.body')}`)
                }
                className="min-h-[44px] gap-2"
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" />
                {t('intent.lockedDialog.listen')}
              </Button>
            )}
            <Button
              type="button"
              data-testid="intent-locked-dialog-close"
              onClick={() => setLockedDialogTitle(null)}
              className="min-h-[44px]"
            >
              {t('intent.lockedDialog.gotIt')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
