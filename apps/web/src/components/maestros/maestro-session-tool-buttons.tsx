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
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useContainerWidth } from '@/components/conversation/hooks/use-container-width';

type ToolType =
  | 'mindmap'
  | 'quiz'
  | 'flashcards'
  | 'demo'
  | 'search'
  | 'summary'
  | 'diagram'
  | 'timeline';

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
  const t = useTranslations('chat');
  const toolButtons: ToolButtonConfig[] = [
    {
      id: 'photo',
      icon: Camera,
      label: t('tools.webcam.label'),
      title: t('tools.webcam.tooltip'),
      onClick: onRequestPhoto,
    },
    {
      id: 'mindmap',
      icon: Brain,
      label: t('tools.mindmap.label'),
      title: t('tools.mindmap.tooltip'),
      onClick: () => onRequestTool('mindmap'),
    },
    {
      id: 'quiz',
      icon: BookOpen,
      label: t('tools.quiz.label'),
      title: t('tools.quiz.tooltip'),
      onClick: () => onRequestTool('quiz'),
    },
    {
      id: 'demo',
      icon: Sparkles,
      label: t('tools.demo.label'),
      title: t('tools.demo.tooltip'),
      onClick: () => onRequestTool('demo'),
    },
    {
      id: 'flashcards',
      icon: Layers,
      label: t('tools.flashcard.label'),
      title: t('tools.flashcard.tooltip'),
      onClick: () => onRequestTool('flashcards'),
    },
    {
      id: 'search',
      icon: Search,
      label: t('tools.search.label'),
      title: t('tools.search.tooltip'),
      onClick: () => onRequestTool('search'),
    },
    {
      id: 'summary',
      icon: FileText,
      label: t('tools.summary.label'),
      title: t('tools.summary.tooltip'),
      onClick: () => onRequestTool('summary'),
    },
    {
      id: 'diagram',
      icon: GitBranch,
      label: t('tools.diagram.label'),
      title: t('tools.diagram.tooltip'),
      onClick: () => onRequestTool('diagram'),
    },
    {
      id: 'timeline',
      icon: Clock,
      label: t('tools.timeline.label'),
      title: t('tools.timeline.tooltip'),
      onClick: () => onRequestTool('timeline'),
    },
  ];

  const { containerRef, hideLabels } = useContainerWidth(80, toolButtons.length);

  return (
    <div className="w-full mb-2">
      <div ref={containerRef} className="flex flex-wrap gap-1 justify-center items-center">
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
