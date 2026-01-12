'use client';

/**
 * StudyKitHeader Component
 * Header section with title, metadata, and action buttons
 */

import { Download, Trash2, Printer, Route, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudyKit } from '@/types/study-kit';

interface HeaderProps {
  studyKit: StudyKit;
  materialCount: number;
  generatedPathId: string | null;
  isGeneratingPath: boolean;
  isDeleting: boolean;
  onGeneratePath?: (pathId: string) => void;
  onGeneratePathClick: () => void;
  onDownloadPDF: () => void;
  onPrint: () => void;
  onDeleteClick: () => void;
  showDelete: boolean;
}

export function StudyKitHeader({
  studyKit,
  materialCount,
  generatedPathId,
  isGeneratingPath,
  isDeleting,
  onGeneratePath,
  onGeneratePathClick,
  onDownloadPDF,
  onPrint,
  onDeleteClick,
  showDelete,
}: HeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {studyKit.title}
        </h2>
        {studyKit.subject && (
          <p className="no-print text-sm text-slate-600 dark:text-slate-400 mt-1">
            {studyKit.subject}
          </p>
        )}
        <div className="no-print flex items-center gap-4 mt-2 text-xs text-slate-500">
          {studyKit.pageCount && <span>{studyKit.pageCount} pagine</span>}
          {studyKit.wordCount && <span>{studyKit.wordCount.toLocaleString()} parole</span>}
          <span>{materialCount} materiali generati</span>
        </div>
      </div>

      <div className="no-print flex items-center gap-2">
        {generatedPathId ? (
          <Button
            size="sm"
            onClick={() => onGeneratePath?.(generatedPathId)}
            className="gap-2 bg-green-600 hover:bg-green-700"
            title="Vai al percorso di apprendimento"
          >
            <Route className="w-4 h-4" />
            <span className="hidden sm:inline">Vai al Percorso</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onGeneratePathClick}
            disabled={isGeneratingPath || !studyKit.summary}
            className="gap-2"
            title="Genera un percorso di apprendimento progressivo"
          >
            {isGeneratingPath ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Route className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isGeneratingPath ? 'Generando...' : 'Genera Percorso'}
            </span>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadPDF}
          aria-label="Scarica PDF accessibile"
          title="Scarica PDF accessibile per DSA"
          className="no-print gap-1"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">PDF</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPrint}
          aria-label="Stampa PDF"
          title="Stampa PDF accessibile"
          className="no-print"
        >
          <Printer className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Stampa</span>
        </Button>
        {showDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteClick}
            disabled={isDeleting}
            aria-label="Elimina Study Kit"
            className="no-print"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
