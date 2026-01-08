'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { GraduationCap, Sparkles } from 'lucide-react';

interface MaestroShowcase {
  id: string;
  name: string;
  subject: string;
  tagline: string;
  avatar: string;
  color: string;
}

// Featured professori - the greatest minds in history
const FEATURED_MAESTRI: MaestroShowcase[] = [
  {
    id: 'euclide',
    name: 'Euclide',
    subject: 'Matematica',
    tagline: 'Il padre della geometria',
    avatar: '/maestri/euclide.png',
    color: 'from-blue-400 to-cyan-500',
  },
  {
    id: 'feynman',
    name: 'Richard Feynman',
    subject: 'Fisica',
    tagline: 'Premio Nobel, professore di chiarezza',
    avatar: '/maestri/feynman.png',
    color: 'from-cyan-400 to-blue-500',
  },
  {
    id: 'curie',
    name: 'Marie Curie',
    subject: 'Chimica',
    tagline: 'Due premi Nobel, pioniera della scienza',
    avatar: '/maestri/curie.png',
    color: 'from-purple-400 to-pink-500',
  },
  {
    id: 'darwin',
    name: 'Charles Darwin',
    subject: 'Scienze',
    tagline: 'Rivoluzionò la biologia',
    avatar: '/maestri/darwin.png',
    color: 'from-green-400 to-emerald-500',
  },
  {
    id: 'leonardo',
    name: 'Leonardo da Vinci',
    subject: 'Arte',
    tagline: 'Genio del Rinascimento',
    avatar: '/maestri/leonardo.png',
    color: 'from-indigo-400 to-purple-500',
  },
  {
    id: 'shakespeare',
    name: 'William Shakespeare',
    subject: 'Inglese',
    tagline: 'Il più grande drammaturgo',
    avatar: '/maestri/shakespeare.png',
    color: 'from-emerald-400 to-teal-500',
  },
  {
    id: 'socrate',
    name: 'Socrate',
    subject: 'Filosofia',
    tagline: 'Il padre della filosofia occidentale',
    avatar: '/maestri/socrate.png',
    color: 'from-amber-400 to-orange-500',
  },
  {
    id: 'erodoto',
    name: 'Erodoto',
    subject: 'Storia',
    tagline: 'Il padre della storia',
    avatar: '/maestri/erodoto.png',
    color: 'from-orange-400 to-red-500',
  },
];

/**
 * Professori Showcase Section
 *
 * THE PRIMARY VALUE PROPOSITION of MirrorBuddy:
 * Learn WITH the greatest minds in history, not just ABOUT them.
 *
 * This section showcases 8 featured professori out of 18 total,
 * emphasizing the revolutionary concept of learning directly
 * from historical figures.
 */
export function MaestriShowcaseSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="w-full max-w-6xl mx-auto px-4 mb-16"
      aria-labelledby="maestri-heading"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full mb-4">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            Il Cuore di MirrorBuddy
          </span>
        </div>

        <h2
          id="maestri-heading"
          className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
        >
          Impara{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
            CON i Grandi Professori
          </span>
        </h2>

        <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-3">
          Non leggere <em>su</em> Euclide in un libro. Studia matematica <strong>con Euclide stesso</strong>.
        </p>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          18 menti straordinarie della storia diventano i tuoi professori personali.
        </p>
      </motion.div>

      {/* Professori Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {FEATURED_MAESTRI.map((maestro, i) => (
          <motion.div
            key={maestro.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: 0.6 + i * 0.1,
              type: 'spring',
              stiffness: 150,
              damping: 15,
            }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-lg border-2 border-gray-100 dark:border-gray-700"
          >
            {/* Avatar with gradient border */}
            <div
              className={`w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br ${maestro.color} p-1`}
            >
              <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 overflow-hidden">
                <Image
                  src={maestro.avatar}
                  alt={`${maestro.name} - Professore di ${maestro.subject}`}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Info */}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {maestro.name}
            </h3>
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
              {maestro.subject}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {maestro.tagline}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Additional Professori Teaser */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="text-center p-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            E altri 9 Maestri ti aspettano!
          </p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Galileo, Manzoni, Mozart, Smith, Humboldt, Ippocrate, Cicerone, Lovelace e Chris (Storytelling)
        </p>
      </motion.div>
    </motion.section>
  );
}
