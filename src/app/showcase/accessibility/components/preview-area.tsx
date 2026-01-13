/**
 * Preview area component showing sample text and quiz
 */

'use client';

import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ActiveSettings } from '../types';
import { SAMPLE_TEXT } from '../profiles';

interface PreviewAreaProps {
  settings: ActiveSettings;
  isSpeaking: boolean;
  onSpeak: () => void;
  textStyles: React.CSSProperties;
  getContainerClasses: () => string;
}

export function PreviewArea({
  settings,
  isSpeaking,
  onSpeak,
  textStyles,
  getContainerClasses,
}: PreviewAreaProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Sample Text */}
      <motion.div
        layout={!settings.reducedMotion}
        className={getContainerClasses()}
        style={textStyles}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className={cn(
              'text-xl font-bold',
              settings.highContrast ? 'text-white' : 'text-white/90'
            )}
          >
            {SAMPLE_TEXT.title}
          </h2>

          {settings.ttsEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSpeak}
              className={cn(
                'gap-1',
                isSpeaking ? 'text-green-400' : 'text-white/60 hover:text-white'
              )}
            >
              {isSpeaking ? (
                <>
                  <Pause className="w-4 h-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Leggi
                </>
              )}
            </Button>
          )}
        </div>

        <p
          className={cn(
            'whitespace-pre-line',
            settings.highContrast ? 'text-white/90' : 'text-white/70'
          )}
        >
          {SAMPLE_TEXT.content}
        </p>
      </motion.div>

      {/* Sample Quiz */}
      <motion.div
        layout={!settings.reducedMotion}
        className={getContainerClasses()}
        style={textStyles}
      >
        <h2
          className={cn(
            'text-xl font-bold mb-4',
            settings.highContrast ? 'text-white' : 'text-white/90'
          )}
        >
          Quiz di Esempio
        </h2>

        <p
          className={cn(
            'mb-4',
            settings.highContrast ? 'text-white/90' : 'text-white/70'
          )}
        >
          {SAMPLE_TEXT.quiz}
        </p>

        <div className="space-y-2">
          {SAMPLE_TEXT.options.map((option, index) => (
            <button
              key={option}
              className={cn(
                'w-full p-3 rounded-lg text-left transition-all',
                settings.highContrast
                  ? 'bg-white/10 hover:bg-white/20 border border-white/30 text-white'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/80',
                'focus:outline-none focus:ring-2 focus:ring-purple-500'
              )}
              tabIndex={settings.keyboardNavigation ? 0 : -1}
            >
              <span className="font-medium mr-2">
                {String.fromCharCode(65 + index)}.
              </span>
              {option}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
