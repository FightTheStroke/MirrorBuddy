/**
 * Toolbar component for Interactive MarkMap
 *
 * Displays controls for undo, accessibility, zoom, fullscreen, download, and print
 */

import {
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Accessibility,
  RotateCcw,
  Maximize,
  Minimize,
  Undo2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { AccessibilitySettings } from '@/lib/accessibility';
import type { MindmapNode } from './types';
import { nodesToMarkdown } from './helpers';

export interface ToolbarProps {
  title: string;
  nodes: MindmapNode[];
  zoom: number;
  isFullscreen: boolean;
  accessibilityMode: boolean;
  settings: AccessibilitySettings;
  historyLength: number;
  onUndo: () => void;
  onAccessibilityToggle: () => void;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFullscreen: () => void;
}

export function Toolbar({
  title,
  nodes,
  zoom,
  isFullscreen,
  accessibilityMode,
  settings,
  historyLength,
  onUndo,
  onAccessibilityToggle,
  onReset,
  onZoomIn,
  onZoomOut,
  onFullscreen,
}: ToolbarProps) {
  const t = useTranslations('tools.markmap');

  const handleDownload = () => {
    const markdown = nodesToMarkdown(nodes, title);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mappa-mentale-${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 border-b',
        settings.highContrast
          ? 'border-white bg-black'
          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50',
      )}
    >
      <div className="flex items-center gap-2">
        <h3
          className={cn(
            'font-semibold',
            settings.dyslexiaFont && 'tracking-wide',
            settings.highContrast ? 'text-yellow-400' : 'text-slate-700 dark:text-slate-200',
          )}
          style={{ fontSize: `${14 * (settings.largeText ? 1.2 : 1)}px` }}
        >
          {title}
        </h3>
        {nodes.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('nodesCount', { count: nodes.length })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={historyLength === 0}
          className={cn(
            'p-2 rounded-lg transition-colors',
            historyLength === 0 && 'opacity-50 cursor-not-allowed',
            settings.highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600',
          )}
          title={t('undo.title')}
          aria-label={t('undo.ariaLabel')}
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Accessibility toggle */}
        <button
          onClick={onAccessibilityToggle}
          className={cn(
            'p-2 rounded-lg transition-colors',
            accessibilityMode
              ? 'bg-accent-themed text-white'
              : settings.highContrast
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600',
          )}
          title={t('accessibility.title')}
          aria-label={t('accessibility.ariaLabel')}
        >
          <Accessibility className="w-4 h-4" />
        </button>

        {/* Reset view */}
        <button
          onClick={onReset}
          className={cn(
            'p-2 rounded-lg transition-colors',
            settings.highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600',
          )}
          title={t('resetView.title')}
          aria-label={t('resetView.ariaLabel')}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Zoom controls */}
        <button
          onClick={onZoomOut}
          className={cn(
            'p-2 rounded-lg transition-colors',
            settings.highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600',
          )}
          title={t('zoomOut.title')}
          aria-label={t('zoomOut.ariaLabel')}
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span
          className={cn(
            'text-sm min-w-[4rem] text-center',
            settings.highContrast ? 'text-white' : 'text-slate-600 dark:text-slate-400',
          )}
        >
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={onZoomIn}
          className={cn(
            'p-2 rounded-lg transition-colors',
            settings.highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600',
          )}
          title={t('zoomIn.title')}
          aria-label={t('zoomIn.ariaLabel')}
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={onFullscreen}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isFullscreen
              ? 'bg-green-500 text-white hover:bg-green-600'
              : settings.highContrast
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600',
          )}
          title={isFullscreen ? t('fullscreen.ariaLabelExit') : t('fullscreen.ariaLabelEnter')}
          aria-label={isFullscreen ? t('fullscreen.ariaLabelExit') : t('fullscreen.ariaLabelEnter')}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          className={cn(
            'p-2 rounded-lg transition-colors',
            settings.highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600',
          )}
          title={t('download.title')}
          aria-label={t('download.ariaLabel')}
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Print */}
        <button
          onClick={handlePrint}
          className={cn(
            'p-2 rounded-lg transition-colors',
            settings.highContrast
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-accent-themed text-white hover:brightness-110',
          )}
          title={t('print.title')}
          aria-label={t('print.ariaLabel')}
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
