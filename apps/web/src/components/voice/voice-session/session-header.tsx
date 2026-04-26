'use client';

import Image from 'next/image';
import { PhoneOff, Clock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Maestro } from '@/types';
import { formatTime } from './helpers';
import { useTranslations } from 'next-intl';

interface SessionHeaderProps {
  maestro: Maestro;
  isConnected: boolean;
  elapsedSeconds: number;
  level: number;
  xp: number;
  xpProgress: number;
  onClose: () => void;
}

export function SessionHeader({
  maestro,
  isConnected,
  elapsedSeconds,
  level,
  xp,
  xpProgress,
  onClose,
}: SessionHeaderProps) {
  const t = useTranslations('voice');

  return (
    <div className="p-6 border-b border-slate-700/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/20"
            style={{ backgroundColor: maestro.color }}
          >
            <Image
              src={maestro.avatar}
              alt={maestro.displayName}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{maestro.displayName}</h2>
            <p className="text-sm text-slate-400">{maestro.specialty}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-slate-400 hover:text-white hover:bg-slate-700"
          aria-label={t('sessionHeader.closeSessionAriaLabel')}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      {isConnected && (
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-mono text-slate-200">{formatTime(elapsedSeconds)}</span>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">
                {t('sessionHeader.level')}
                {level}
              </span>
            </div>
            <div className="flex-1 h-2 bg-slate-800/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, xpProgress))}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">{xp} XP</span>
          </div>
        </div>
      )}
    </div>
  );
}
