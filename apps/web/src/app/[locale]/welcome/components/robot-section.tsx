'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Eye, Ear, MessageCircle, Sparkles } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import type { LucideIcon } from 'lucide-react';

interface SenseConfig {
  key: string;
  icon: LucideIcon;
  iconColor: string;
}

/**
 * Vendor site, per locale. The English edition lives at the root, and
 * reachy-mini.org — the address we used to link — resolves in DNS but never
 * answers, so a visitor clicking it just waited for a timeout.
 */
const VENDOR_URL_BY_LOCALE: Record<string, string> = {
  en: 'https://reachymini.net/',
  it: 'https://reachymini.net/it/',
  fr: 'https://reachymini.net/fr/',
  de: 'https://reachymini.net/de/',
  es: 'https://reachymini.net/es/',
};

const VENDOR_URL_FALLBACK = 'https://reachymini.net/';

/** The four capabilities that make the robot a body rather than a screen. */
const SENSES: SenseConfig[] = [
  { key: 'eyes', icon: Eye, iconColor: 'text-blue-600 dark:text-blue-400' },
  { key: 'ears', icon: Ear, iconColor: 'text-purple-600 dark:text-purple-400' },
  {
    key: 'voice',
    icon: MessageCircle,
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    key: 'movement',
    icon: Sparkles,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
];

/**
 * Robot Section for the MirrorBuddy Welcome Page.
 *
 * Introduces the optional Reachy Mini embodiment. Deliberately framed as an
 * addition, never a requirement: MirrorBuddy is complete without it, and a
 * family arriving here should not feel they are missing a paid prerequisite.
 */
export function RobotSection() {
  const t = useTranslations('welcome.robot');
  const locale = useLocale();
  const prefersReducedMotion = useReducedMotion();

  const vendorUrl = VENDOR_URL_BY_LOCALE[locale] ?? VENDOR_URL_FALLBACK;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="w-full max-w-4xl mx-auto px-4 mb-12"
      aria-labelledby="robot-section-heading"
    >
      <div className="rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-100 dark:border-gray-700 shadow-sm p-6 md:p-8">
        <div className="text-center mb-6">
          <h2
            id="robot-section-heading"
            className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3"
          >
            {t('heading')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500">
              {t('headingHighlight')}
            </span>
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('subheading')}
          </p>
        </div>

        <div className="mb-6 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 max-w-2xl mx-auto">
          {/*
            Self-hosted rather than hotlinked: the vendor GIF is 6.8MB and would
            hand every visitor's IP to a third party. Re-encoded, it is 79KB.
            autoPlay is withheld when the visitor asks for reduced motion, which
            leaves a still frame instead of a perpetual loop.
          */}
          <video
            className="w-full h-auto block"
            poster="/robot/reachy-poster.webp"
            aria-label={t('videoAlt')}
            autoPlay={!prefersReducedMotion}
            loop
            muted
            playsInline
            preload="none"
          >
            <source src="/robot/reachy.webm" type="video/webm" />
            <source src="/robot/reachy.mp4" type="video/mp4" />
          </video>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 list-none">
          {SENSES.map((sense, i) => {
            const Icon = sense.icon;
            return (
              <motion.li
                key={sense.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + i * 0.05 }}
                className="text-center"
              >
                <div className="w-10 h-10 mx-auto rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mb-2">
                  <Icon className={`w-5 h-5 ${sense.iconColor}`} aria-hidden="true" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {t(`senses.${sense.key}.label`)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t(`senses.${sense.key}.description`)}
                </p>
              </motion.li>
            );
          })}
        </ul>

        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-5">
          {t('optionalNote')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://github.com/FightTheStroke/MirrorBuddy/blob/main/docs/reachy-mini-robot.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {t('learnMore')}
          </a>
          <a
            href={vendorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {t('aboutRobot')}
          </a>
        </div>
      </div>
    </motion.section>
  );
}
