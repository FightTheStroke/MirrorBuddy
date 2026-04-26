/**
 * Maestro Picture-in-Picture component
 */

'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ActiveToolState } from '@/lib/hooks/use-tool-stream';
import { BuildingAnimation } from './building-animation';
import { useTranslations } from "next-intl";

interface MaestroPipProps {
  maestroName: string;
  maestroAvatar?: string;
  activeTool: ActiveToolState | null;
  eventsReceived: number;
  onHide: () => void;
}

export function MaestroPip({
  maestroName,
  maestroAvatar,
  activeTool,
  eventsReceived,
  onHide,
}: MaestroPipProps) {
  const t = useTranslations("tools");

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className="hidden md:block absolute top-0 right-0 w-[20%] h-full border-l border-slate-800 bg-slate-900/95"
    >
        {/* PiP Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {maestroAvatar ? (
              <Image
                src={maestroAvatar}
                alt={maestroName}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                {maestroName.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-medium text-white">{maestroName}</p>
              <p className="text-xs text-slate-400">{t("staCostruendo")}</p>
            </div>
          </div>
        </div>

        {/* Building animation */}
        <div className="p-4">
          <div className="aspect-square rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden">
            {activeTool?.status === 'building' && (
              <BuildingAnimation toolType={activeTool.type} />
            )}
            {(!activeTool || activeTool.status === 'completed') && (
              <div className="text-center p-4">
                <p className="text-sm text-slate-500">
                  {activeTool
                    ? 'Strumento completato!'
                    : 'In attesa...'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 space-y-1">
            <p>{t("eventiRicevuti")} {eventsReceived}</p>
            {activeTool && (
              <p>{t("chunks")} {activeTool.chunks.length}</p>
            )}
          </div>
        </div>

        {/* Hide PiP button */}
        <button
          onClick={onHide}
          className="absolute top-2 right-2 p-1 rounded hover:bg-slate-800 transition-colors"
          aria-label={t("nascondiPip")}
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </motion.div>
  );
}
