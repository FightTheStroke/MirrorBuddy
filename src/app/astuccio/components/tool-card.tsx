'use client';

/**
 * Tool Card Component
 * Reusable card for educational tools in Astuccio
 * Features: icon, title, description, hover effects, keyboard accessible
 */

import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
  isActive?: boolean;
}

const COLOR_MAP = {
  blue: {
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
    border: 'border-blue-200 dark:border-blue-800',
    hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-600',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    description: 'text-blue-700 dark:text-blue-300',
  },
  green: {
    gradient: 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
    border: 'border-green-200 dark:border-green-800',
    hoverBorder: 'hover:border-green-400 dark:hover:border-green-600',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-900 dark:text-green-100',
    description: 'text-green-700 dark:text-green-300',
  },
  purple: {
    gradient: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
    border: 'border-purple-200 dark:border-purple-800',
    hoverBorder: 'hover:border-purple-400 dark:hover:border-purple-600',
    icon: 'text-purple-600 dark:text-purple-400',
    title: 'text-purple-900 dark:text-purple-100',
    description: 'text-purple-700 dark:text-purple-300',
  },
  orange: {
    gradient: 'from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900',
    border: 'border-orange-200 dark:border-orange-800',
    hoverBorder: 'hover:border-orange-400 dark:hover:border-orange-600',
    icon: 'text-orange-600 dark:text-orange-400',
    title: 'text-orange-900 dark:text-orange-100',
    description: 'text-orange-700 dark:text-orange-300',
  },
  cyan: {
    gradient: 'from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900',
    border: 'border-cyan-200 dark:border-cyan-800',
    hoverBorder: 'hover:border-cyan-400 dark:hover:border-cyan-600',
    icon: 'text-cyan-600 dark:text-cyan-400',
    title: 'text-cyan-900 dark:text-cyan-100',
    description: 'text-cyan-700 dark:text-cyan-300',
  },
  indigo: {
    gradient: 'from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900',
    border: 'border-indigo-200 dark:border-indigo-800',
    hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-600',
    icon: 'text-indigo-600 dark:text-indigo-400',
    title: 'text-indigo-900 dark:text-indigo-100',
    description: 'text-indigo-700 dark:text-indigo-300',
  },
  teal: {
    gradient: 'from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900',
    border: 'border-teal-200 dark:border-teal-800',
    hoverBorder: 'hover:border-teal-400 dark:hover:border-teal-600',
    icon: 'text-teal-600 dark:text-teal-400',
    title: 'text-teal-900 dark:text-teal-100',
    description: 'text-teal-700 dark:text-teal-300',
  },
  pink: {
    gradient: 'from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900',
    border: 'border-pink-200 dark:border-pink-800',
    hoverBorder: 'hover:border-pink-400 dark:hover:border-pink-600',
    icon: 'text-pink-600 dark:text-pink-400',
    title: 'text-pink-900 dark:text-pink-100',
    description: 'text-pink-700 dark:text-pink-300',
  },
  // Additional colors for all 13 tools
  amber: {
    gradient: 'from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900',
    border: 'border-amber-200 dark:border-amber-800',
    hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-600',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-900 dark:text-amber-100',
    description: 'text-amber-700 dark:text-amber-300',
  },
  rose: {
    gradient: 'from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900',
    border: 'border-rose-200 dark:border-rose-800',
    hoverBorder: 'hover:border-rose-400 dark:hover:border-rose-600',
    icon: 'text-rose-600 dark:text-rose-400',
    title: 'text-rose-900 dark:text-rose-100',
    description: 'text-rose-700 dark:text-rose-300',
  },
  emerald: {
    gradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900',
    border: 'border-emerald-200 dark:border-emerald-800',
    hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-600',
    icon: 'text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-900 dark:text-emerald-100',
    description: 'text-emerald-700 dark:text-emerald-300',
  },
  violet: {
    gradient: 'from-violet-50 to-violet-100 dark:from-violet-950 dark:to-violet-900',
    border: 'border-violet-200 dark:border-violet-800',
    hoverBorder: 'hover:border-violet-400 dark:hover:border-violet-600',
    icon: 'text-violet-600 dark:text-violet-400',
    title: 'text-violet-900 dark:text-violet-100',
    description: 'text-violet-700 dark:text-violet-300',
  },
  sky: {
    gradient: 'from-sky-50 to-sky-100 dark:from-sky-950 dark:to-sky-900',
    border: 'border-sky-200 dark:border-sky-800',
    hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-600',
    icon: 'text-sky-600 dark:text-sky-400',
    title: 'text-sky-900 dark:text-sky-100',
    description: 'text-sky-700 dark:text-sky-300',
  },
};

export function ToolCard({
  title,
  description,
  icon: Icon,
  color,
  onClick,
  isActive = false,
}: ToolCardProps) {
  const colors = COLOR_MAP[color as keyof typeof COLOR_MAP] || COLOR_MAP.blue;

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'relative p-6 rounded-2xl border-2 transition-all text-left',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'transform hover:scale-105 hover:shadow-xl',
        'bg-gradient-to-br',
        colors.gradient,
        colors.border,
        colors.hoverBorder,
        isActive && 'ring-2 ring-primary scale-105 shadow-xl'
      )}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      aria-label={`${title}: ${description}`}
      role="button"
      tabIndex={0}
    >
      {/* Icon */}
      <div className="mb-4">
        <Icon className={cn('w-10 h-10', colors.icon)} aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className={cn('text-lg font-bold mb-2', colors.title)}>
        {title}
      </h3>

      {/* Description */}
      <p className={cn('text-sm leading-relaxed', colors.description)}>
        {description}
      </p>

      {/* Active indicator */}
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-3 h-3 bg-primary rounded-full"
          aria-label="Strumento selezionato"
        />
      )}
    </motion.button>
  );
}
