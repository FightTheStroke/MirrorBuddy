"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import type { ProcessedPage } from "@/lib/pdf";
import { usePDFPreview } from "./use-pdf-preview";
import { PDFPreviewHeader } from "./pdf-preview-header";
import { PDFPreviewContent } from "./pdf-preview-content";
import { PDFPreviewFooter } from "./pdf-preview-footer";

interface PDFPreviewProps {
  file: File;
  onPagesSelected: (pages: ProcessedPage[]) => void;
  onClose: () => void;
  allowMultiSelect?: boolean;
}

export function PDFPreview({
  file,
  onPagesSelected,
  onClose,
  allowMultiSelect = true,
}: PDFPreviewProps) {
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
    allowMultiSelect,
    onPagesSelected,
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
          selectedPages={selectedPages}
          zoom={zoom}
          currentPageData={currentPageData}
          allowMultiSelect={allowMultiSelect}
          onClose={onClose}
          onConfirm={handleConfirm}
          onPrevPage={goToPrevPage}
          onNextPage={goToNextPage}
          onSetCurrentPage={setCurrentPage}
          onTogglePageSelection={togglePageSelection}
        />

        {viewMode === "preview" && (
          <PDFPreviewFooter
            selectedCount={selectedPages.size}
            allowMultiSelect={allowMultiSelect}
            onClose={onClose}
            onConfirm={handleConfirm}
          />
        )}
      </Card>
    </motion.div>
  );
}
