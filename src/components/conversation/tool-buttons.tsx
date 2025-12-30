'use client';

import { Brain, HelpCircle, Play, Layers, Search, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  { type: 'search', icon: Search, label: 'Cerca', tooltip: 'Cerca su web/YouTube' },
  { type: 'webcam', icon: Camera, label: 'Foto', tooltip: 'Scatta foto' },
];

export function ToolButtons({ onToolRequest, disabled, activeToolId }: ToolButtonsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
      {TOOL_BUTTONS.map(({ type, icon: Icon, label, tooltip }) => (
        <Button
          key={type}
          variant="ghost"
          size="sm"
          onClick={() => onToolRequest(type)}
          disabled={disabled || !!activeToolId}
          className="h-8 px-2 gap-1"
          title={tooltip}
          aria-label={tooltip}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">{label}</span>
        </Button>
      ))}
    </div>
  );
}
