'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface HeroSectionProps {
  userName?: string;
  isReturningUser: boolean;
}

/**
 * Hero Section for MirrorBuddy Welcome Page
 *
 * Displays:
 * - MirrorBuddy logo
 * - Personalized welcome message (new vs returning user)
 * - MirrorBuddy branding and value proposition
 *
 * Part of Wave 3: Welcome Experience Enhancement
 */
export function HeroSection({ userName, isReturningUser }: HeroSectionProps) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      {/* MirrorBuddy Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="mb-8"
      >
        <Image
          src="/logo-mirrorbuddy-full.png"
          alt="MirrorBuddy Logo"
          width={300}
          height={80}
          className="mx-auto"
          style={{ width: 'auto', height: 'auto' }}
          priority
        />
      </motion.div>

      {/* Welcome Text */}
      <div aria-live="polite" aria-atomic="true">
        {isReturningUser ? (
          <>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
            >
              Bentornato,{' '}
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                {userName}!
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl text-gray-700 dark:text-gray-200 mb-4 font-semibold"
            >
              Pronto per la tua prossima avventura di apprendimento?
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto"
            >
              I tuoi 17 Maestri storici - da Socrate a Einstein, da Leonardo a Marie Curie - ti aspettano per continuare il tuo viaggio di apprendimento.
            </motion.p>
          </>
        ) : (
          <>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
            >
              Benvenuto in{' '}
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                MirrorBuddy
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl text-gray-700 dark:text-gray-200 mb-4 font-semibold"
            >
              La scuola che vorrei: dove ogni studente trova il suo modo di imparare
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto space-y-4"
            >
              <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Impara <strong className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">CON i più grandi</strong>, non solo su di loro
              </p>
              <p className="text-base">
                Studia matematica <strong className="text-blue-600 dark:text-blue-400">con Euclide</strong>, fisica <strong className="text-purple-600 dark:text-purple-400">con Feynman</strong>, chimica <strong className="text-pink-600 dark:text-pink-400">con Marie Curie</strong>. 17 Maestri storici ti accompagnano personalmente.
              </p>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
