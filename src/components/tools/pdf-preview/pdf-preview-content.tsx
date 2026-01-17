'use client';

import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProcessedPDF, ProcessedPage } from '@/lib/pdf';
import type { ViewMode } from './use-pdf-preview';

interface PDFPreviewContentProps {
  viewMode: ViewMode;
  error: string | null;
  pdfData: ProcessedPDF | null;
  currentPage: number;
  selectedPages: Set<number>;
  zoom: number;
  currentPageData: ProcessedPage | undefined;
  allowMultiSelect: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onSetCurrentPage: (page: number) => void;
  onTogglePageSelection: (pageIndex: number) => void;
}

export function PDFPreviewContent({
  viewMode,
  error,
  pdfData,
  currentPage,
  selectedPages,
  zoom,
  currentPageData,
  allowMultiSelect,
  onClose,
  onConfirm,
  onPrevPage,
  onNextPage,
  onSetCurrentPage,
  onTogglePageSelection,
}: PDFPreviewContentProps) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {viewMode === 'loading' && (
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          <p className="text-slate-400">Elaborazione PDF in corso...</p>
        </div>
      )}

      {viewMode === 'error' && (
        <div className="flex-1 flex items-center justify-center flex-col gap-4 p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-slate-300 text-center max-w-md">{error}</p>
          <Button variant="outline" onClick={onClose} className="border-slate-600">
            Chiudi
          </Button>
        </div>
      )}

      {viewMode === 'preview' && pdfData && (
        <>
          {/* Page preview */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950">
            {currentPageData && (
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Data URL from PDF rendering */}
                <img
                  src={currentPageData.imageData}
                  alt={`Pagina ${currentPageData.pageNumber}`}
                  className="max-w-full max-h-full shadow-2xl rounded"
                />

                {/* Selection indicator */}
                {selectedPages.has(currentPage) && (
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Page navigation and selection */}
          {pdfData.pages.length > 1 && (
            <div className="p-4 border-t border-slate-700 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={onPrevPage}
                disabled={currentPage === 0}
                className="border-slate-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              {/* Page thumbnails */}
              <div className="flex gap-2 overflow-x-auto max-w-md">
                {pdfData.pages.map((page, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onSetCurrentPage(index);
                      if (allowMultiSelect) {
                        onTogglePageSelection(index);
                      }
                    }}
                    className={`
                      relative w-12 h-16 rounded border-2 overflow-hidden flex-shrink-0 transition-all
                      ${
                        currentPage === index
                          ? 'border-blue-500 ring-2 ring-blue-500/50'
                          : selectedPages.has(index)
                          ? 'border-green-500'
                          : 'border-slate-600 hover:border-slate-500'
                      }
                    `}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- Data URL from PDF rendering */}
                    <img
                      src={page.imageData}
                      alt={`Pagina ${page.pageNumber}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[10px] text-center py-0.5">
                      {page.pageNumber}
                    </span>
                    {selectedPages.has(index) && (
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={onNextPage}
                disabled={currentPage === pdfData.pages.length - 1}
                className="border-slate-600"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
