/**
 * @file pdf-viewer.tsx
 * @brief PDF viewer component
 */

import {
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PdfViewerProps {
  photoPreview: string;
  isPdf: boolean;
  pdfPages: string[];
  currentPage: number;
  pdfTotalPages: number;
  pdfError: string | null;
  isUploading: boolean;
  analyzedPage: number | null;
  onPageChange: (page: number) => void;
  onAnalyzePage: (pageIndex: number) => void;
  onClose: () => void;
  onPdfErrorDismiss?: () => void;
}

export function PdfViewer({
  photoPreview,
  isPdf,
  pdfPages: _pdfPages,
  currentPage,
  pdfTotalPages,
  pdfError,
  isUploading,
  analyzedPage,
  onPageChange,
  onAnalyzePage,
  onClose,
  onPdfErrorDismiss,
}: PdfViewerProps) {
  return (
    <Card>
      <CardContent className="p-6">
        {pdfError && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
              {pdfError}
            </p>
            <button
              onClick={onPdfErrorDismiss || onClose}
              className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-500"
              aria-label="Chiudi avviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="relative rounded-xl overflow-hidden">
          {isPdf && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-medium shadow-lg">
              <FileText className="w-4 h-4" />
              PDF
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element -- User-uploaded data URL */}
          <img src={photoPreview} alt="Preview" className="w-full rounded-lg" />
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
              <div className="text-center text-white">
                <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" />
                <p className="text-lg font-medium">
                  {isPdf ? 'Carico il PDF...' : 'Analizzo il problema...'}
                </p>
              </div>
            </div>
          )}
          {isPdf && pdfTotalPages > 1 && !isUploading && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
              {analyzedPage !== null && currentPage !== analyzedPage && (
                <>
                  <button
                    onClick={() => onAnalyzePage(currentPage)}
                    className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-lg flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Analizza questa pagina
                  </button>
                  <span className="text-xs text-amber-400 bg-black/60 px-2 py-1 rounded">
                    Analisi attuale: pagina {analyzedPage + 1}
                  </span>
                </>
              )}
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-black/80 text-white text-sm shadow-lg">
                <button
                  onClick={() => {
                    const newPage = Math.max(0, currentPage - 1);
                    onPageChange(newPage);
                  }}
                  disabled={currentPage === 0}
                  className="p-1.5 hover:bg-white/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Pagina precedente"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="min-w-[80px] text-center font-medium">
                  Pagina {currentPage + 1} di {pdfTotalPages}
                </span>
                <button
                  onClick={() => {
                    const newPage = Math.min(pdfTotalPages - 1, currentPage + 1);
                    onPageChange(newPage);
                  }}
                  disabled={currentPage === pdfTotalPages - 1}
                  className="p-1.5 hover:bg-white/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Pagina successiva"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Rimuovi file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

