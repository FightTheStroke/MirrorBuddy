'use client';

import { Brain, HelpCircle, Play, Layers, Search, Camera, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContainerWidth } from './hooks/use-container-width';
import type { ToolType } from '@/types/tools';

interface ToolButtonsProps {
  onToolRequest: (type: ToolType) => void;
  disabled?: boolean;
  activeToolId?: string | null;
}

const TOOL_BUTTONS: Array<{
  type: ToolType;
  icon: typeof Brain;
  label: string;
  tooltip: string;
}> = [
  { type: 'mindmap', icon: Brain, label: 'Mappa', tooltip: 'Crea mappa mentale' },
  { type: 'quiz', icon: HelpCircle, label: 'Quiz', tooltip: 'Crea quiz' },
  { type: 'demo', icon: Play, label: 'Demo', tooltip: 'Crea simulazione interattiva' },
  { type: 'flashcard', icon: Layers, label: 'Flashcard', tooltip: 'Crea flashcard' },
  { type: 'summary', icon: FileText, label: 'Riassunto', tooltip: 'Scrivi un riassunto guidato' },
  { type: 'search', icon: Search, label: 'Cerca', tooltip: 'Cerca su web/YouTube' },
  { type: 'webcam', icon: Camera, label: 'Foto', tooltip: 'Scatta foto' },
];

export function ToolButtons({ onToolRequest, disabled, activeToolId }: ToolButtonsProps) {
  const { containerRef, hideLabels } = useContainerWidth(80, TOOL_BUTTONS.length);

  return (
    <div
      ref={containerRef}
      className="flex flex-wrap gap-1 justify-center items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full"
    >
      {TOOL_BUTTONS.map(({ type, icon: Icon, label, tooltip }) => (
        <Button
          key={type}
          variant="ghost"
          size="sm"
          onClick={() => onToolRequest(type)}
          disabled={disabled || !!activeToolId}
          className="h-8 flex-shrink-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          title={tooltip}
          aria-label={tooltip}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {!hideLabels && <span className="text-xs ml-1.5">{label}</span>}
        </Button>
      ))}
    </div>
  );
}
