'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Maestro } from '@/types';

interface MessageLoadingProps {
  maestro: Maestro;
  highContrast: boolean;
}

export function MessageLoading({ maestro, highContrast }: MessageLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div
        className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
        style={{ boxShadow: `0 0 0 2px ${maestro.color}` }}
      >
        <Image
          src={maestro.avatar}
          alt={maestro.name}
          width={32}
          height={32}
          className="w-full h-full object-cover"
        />
      </div>
      <div
        className={cn(
          'rounded-2xl px-4 py-3 flex items-center gap-2',
          highContrast
            ? 'bg-gray-900 border border-gray-700'
            : 'bg-slate-100 dark:bg-slate-800'
        )}
      >
        <Loader2
          className={cn(
            'w-4 h-4 animate-spin',
            highContrast ? 'text-yellow-400' : 'text-blue-500'
          )}
        />
        <span
          className={cn(
            'text-sm',
            highContrast ? 'text-gray-400' : 'text-slate-500'
          )}
        >
          {maestro.name} sta pensando...
        </span>
      </div>
    </motion.div>
  );
}
