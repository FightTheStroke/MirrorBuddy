'use client';

/**
 * Thumbnail Preview Component
 * Generates visual previews for different material types (Issue #37)
 */

import { Play, FileText } from 'lucide-react';
import { TOOL_ICONS } from './constants';
import type { ArchiveItem } from './types';

interface ThumbnailPreviewProps {
  item: ArchiveItem;
}

export function ThumbnailPreview({ item }: ThumbnailPreviewProps) {
  const Icon = TOOL_ICONS[item.toolType];
  const content = item.content;

  // Webcam photos - show actual image
  if (item.toolType === 'webcam' && typeof content === 'object' && 'imageData' in content) {
    return (
      <div className="w-full h-24 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element -- User-captured data URL */}
        <img
          src={(content as { imageData: string }).imageData}
          alt="Anteprima foto"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Homework - show photo thumbnail with overlay
  if (item.toolType === 'homework' && typeof content === 'object' && 'photoUrl' in content) {
    const homeworkContent = content as { photoUrl: string; steps?: Array<{ completed: boolean }> };
    const completedSteps = homeworkContent.steps?.filter(s => s.completed).length ?? 0;
    const totalSteps = homeworkContent.steps?.length ?? 0;
    return (
      <div className="relative w-full h-24 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element -- User-uploaded base64 */}
        <img
          src={homeworkContent.photoUrl}
          alt="Anteprima compito"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between">
          <span className="text-[10px] text-white font-medium">Compito</span>
          {totalSteps > 0 && (
            <span className="text-[10px] text-white/80">{completedSteps}/{totalSteps}</span>
          )}
        </div>
      </div>
    );
  }

  // Mindmaps - show structured preview
  if (item.toolType === 'mindmap' && typeof content === 'object' && 'markdown' in content) {
    const markdown = (content as { markdown: string }).markdown;
    const lines = markdown.split('\n').filter(l => l.trim()).slice(0, 4);
    return (
      <div className="w-full h-24 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 p-2">
        <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5 overflow-hidden">
          {lines.map((line, i) => (
            <div key={i} className="truncate">{line}</div>
          ))}
        </div>
      </div>
    );
  }

  // Quiz - show question count
  if (item.toolType === 'quiz' && typeof content === 'object' && 'questions' in content) {
    const questions = (content as { questions: unknown[] }).questions;
    return (
      <div className="w-full h-24 rounded-lg overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{questions.length}</div>
          <div className="text-xs text-green-600/70 dark:text-green-400/70">domande</div>
        </div>
      </div>
    );
  }

  // Flashcards - show card count
  if (item.toolType === 'flashcard' && typeof content === 'object' && 'cards' in content) {
    const cards = (content as { cards: unknown[] }).cards;
    return (
      <div className="w-full h-24 rounded-lg overflow-hidden bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{cards.length}</div>
          <div className="text-xs text-purple-600/70 dark:text-purple-400/70">flashcard</div>
        </div>
      </div>
    );
  }

  // Demo - show interactive badge
  if (item.toolType === 'demo') {
    return (
      <div className="w-full h-24 rounded-lg overflow-hidden bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center">
        <div className="text-center">
          <Play className="w-8 h-8 text-orange-500 mx-auto mb-1" />
          <div className="text-xs text-orange-600/70 dark:text-orange-400/70">Demo Interattiva</div>
        </div>
      </div>
    );
  }

  // PDF - show document icon
  if (item.toolType === 'pdf') {
    return (
      <div className="w-full h-24 rounded-lg overflow-hidden bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 flex items-center justify-center">
        <FileText className="w-10 h-10 text-red-400" />
      </div>
    );
  }

  // Default - show type icon
  return (
    <div className="w-full h-24 rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
      <Icon className="w-10 h-10 text-slate-400" />
    </div>
  );
}
