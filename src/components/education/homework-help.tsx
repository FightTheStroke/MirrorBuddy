'use client';

import { useRef } from 'react';
import type { Homework } from '@/types';
import { useHomeworkHelp } from './homework-help/hooks/use-homework-help';
import { UploadView } from './homework-help/components/upload-view';
import { StepsView } from './homework-help/components/steps-view';

interface HomeworkHelpProps {
  homework?: Homework;
  onSubmitPhoto: (photo: File) => Promise<Homework>;
  onCompleteStep: (stepId: string) => void;
  onAskQuestion: (question: string) => void;
}

export function HomeworkHelp({
  homework,
  onSubmitPhoto,
  onCompleteStep,
  onAskQuestion,
}: HomeworkHelpProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isUploading,
    photoPreview,
    expandedStep,
    setExpandedStep,
    showHints,
    question,
    setQuestion,
    showWebcam,
    setShowWebcam,
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
  } = useHomeworkHelp({ onSubmitPhoto });

  const handleAskQuestion = () => {
    if (question.trim()) {
      onAskQuestion(question);
      setQuestion('');
    }
  };

  const handleFileClick = () => {
    if (isUploading) return;
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) {
      input.value = '';
      input.click();
    }
  };

  if (!homework) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
        />
        <UploadView
          pdfError={pdfError}
          photoPreview={photoPreview}
          isPdf={isPdf}
          pdfPages={pdfPages}
          currentPage={currentPage}
          pdfTotalPages={pdfTotalPages}
          isUploading={isUploading}
          analyzedPage={analyzedPage}
          showWebcam={showWebcam}
          onPdfErrorDismiss={() => setPdfError(null)}
          onPageChange={handlePageChange}
          onAnalyzePage={analyzePdfPage}
          onClosePreview={handleClosePreview}
          onWebcamClick={() => setShowWebcam(true)}
          onFileClick={handleFileClick}
          onWebcamCapture={handleWebcamCapture}
          onWebcamClose={() => setShowWebcam(false)}
        />
      </>
    );
  }

  return (
    <StepsView
      homework={homework}
      expandedStep={expandedStep}
      showHints={showHints}
      question={question}
      onToggleStep={(stepId) =>
        setExpandedStep(expandedStep === stepId ? null : stepId)
      }
      onShowHint={handleShowNextHint}
      onCompleteStep={onCompleteStep}
      onQuestionChange={setQuestion}
      onAskQuestion={handleAskQuestion}
    />
  );
}
