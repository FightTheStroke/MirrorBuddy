'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subjectIcons } from '@/data';
import { QuoteRotator } from './quote-rotator';
import type { Maestro } from '@/types';

interface MaestroCardProps {
  maestro: Maestro;
  onSelect: (maestro: Maestro) => void;
  isSelected?: boolean;
}

export function MaestroCard({ maestro, onSelect, isSelected = false }: MaestroCardProps) {
  return (
    <motion.button
      onClick={() => onSelect(maestro)}
      className={cn(
        'relative w-full p-4 rounded-xl text-left transition-all duration-200',
        'bg-white dark:bg-slate-800/80',
        'border border-slate-200 dark:border-slate-700/50',
        'hover:shadow-lg hover:border-transparent',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        isSelected && 'ring-2 ring-offset-2'
      )}
      style={{
        ['--tw-ring-color' as string]: maestro.color,
        ['--tw-ring-offset-color' as string]: 'var(--background)',
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      aria-label={`Studia con ${maestro.name}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar - compact 56x56 */}
        <div
          className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ring-2"
          style={{ ['--tw-ring-color' as string]: maestro.color }}
        >
          <Image
            src={maestro.avatar}
            alt={maestro.name}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
              {maestro.name}
            </h3>
            <span className="text-base flex-shrink-0">{subjectIcons[maestro.subject]}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 line-clamp-1">
            {maestro.specialty}
          </p>
          <QuoteRotator maestroId={maestro.id} className="text-xs" compact />
        </div>

        {/* Play indicator */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: `${maestro.color}20`, color: maestro.color }}
        >
          <Play className="w-4 h-4 ml-0.5" />
        </div>
      </div>

      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 pointer-events-none"
        style={{ boxShadow: `0 8px 24px ${maestro.color}25` }}
        whileHover={{ opacity: 1 }}
      />
    </motion.button>
  );
}
