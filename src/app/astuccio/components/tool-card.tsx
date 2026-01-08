'use client';

/**
 * Tool Card Component
 * Reusable card for educational tools in Astuccio
 * Harmonized design: uniform styling, outline icons
 */

import { type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  isActive?: boolean;
}

export function ToolCard({
  title,
  description,
  icon: Icon,
  onClick,
  isActive = false,
}: ToolCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'relative p-6 rounded-2xl border text-left bg-card text-card-foreground',
        'shadow-sm hover:shadow-lg hover:border-primary/30 cursor-pointer',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isActive && 'ring-2 ring-primary shadow-lg'
      )}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      aria-label={`${title}: ${description}`}
      tabIndex={0}
    >
      <div className="mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

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
