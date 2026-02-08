/**
 * Tool header component
 */

'use client';

import { Maximize2, Minimize2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { ActiveToolState } from '@/lib/hooks/use-tool-stream';
import { renderToolIcon, toolNames } from '../constants';

interface ToolHeaderProps {
  tool: ActiveToolState;
  statusInfo: {
    icon: React.ReactNode;
    text: string;
    color: string;
    bg: string;
  } | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onCancel?: () => void;
}

export function ToolHeader({
  tool,
  statusInfo,
  isFullscreen,
  onToggleFullscreen,
  onCancel,
}: ToolHeaderProps) {
  const t = useTranslations('common');

  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
          {renderToolIcon(tool.type)}
        </div>
        <div>
          <h3 className="font-semibold text-white">{tool.title}</h3>
          <p className="text-sm text-slate-400">
            {toolNames[tool.type]}
            {tool.subject && ` • ${tool.subject}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Status badge */}
        {statusInfo && (
          <span
            className={cn(
              'px-3 py-1 rounded-full text-sm flex items-center gap-1.5',
              statusInfo.color,
              statusInfo.bg,
            )}
          >
            {statusInfo.icon}
            {statusInfo.text}
          </span>
        )}

        {/* Controls */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label={isFullscreen ? 'Esci da fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5 text-slate-400" />
          ) : (
            <Maximize2 className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {onCancel && tool.status === 'building' && (
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-red-900/50 transition-colors"
            aria-label={t('cancel')}
          >
            <X className="w-5 h-5 text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
}
