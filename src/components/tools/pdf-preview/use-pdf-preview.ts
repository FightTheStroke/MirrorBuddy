'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  processPDF,
  PDFProcessingError,
  type ProcessedPDF,
  type ProcessedPage,
} from '@/lib/pdf';

export type ViewMode = 'loading' | 'preview' | 'error';

export interface UsePDFPreviewOptions {
  file: File;
  allowMultiSelect?: boolean;
  onPagesSelected: (pages: ProcessedPage[]) => void;
  onClose: () => void;
}

export interface UsePDFPreviewReturn {
  viewMode: ViewMode;
  error: string | null;
  pdfData: ProcessedPDF | null;
  currentPage: number;
  selectedPages: Set<number>;
  zoom: number;
  currentPageData: ProcessedPage | undefined;
  goToPrevPage: () => void;
  goToNextPage: () => void;
  togglePageSelection: (pageIndex: number) => void;
  handleConfirm: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  setCurrentPage: (page: number) => void;
}

export function usePDFPreview({
  file,
  allowMultiSelect = true,
  onPagesSelected,
  onClose,
}: UsePDFPreviewOptions): UsePDFPreviewReturn {
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

  return {
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
  };
}
