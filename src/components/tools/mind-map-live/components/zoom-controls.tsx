import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  const { settings } = useAccessibilityStore();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onZoomOut}
        className={cn(
          'p-1.5 rounded transition-colors',
          settings.highContrast
            ? 'bg-yellow-400 text-black hover:bg-yellow-300'
            : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
        )}
        title="Riduci zoom"
        aria-label="Riduci zoom"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <span
        className={cn(
          'text-xs min-w-[3rem] text-center',
          settings.highContrast ? 'text-white' : 'text-slate-500'
        )}
      >
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className={cn(
          'p-1.5 rounded transition-colors',
          settings.highContrast
            ? 'bg-yellow-400 text-black hover:bg-yellow-300'
            : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
        )}
        title="Aumenta zoom"
        aria-label="Aumenta zoom"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        onClick={onReset}
        className={cn(
          'p-1.5 rounded transition-colors ml-1',
          settings.highContrast
            ? 'bg-yellow-400 text-black hover:bg-yellow-300'
            : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
        )}
        title="Ripristina vista"
        aria-label="Ripristina vista"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}

