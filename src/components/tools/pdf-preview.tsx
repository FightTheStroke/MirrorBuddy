'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  processPDF,
  MAX_PDF_PAGES,
  PDFProcessingError,
  type ProcessedPDF,
  type ProcessedPage,
} from '@/lib/pdf';

interface PDFPreviewProps {
  file: File;
  onPagesSelected: (pages: ProcessedPage[]) => void;
  onClose: () => void;
  allowMultiSelect?: boolean;
}

type ViewMode = 'loading' | 'preview' | 'error';

export function PDFPreview({
  file,
  onPagesSelected,
  onClose,
  allowMultiSelect = true,
}: PDFPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ProcessedPDF | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set([0]));
  const [zoom, setZoom] = useState(1);

  // Process PDF on mount
  useEffect(() => {
    let cancelled = false;

    async function process() {
      try {
        // Process PDF (handles page limiting internally)
        const result = await processPDF(file);

        if (!cancelled) {
          setPdfData(result);
          setViewMode('preview');

          // Auto-select first page
          if (result.pages.length > 0) {
            setSelectedPages(new Set([0]));
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof PDFProcessingError) {
            setError(err.message);
          } else {
            setError('Errore durante l\'elaborazione del PDF.');
          }
          setViewMode('error');
        }
      }
    }

    process();

    return () => {
      cancelled = true;
    };
  }, [file]);

  // Navigation
  const goToPrevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(0, p - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    if (!pdfData) return;
    setCurrentPage((p) => Math.min(pdfData.pages.length - 1, p + 1));
  }, [pdfData]);

  // Page selection
  const togglePageSelection = useCallback(
    (pageIndex: number) => {
      setSelectedPages((prev) => {
        const next = new Set(prev);
        if (next.has(pageIndex)) {
          // Don't allow deselecting if it's the only one
          if (next.size > 1) {
            next.delete(pageIndex);
          }
        } else {
          if (allowMultiSelect) {
            next.add(pageIndex);
          } else {
            next.clear();
            next.add(pageIndex);
          }
        }
        return next;
      });
    },
    [allowMultiSelect]
  );

  // Confirm selection
  const handleConfirm = useCallback(() => {
    if (!pdfData) return;
    const pages = Array.from(selectedPages)
      .sort((a, b) => a - b)
      .map((i) => pdfData.pages[i])
      .filter(Boolean);
    onPagesSelected(pages);
  }, [pdfData, selectedPages, onPagesSelected]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(2, z + 0.25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.5, z - 0.25));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'preview') return;

      switch (e.key) {
        case 'ArrowLeft':
          goToPrevPage();
          break;
        case 'ArrowRight':
          goToNextPage();
          break;
        case 'Escape':
          onClose();
          break;
        case 'Enter':
          handleConfirm();
          break;
        case ' ':
          e.preventDefault();
          togglePageSelection(currentPage);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentPage, goToPrevPage, goToNextPage, onClose, handleConfirm, togglePageSelection]);

  const currentPageData = pdfData?.pages[currentPage];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <Card className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border-slate-700 text-white overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold">{file.name}</h3>
              {pdfData && (
                <p className="text-sm text-slate-400">
                  {pdfData.totalPages} pagin{pdfData.totalPages === 1 ? 'a' : 'e'}
                  {pdfData.truncated && (
                    <span className="text-amber-400 ml-2">
                      (mostrate le prime {MAX_PDF_PAGES})
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'preview' && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="border-slate-600"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-slate-400 w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= 2}
                  className="border-slate-600"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
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
                    onClick={goToPrevPage}
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
                          setCurrentPage(index);
                          if (allowMultiSelect) {
                            togglePageSelection(index);
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
                    onClick={goToNextPage}
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

        {/* Footer */}
        {viewMode === 'preview' && (
          <div className="p-4 border-t border-slate-700 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {selectedPages.size} pagin{selectedPages.size === 1 ? 'a' : 'e'} selezionat{selectedPages.size === 1 ? 'a' : 'e'}
              {allowMultiSelect && (
                <span className="ml-2">(clicca per selezionare/deselezionare)</span>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="border-slate-600">
                Annulla
              </Button>
              <Button
                onClick={handleConfirm}
                className="bg-green-600 hover:bg-green-700"
                disabled={selectedPages.size === 0}
              >
                <Check className="w-4 h-4 mr-2" />
                Analizza {selectedPages.size > 1 ? `${selectedPages.size} pagine` : 'pagina'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
