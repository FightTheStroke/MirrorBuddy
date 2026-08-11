'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import type { ProcessedPage } from '@/lib/pdf';
import { usePDFPreview, type PDFPreviewMode } from './use-pdf-preview';
import { PDFPreviewHeader } from './pdf-preview-header';
import { PDFPreviewContent } from './pdf-preview-content';
import { PDFPreviewFooter } from './pdf-preview-footer';

/** Stable empty set: a fresh Set() each render would churn the content tree. */
const EMPTY_SELECTION: Set<number> = new Set<number>();

interface PDFPreviewProps {
  file: File;
  onClose: () => void;
  /**
   * "select" (default) — the student chooses which pages to analyse.
   * "confirm" — the student is only checking that this is the right document
   * before uploading it whole; selection is hidden and `onConfirm` fires.
   */
  mode?: PDFPreviewMode;
  onPagesSelected?: (pages: ProcessedPage[]) => void;
  onConfirm?: () => void;
  allowMultiSelect?: boolean;
}

export function PDFPreview({
  file,
  onPagesSelected,
  onConfirm,
  onClose,
  mode = 'select',
  allowMultiSelect = true,
}: PDFPreviewProps) {
  const selectable = mode === 'select';
  const {
    viewMode,
    error,
    pdfData,
    currentPage,
    selectedPages,
    zoom,
    currentPageData,
    goToPrevPage,
    goToNextPage,
    togglePageSelection,
    handleConfirm,
    handleZoomIn,
    handleZoomOut,
    setCurrentPage,
  } = usePDFPreview({
    file,
    mode,
    allowMultiSelect,
    onPagesSelected,
    onConfirm,
    onClose,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
    >
      <Card className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border-slate-700 text-white overflow-hidden flex flex-col">
        <PDFPreviewHeader
          fileName={file.name}
          totalPages={pdfData?.totalPages}
          truncated={pdfData?.truncated}
          viewMode={viewMode}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onClose={onClose}
        />

        <PDFPreviewContent
          viewMode={viewMode}
          error={error}
          pdfData={pdfData}
          currentPage={currentPage}
          selectedPages={selectable ? selectedPages : EMPTY_SELECTION}
          zoom={zoom}
          currentPageData={currentPageData}
          allowMultiSelect={selectable && allowMultiSelect}
          onClose={onClose}
          onConfirm={handleConfirm}
          onPrevPage={goToPrevPage}
          onNextPage={goToNextPage}
          onSetCurrentPage={setCurrentPage}
          onTogglePageSelection={togglePageSelection}
        />

        {viewMode === 'preview' && (
          <PDFPreviewFooter
            mode={mode}
            selectedCount={selectedPages.size}
            allowMultiSelect={selectable && allowMultiSelect}
            onClose={onClose}
            onConfirm={handleConfirm}
          />
        )}
      </Card>
    </motion.div>
  );
}
