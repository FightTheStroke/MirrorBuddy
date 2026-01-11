'use client';

import { Download, RefreshCw, Sun, Moon, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SVGOverviewToolbarProps {
  title: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleLayout: () => void;
  currentLayout: 'radial' | 'tree';
  onExportSVG: () => void;
  onExportPNG: () => void;
}

export function SVGOverviewToolbar({
  title,
  theme,
  onToggleTheme,
  onToggleLayout,
  currentLayout,
  onExportSVG,
  onExportPNG,
}: SVGOverviewToolbarProps) {
  return (
    <div
      className={cn(
        'px-4 py-2 border-b flex items-center justify-between',
        theme === 'dark'
          ? 'border-slate-700 bg-slate-800/50'
          : 'border-slate-200 bg-slate-50'
      )}
    >
      <h3
        className={cn(
          'text-sm font-medium',
          theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
        )}
      >
        {title}
      </h3>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleTheme}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            theme === 'dark'
              ? 'hover:bg-slate-700 text-slate-400'
              : 'hover:bg-slate-200 text-slate-600'
          )}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onToggleLayout}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            theme === 'dark'
              ? 'hover:bg-slate-700 text-slate-400'
              : 'hover:bg-slate-200 text-slate-600'
          )}
          aria-label={`Switch to ${currentLayout === 'radial' ? 'tree' : 'radial'} layout`}
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={onExportSVG}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            theme === 'dark'
              ? 'hover:bg-slate-700 text-slate-400'
              : 'hover:bg-slate-200 text-slate-600'
          )}
          aria-label="Export as SVG"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={onExportPNG}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            theme === 'dark'
              ? 'hover:bg-slate-700 text-slate-400'
              : 'hover:bg-slate-200 text-slate-600'
          )}
          aria-label="Export as PNG"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
