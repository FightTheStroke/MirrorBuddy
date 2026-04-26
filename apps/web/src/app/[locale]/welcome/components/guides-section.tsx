'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

const GUIDE_IDS = [
  'melissa',
  'enea',
  'euclide',
  'curie',
  'leonardo',
  'shakespeare',
  'feynman',
  'erodoto',
] as const;

interface GuideConfig {
  avatar: string;
  color: string;
  category: 'coach' | 'buddy' | 'maestro';
  name: string;
}

const GUIDE_CONFIG: Record<string, GuideConfig> = {
  melissa: {
    name: 'Melissa',
    avatar: '/avatars/melissa.webp',
    color: 'from-pink-400 to-rose-500',
    category: 'coach',
  },
  enea: {
    name: 'Enea',
    avatar: '/avatars/enea.webp',
    color: 'from-amber-400 to-orange-500',
    category: 'buddy',
  },
  euclide: {
    name: 'Euclide',
    avatar: '/maestri/euclide.webp',
    color: 'from-blue-400 to-cyan-500',
    category: 'maestro',
  },
  curie: {
    name: 'Marie Curie',
    avatar: '/maestri/curie.webp',
    color: 'from-purple-400 to-pink-500',
    category: 'maestro',
  },
  leonardo: {
    name: 'Leonardo da Vinci',
    avatar: '/maestri/leonardo.webp',
    color: 'from-indigo-400 to-purple-500',
    category: 'maestro',
  },
  shakespeare: {
    name: 'Shakespeare',
    avatar: '/maestri/shakespeare.webp',
    color: 'from-emerald-400 to-teal-500',
    category: 'maestro',
  },
  feynman: {
    name: 'Richard Feynman',
    avatar: '/maestri/feynman.webp',
    color: 'from-cyan-400 to-blue-500',
    category: 'maestro',
  },
  erodoto: {
    name: 'Erodoto',
    avatar: '/maestri/erodoto.webp',
    color: 'from-orange-400 to-red-500',
    category: 'maestro',
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  coach: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  buddy: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  maestro: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
};

/**
 * Guides Section for MirrorBuddy Welcome Page
 *
 * Introduces the AI characters:
 * - Coaches (learning support)
 * - Buddies (emotional support)
 * - Maestri (subject experts)
 */
export function GuidesSection() {
  const t = useTranslations('welcome.guides');

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      coach: t('categoryCoach'),
      buddy: t('categoryBuddy'),
      maestro: t('categoryMaestro'),
    };
    return map[cat] ?? cat;
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="w-full max-w-4xl mx-auto px-4 mb-12"
      aria-labelledby="guides-heading"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center mb-8"
      >
        <h2
          id="guides-heading"
          className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3"
        >
          {t('heading')}{' '}
          <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {t('headingHighlight')}
          </span>
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">{t('subtitle')}</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {GUIDE_IDS.map((id, i) => {
          const guide = GUIDE_CONFIG[id];
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.7 + i * 0.1,
                type: 'spring',
                stiffness: 200,
              }}
              className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <div className="mb-3">
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${CATEGORY_COLORS[guide.category]}`}
                >
                  {getCategoryLabel(guide.category)}
                </span>
              </div>
              <div
                className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br ${guide.color} p-1 group-hover:scale-110 transition-transform duration-300`}
              >
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 overflow-hidden">
                  <Image
                    src={guide.avatar}
                    alt={`${guide.name} - ${t(`items.${id}.role`)}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{guide.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
                {t(`items.${id}.role`)}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {t(`items.${id}.description`)}
              </p>
            </motion.div>
          );
        })}
      </div>

      <GuidesFooter t={t} />
    </motion.section>
  );
}

function GuidesFooter({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 }}
      className="text-center mt-8 p-6 bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 dark:from-pink-900/20 dark:via-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-pink-200 dark:border-pink-800"
    >
      <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('teamTitle')}</p>
      <div className="flex flex-col md:flex-row gap-4 justify-center items-center text-sm">
        <div>
          <strong className="text-pink-600 dark:text-pink-400">{t('coachCount')}</strong>
          <span className="text-gray-600 dark:text-gray-400"> {t('coachDesc')}</span>
        </div>
        <span className="hidden md:inline text-gray-400">&bull;</span>
        <div>
          <strong className="text-orange-600 dark:text-orange-400">{t('buddyCount')}</strong>
          <span className="text-gray-600 dark:text-gray-400"> {t('buddyDesc')}</span>
        </div>
        <span className="hidden md:inline text-gray-400">&bull;</span>
        <div>
          <strong className="text-blue-600 dark:text-blue-400">{t('maestriCount')}</strong>
          <span className="text-gray-600 dark:text-gray-400"> {t('maestriDesc')}</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{t('teaser')}</p>
    </motion.div>
  );
}
