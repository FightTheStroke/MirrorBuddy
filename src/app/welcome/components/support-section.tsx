'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Heart, Lightbulb } from 'lucide-react';

interface SupportMember {
  id: string;
  name: string;
  role: 'coach' | 'buddy';
  description: string;
  avatar: string;
}

// Featured support team members (not all 10, just representatives)
const SUPPORT_TEAM: SupportMember[] = [
  {
    id: 'melissa',
    name: 'Melissa',
    role: 'coach',
    description: 'Ti aiuta a sviluppare il tuo metodo di studio',
    avatar: '/avatars/melissa.jpg',
  },
  {
    id: 'roberto',
    name: 'Roberto',
    role: 'coach',
    description: 'Coach che ti guida verso l\'autonomia',
    avatar: '/avatars/roberto.webp',
  },
  {
    id: 'enea',
    name: 'Enea',
    role: 'buddy',
    description: 'Compagno allegro che sa tirare su il morale',
    avatar: '/avatars/enea.webp',
  },
  {
    id: 'mario',
    name: 'Mario',
    role: 'buddy',
    description: 'Peer buddy che ti supporta emotivamente',
    avatar: '/avatars/mario.jpg',
  },
];

/**
 * Support Section
 *
 * SECONDARY FEATURE: Coaches and Buddies provide support
 * - Coaches: Help develop study methods and autonomy
 * - Buddies: Provide peer emotional support
 *
 * This section is intentionally smaller and less prominent than
 * the Maestri section, as it's a support feature, not the main value.
 */
export function SupportSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="w-full max-w-4xl mx-auto px-4 mb-12"
      aria-labelledby="support-heading"
    >
      {/* Section Header - Smaller, less prominent */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="text-center mb-8"
      >
        <h2
          id="support-heading"
          className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3"
        >
          Sempre al tuo fianco
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          5 Coach e 5 Buddy ti supportano nel metodo di studio e ti motivano ogni giorno
        </p>
      </motion.div>

      {/* Support Team Grid - Smaller cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {SUPPORT_TEAM.map((member, i) => {
          const isCoach = member.role === 'coach';
          const roleColor = isCoach
            ? 'from-pink-400 to-rose-500'
            : 'from-amber-400 to-orange-500';
          const roleLabel = isCoach ? 'Coach' : 'Buddy';
          const RoleIcon = isCoach ? Lightbulb : Heart;

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 1.0 + i * 0.1,
                type: 'spring',
                stiffness: 200,
              }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700"
            >
              {/* Small role badge */}
              <div className="flex items-center justify-center gap-1 mb-2">
                <RoleIcon className="w-3 h-3" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {roleLabel}
                </span>
              </div>

              {/* Avatar - Smaller than maestri */}
              <div
                className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br ${roleColor} p-0.5`}
              >
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 overflow-hidden">
                  <Image
                    src={member.avatar}
                    alt={`${member.name} - ${roleLabel}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Info */}
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                {member.name}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {member.description}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="text-center text-sm text-gray-500 dark:text-gray-400"
      >
        <p>
          <strong className="text-pink-600 dark:text-pink-400">5 Coach</strong> per il metodo di studio •{' '}
          <strong className="text-orange-600 dark:text-orange-400">5 Buddy</strong> per il supporto emotivo
        </p>
      </motion.div>
    </motion.section>
  );
}
