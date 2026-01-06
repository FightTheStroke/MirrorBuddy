/**
 * @file use-homework-help.ts
 * @brief Custom hook for homework help state management
 */

import { useState, useRef, useCallback } from 'react';
import { processPdfFile } from '../utils/pdf-utils';

interface UseHomeworkHelpProps {
  onSubmitPhoto: (photo: File) => Promise<unknown>;
}

export function useHomeworkHelp({ onSubmitPhoto }: UseHomeworkHelpProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showHints, setShowHints] = useState<Record<string, number>>({});
  const [question, setQuestion] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPdf, setIsPdf] = useState(false);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [analyzedPage, setAnalyzedPage] = useState<number | null>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setPdfError(null);

      if (file.type === 'application/pdf') {
        setIsPdf(true);
        setIsUploading(true);
        setAnalyzedPage(null);

        const result = await processPdfFile(file);
        setPdfPages(result.pages);
        setCurrentPage(0);
        setPdfTotalPages(result.totalPages);
        setPdfError(result.error);

        if (result.pages.length > 0) {
          setPhotoPreview(result.pages[0]);

          const response = await fetch(result.pages[0]);
          const blob = await response.blob();
          const imageFile = new File([blob], 'pdf-page-1.png', {
            type: 'image/png',
          });
          await onSubmitPhoto(imageFile);
          setAnalyzedPage(0);
        }
        setIsUploading(false);
      } else {
        setIsPdf(false);
        setPdfPages([]);

        const reader = new FileReader();
        reader.onload = (e) => setPhotoPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        setIsUploading(true);
        try {
          await onSubmitPhoto(file);
        } finally {
          setIsUploading(false);
        }
      }
    },
    [onSubmitPhoto]
  );

  const handleWebcamCapture = useCallback(
    async (imageData: string) => {
      setShowWebcam(false);
      setPhotoPreview(imageData);

      const response = await fetch(imageData);
      const blob = await response.blob();
      const file = new File([blob], 'homework-photo.jpg', {
        type: 'image/jpeg',
      });

      setIsUploading(true);
      try {
        await onSubmitPhoto(file);
      } finally {
        setIsUploading(false);
      }
    },
    [onSubmitPhoto]
  );

  const analyzePdfPage = useCallback(
    async (pageIndex: number) => {
      if (!pdfPages[pageIndex]) return;

      setIsUploading(true);
      try {
        const response = await fetch(pdfPages[pageIndex]);
        const blob = await response.blob();
        const imageFile = new File(
          [blob],
          `pdf-page-${pageIndex + 1}.png`,
          { type: 'image/png' }
        );
        await onSubmitPhoto(imageFile);
        setAnalyzedPage(pageIndex);
      } finally {
        setIsUploading(false);
      }
    },
    [pdfPages, onSubmitPhoto]
  );

  const handleShowNextHint = useCallback(
    (stepId: string, totalHints: number) => {
      setShowHints((prev) => ({
        ...prev,
        [stepId]: Math.min((prev[stepId] || 0) + 1, totalHints),
      }));
    },
    []
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    if (pdfPages[page]) {
      setPhotoPreview(pdfPages[page]);
    }
  }, [pdfPages]);

  const handleClosePreview = useCallback(() => {
    setPhotoPreview(null);
    setIsPdf(false);
    setPdfPages([]);
    setCurrentPage(0);
    setPdfTotalPages(0);
    setPdfError(null);
    setAnalyzedPage(null);
  }, []);

  return {
    isUploading,
    photoPreview,
    expandedStep,
    setExpandedStep,
    showHints,
    question,
    setQuestion,
    showWebcam,
    setShowWebcam,
    fileInputRef,
    isPdf,
    pdfPages,
    currentPage,
    pdfTotalPages,
    pdfError,
    setPdfError,
    analyzedPage,
    handleFileSelect,
    handleWebcamCapture,
    analyzePdfPage,
    handleShowNextHint,
    handlePageChange,
    handleClosePreview,
  };
}

