'use client';

import {
  Camera,
  Brain,
  BookOpen,
  Layers,
  Search,
  Sparkles,
  FileText,
  GitBranch,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContainerWidth } from '@/components/conversation/hooks/use-container-width';

type ToolType = 'mindmap' | 'quiz' | 'flashcards' | 'demo' | 'search' | 'summary' | 'diagram' | 'timeline';

interface ToolButtonConfig {
  id: ToolType | 'photo';
  icon: React.ElementType;
  label: string;
  title: string;
  onClick: () => void;
}

interface MaestroSessionToolButtonsProps {
  isLoading: boolean;
  sessionEnded: boolean;
  onRequestTool: (tool: ToolType) => void;
  onRequestPhoto: () => void;
}

export function MaestroSessionToolButtons({
  isLoading,
  sessionEnded,
  onRequestTool,
  onRequestPhoto,
}: MaestroSessionToolButtonsProps) {
  const toolButtons: ToolButtonConfig[] = [
    {
      id: 'photo',
      icon: Camera,
      label: 'Foto',
      title: 'Scatta foto',
      onClick: onRequestPhoto,
    },
    {
      id: 'mindmap',
      icon: Brain,
      label: 'Mappa',
      title: 'Crea mappa mentale',
      onClick: () => onRequestTool('mindmap'),
    },
    {
      id: 'quiz',
      icon: BookOpen,
      label: 'Quiz',
      title: 'Crea quiz',
      onClick: () => onRequestTool('quiz'),
    },
    {
      id: 'demo',
      icon: Sparkles,
      label: 'Demo',
      title: 'Crea demo interattiva',
      onClick: () => onRequestTool('demo'),
    },
    {
      id: 'flashcards',
      icon: Layers,
      label: 'Flashcard',
      title: 'Crea flashcard',
      onClick: () => onRequestTool('flashcards'),
    },
    {
      id: 'search',
      icon: Search,
      label: 'Cerca',
      title: 'Cerca su web',
      onClick: () => onRequestTool('search'),
    },
    {
      id: 'summary',
      icon: FileText,
      label: 'Riassunto',
      title: 'Crea riassunto',
      onClick: () => onRequestTool('summary'),
    },
    {
      id: 'diagram',
      icon: GitBranch,
      label: 'Diagramma',
      title: 'Crea diagramma',
      onClick: () => onRequestTool('diagram'),
    },
    {
      id: 'timeline',
      icon: Clock,
      label: 'Timeline',
      title: 'Crea linea temporale',
      onClick: () => onRequestTool('timeline'),
    },
  ];

  const { containerRef, hideLabels } = useContainerWidth(80, toolButtons.length);

  return (
    <div className="w-full mb-2">
      <div
        ref={containerRef}
        className="flex flex-wrap gap-1 justify-center items-center"
      >
        {toolButtons.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.id}
              variant="ghost"
              size="sm"
              onClick={tool.onClick}
              disabled={isLoading || sessionEnded}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex-shrink-0"
              title={tool.title}
              aria-label={tool.title}
            >
              <Icon className="w-4 h-4" />
              {!hideLabels && <span className="text-xs ml-1.5">{tool.label}</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
