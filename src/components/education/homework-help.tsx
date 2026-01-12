'use client';

/**
 * HomeworkHelp Component
 * ADR 0038: Google Drive Integration support
 */

import { useRef, useState, useCallback } from 'react';
import type { Homework } from '@/types';
import { useHomeworkHelp } from './homework-help/hooks/use-homework-help';
import { UploadView } from './homework-help/components/upload-view';
import { StepsView } from './homework-help/components/steps-view';
import { GoogleDrivePicker, useGoogleDrive } from '@/components/google-drive';
import { getUserId } from '@/lib/hooks/use-saved-materials/utils/user-id';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Cloud } from 'lucide-react';

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
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const userId = getUserId();
  const { isConnected: isGoogleDriveConnected } = useGoogleDrive({ userId });

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

  const handleGoogleDriveClick = useCallback(() => {
    if (isGoogleDriveConnected) {
      setIsDriveModalOpen(true);
    }
  }, [isGoogleDriveConnected]);

  const handleDriveFileSelect = useCallback(async (driveFile: { id: string; name: string; mimeType: string }) => {
    setIsDriveModalOpen(false);

    // Download the file from Google Drive
    const downloadResponse = await fetch(`/api/google-drive/files/${driveFile.id}/download?userId=${userId}`);

    if (!downloadResponse.ok) {
      setPdfError('Impossibile scaricare il file da Google Drive');
      return;
    }

    const blob = await downloadResponse.blob();
    const file = new File([blob], driveFile.name, { type: driveFile.mimeType });

    // Create a synthetic FileList and call the existing handler
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const syntheticEvent = {
      target: { files: dataTransfer.files },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    handleFileSelect(syntheticEvent);
  }, [handleFileSelect, setPdfError, userId]);

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
          onGoogleDriveClick={handleGoogleDriveClick}
          isGoogleDriveConnected={isGoogleDriveConnected}
        />

        {/* Google Drive file picker modal */}
        <Dialog open={isDriveModalOpen} onOpenChange={setIsDriveModalOpen}>
          <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                Seleziona da Google Drive
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <GoogleDrivePicker
                userId={userId}
                onFileSelect={handleDriveFileSelect}
                acceptedTypes={['image/jpeg', 'image/png', 'image/gif', 'application/pdf']}
                className="h-full"
              />
            </div>
          </DialogContent>
        </Dialog>
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
