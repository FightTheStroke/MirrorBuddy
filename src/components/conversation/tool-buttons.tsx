'use client';

import { Brain, HelpCircle, Play, Layers, Search, Camera, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  return (
    <div
      className={cn(
        'flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg',
        'flex-wrap justify-center', // Wrap on narrow screens
        'sm:flex-nowrap sm:justify-start' // No wrap on desktop
      )}
    >
      {TOOL_BUTTONS.map(({ type, icon: Icon, label, tooltip }) => (
        <Button
          key={type}
          variant="ghost"
          size="sm"
          onClick={() => onToolRequest(type)}
          disabled={disabled || !!activeToolId}
          className={cn(
            'h-8 gap-1',
            'px-1.5 sm:px-2', // Smaller padding on mobile
            'min-w-[2.5rem] sm:min-w-0' // Consistent min-width on mobile
          )}
          title={tooltip}
          aria-label={tooltip}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline text-xs">{label}</span>
        </Button>
      ))}
    </div>
  );
}
