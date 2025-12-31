'use client';

/**
 * OnboardingTranscript - Collapsible conversation transcript during onboarding
 *
 * Shows the voice conversation between Melissa and the student.
 * Can be collapsed to save space while still being accessible.
 *
 * Related: #61 Onboarding Voice Integration
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MessageCircle, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';

export interface OnboardingTranscriptProps {
  className?: string;
  defaultExpanded?: boolean;
}

export function OnboardingTranscript({
  className,
  defaultExpanded = false,
}: OnboardingTranscriptProps) {
  const { voiceTranscript, voiceSessionActive } = useOnboardingStore();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [voiceTranscript, isExpanded]);

  // Auto-expand when voice session starts and there are messages
  useEffect(() => {
    if (voiceSessionActive && voiceTranscript.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [voiceSessionActive, voiceTranscript.length, isExpanded]);

  // Don't render if no transcript
  if (voiceTranscript.length === 0 && !voiceSessionActive) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden',
        className
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="onboarding-transcript"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-pink-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Conversazione con Melissa
          </span>
          {voiceTranscript.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({voiceTranscript.length} {voiceTranscript.length === 1 ? 'messaggio' : 'messaggi'})
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Transcript content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="onboarding-transcript"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              ref={scrollRef}
              className="max-h-48 overflow-y-auto p-3 pt-0 space-y-2"
            >
              {voiceTranscript.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  La conversazione apparirà qui...
                </p>
              ) : (
                voiceTranscript.map((entry, index) => (
                  <motion.div
                    key={`${entry.timestamp}-${index}`}
                    initial={{ opacity: 0, x: entry.role === 'user' ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'flex gap-2',
                      entry.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {entry.role === 'assistant' && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                        <Volume2 className="w-3 h-3 text-pink-500" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                        entry.role === 'user'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                          : 'bg-pink-100 dark:bg-pink-900/30 text-pink-900 dark:text-pink-100'
                      )}
                    >
                      {entry.text}
                    </div>
                    {entry.role === 'user' && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xs text-blue-500 font-medium">Tu</span>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live indicator when voice is active */}
      {voiceSessionActive && (
        <div className="flex items-center justify-center gap-2 py-2 border-t border-gray-100 dark:border-gray-700 bg-pink-50 dark:bg-pink-900/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
          </span>
          <span className="text-xs text-pink-600 dark:text-pink-400">
            Conversazione in corso
          </span>
        </div>
      )}
    </motion.div>
  );
}
