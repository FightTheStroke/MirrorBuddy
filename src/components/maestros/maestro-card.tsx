'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { subjectNames, subjectIcons } from '@/data';
import type { Maestro } from '@/types';

interface MaestroCardProps {
  maestro: Maestro;
  onSelect: (maestro: Maestro) => void;
  isSelected?: boolean;
}

export function MaestroCard({
  maestro,
  onSelect,
  isSelected = false,
}: MaestroCardProps) {
  return (
    <motion.button
      onClick={() => onSelect(maestro)}
      className={cn(
        'relative w-full p-6 rounded-2xl text-center transition-all duration-300',
        'bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/80',
        'border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md',
        'hover:border-opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2',
        'focus:ring-offset-white dark:focus:ring-offset-slate-900',
        isSelected && 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
      )}
      style={{
        borderColor: isSelected ? maestro.color : undefined,
        ['--ring-color' as string]: maestro.color,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Avatar with colored ring */}
      <div className="relative mx-auto mb-4 w-24 h-24">
        {/* Colored ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${maestro.color}40, ${maestro.color}80)`,
            padding: '3px',
          }}
        >
          <div className="w-full h-full rounded-full bg-white dark:bg-slate-900" />
        </div>

        {/* Avatar image */}
        <div
          className="absolute inset-1 rounded-full overflow-hidden"
          style={{
            boxShadow: `0 0 0 2px ${maestro.color}`
          }}
        >
          <Image
            src={maestro.avatar}
            alt={maestro.name}
            width={88}
            height={88}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Glow effect on hover */}
        <motion.div
          className="absolute inset-0 rounded-full opacity-0"
          style={{
            background: `radial-gradient(circle, ${maestro.color}30 0%, transparent 70%)`,
          }}
          whileHover={{ opacity: 1 }}
        />
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {maestro.name}
      </h3>

      {/* Subject badge */}
      <div className="flex justify-center mb-2">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${maestro.color}20`,
            color: maestro.color,
            border: `1px solid ${maestro.color}40`,
          }}
        >
          <span>{subjectIcons[maestro.subject]}</span>
          {subjectNames[maestro.subject]}
        </span>
      </div>

      {/* Specialty */}
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {maestro.specialty}
      </p>
    </motion.button>
  );
}
