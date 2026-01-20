/**
 * @file page-header.tsx
 * @brief Standard page header component with Icon + Title pattern
 * Used for consistent headers across Astuccio, Zaino, Calendario, Progressi, Impostazioni
 */

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  rightContent?: React.ReactNode;
  className?: string;
}

export function PageHeader({ icon: Icon, title, rightContent, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('mb-6', className)}
    >
      <div className={cn(
        'flex items-center',
        rightContent ? 'justify-between' : 'justify-start'
      )}>
        <div className="flex items-center gap-3">
          <Icon className="w-8 h-8 text-primary" aria-hidden="true" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            {title}
          </h1>
        </div>
        {rightContent && (
          <div className="flex items-center gap-2">
            {rightContent}
          </div>
        )}
      </div>
    </motion.div>
  );
}
