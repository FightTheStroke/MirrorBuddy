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

  return (
    <div className="flex gap-1 mb-2">
      {toolButtons.map((tool) => {
        const Icon = tool.icon;
        return (
          <Button
            key={tool.id}
            variant="ghost"
            size="sm"
            onClick={tool.onClick}
            disabled={isLoading || sessionEnded}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            title={tool.title}
          >
            <Icon className="w-4 h-4 mr-1" />
            <span className="text-xs">{tool.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
