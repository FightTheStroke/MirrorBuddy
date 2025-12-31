'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Brain, HelpCircle, Play, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subjectNames, subjectIcons } from '@/data';
import { Button } from '@/components/ui/button';
import type { Maestro } from '@/types';
import type { ToolType } from '@/types/tools';

interface MaestroCardProps {
  maestro: Maestro;
  onSelect: (maestro: Maestro) => void;
  onToolRequest?: (maestro: Maestro, tool: ToolType) => void;
  isSelected?: boolean;
  showToolButtons?: boolean;
}

export function MaestroCard({
  maestro,
  onSelect,
  onToolRequest,
  isSelected = false,
  showToolButtons = false,
}: MaestroCardProps) {
  // Handle card click (not on tool buttons)
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on tool buttons
    if ((e.target as HTMLElement).closest('[data-tool-button]')) return;
    onSelect(maestro);
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(maestro);
    }
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative w-full p-6 rounded-2xl text-center transition-all duration-300 cursor-pointer',
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

      {/* Tool buttons - Issue #35 */}
      {showToolButtons && onToolRequest && (
        <div className="flex flex-wrap justify-center gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50" data-tool-button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onToolRequest(maestro, 'mindmap')}
            aria-label={`Crea mappa mentale con ${maestro.name}`}
          >
            <Brain className="w-3 h-3 mr-1" />
            Mappa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onToolRequest(maestro, 'quiz')}
            aria-label={`Crea quiz con ${maestro.name}`}
          >
            <HelpCircle className="w-3 h-3 mr-1" />
            Quiz
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onToolRequest(maestro, 'demo')}
            aria-label={`Crea demo con ${maestro.name}`}
          >
            <Play className="w-3 h-3 mr-1" />
            Demo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onToolRequest(maestro, 'webcam')}
            aria-label={`Scatta foto per ${maestro.name}`}
          >
            <Camera className="w-3 h-3 mr-1" />
            Foto
          </Button>
        </div>
      )}
    </motion.div>
  );
}
