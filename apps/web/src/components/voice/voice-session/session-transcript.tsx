'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { Maestro } from '@/types';

interface TranscriptEntry {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionTranscriptProps {
  maestro: Maestro;
  transcript: TranscriptEntry[];
}

export function SessionTranscript({ maestro, transcript }: SessionTranscriptProps) {
  const t = useTranslations('voice');
  return (
    <div className="px-6 pb-4">
      <div
        className="max-h-48 overflow-y-auto space-y-3 p-4 bg-slate-800/50 rounded-xl"
        role="log"
        aria-live="polite"
        aria-label={t('transcriptLog')}
      >
        <AnimatePresence>
          {transcript.length === 0 ? (
            <p className="text-center text-slate-500 text-sm italic">{maestro.greeting}</p>
          ) : (
            transcript.map((entry, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-3 rounded-lg max-w-[85%]',
                  entry.role === 'user'
                    ? 'bg-accent-themed/30 ml-auto text-right'
                    : 'bg-slate-700/50 mr-auto',
                )}
              >
                <p className="text-sm text-slate-200">{entry.content}</p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
