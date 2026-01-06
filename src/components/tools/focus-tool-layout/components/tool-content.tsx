/**
 * @file tool-content.tsx
 * @brief Tool content component
 */

import { Loader2 } from 'lucide-react';
import { ToolPanel } from '../../tool-panel';
import type { ToolState } from '@/types/tools';

interface CharacterProps {
  name: string;
  avatar: string;
  color: string;
}

interface ToolContentProps {
  focusTool: ToolState | null;
  characterProps: CharacterProps | null;
  onClose: () => void;
  voiceSessionId: string | null;
}

export function ToolContent({
  focusTool,
  characterProps,
  onClose,
  voiceSessionId,
}: ToolContentProps) {
  if (focusTool) {
    return (
      <ToolPanel
        tool={focusTool}
        maestro={
          characterProps
            ? {
                name: characterProps.name,
                avatar: characterProps.avatar,
                color: characterProps.color,
              }
            : null
        }
        onClose={onClose}
        embedded={true}
        sessionId={voiceSessionId}
      />
    );
  }

  return (
    <div className="h-full flex items-center justify-center text-slate-400">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-lg font-medium">In attesa dello strumento...</p>
        <p className="text-sm mt-1">
          Parla con {characterProps?.name || 'il coach'} per creare il contenuto
        </p>
      </div>
    </div>
  );
}

