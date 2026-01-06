/**
 * @file action-bar.tsx
 * @brief Action bar component for parent dashboard
 */

import { Button } from '@/components/ui/button';
import { FileJson, FileText, RefreshCw, Trash2, Loader2 } from 'lucide-react';

interface ActionBarProps {
  onExport: (format: 'json' | 'pdf') => void;
  onRefresh: () => void;
  onDelete: () => void;
  isExporting: boolean;
  isGenerating: boolean;
  showDelete?: boolean;
}

export function ActionBar({
  onExport,
  onRefresh,
  onDelete,
  isExporting,
  isGenerating,
  showDelete = true,
}: ActionBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onExport('json')}
          disabled={isExporting}
          className="justify-center sm:justify-start"
        >
          <FileJson className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Esporta JSON</span>
          <span className="sm:hidden">JSON</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onExport('pdf')}
          disabled={isExporting}
          className="justify-center sm:justify-start"
        >
          <FileText className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Esporta Report</span>
          <span className="sm:hidden">Report</span>
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isGenerating}
          className="justify-center sm:justify-start"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Aggiorna Profilo
        </Button>
        {showDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 justify-center sm:justify-start"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Richiedi Cancellazione</span>
            <span className="sm:hidden">Cancella</span>
          </Button>
        )}
      </div>
    </div>
  );
}

