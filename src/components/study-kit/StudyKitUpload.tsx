'use client';

/**
 * StudyKitUpload Component
 * Upload PDF and track processing progress
 * Wave 2: Study Kit Generator
 * ADR 0038: Google Drive Integration support
 */

import { useState, useRef, useCallback } from 'react';
import { UploadForm } from './components/upload-form';
import { UploadProgress } from './components/upload-progress';
import { UnifiedFilePicker, type SelectedFile } from '@/components/google-drive';
import { getUserId } from '@/lib/hooks/use-saved-materials/utils/user-id';
import { cn } from '@/lib/utils';

interface StudyKitUploadProps {
  onUploadComplete?: (studyKitId: string) => void;
  className?: string;
}

export function StudyKitUpload({ onUploadComplete, className }: StudyKitUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedDriveFile, setSelectedDriveFile] = useState<SelectedFile | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [_studyKitId, setStudyKitId] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = useCallback((selected: SelectedFile) => {
    // Validate file type
    if (!selected.mimeType.includes('pdf')) {
      setErrorMessage('Solo file PDF sono supportati');
      return;
    }

    setErrorMessage('');

    if (selected.source === 'local' && selected.file) {
      setFile(selected.file);
      setSelectedDriveFile(null);
    } else if (selected.source === 'google-drive' && selected.driveFile) {
      setFile(null);
      setSelectedDriveFile(selected);
    }

    // Auto-fill title from filename
    if (!title) {
      const name = selected.name.replace('.pdf', '');
      setTitle(name);
    }
  }, [title]);

  const pollStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/study-kit/${id}`);
      if (!response.ok) {
        throw new Error('Failed to check status');
      }

      const data = await response.json();
      const kit = data.studyKit;

      if (kit.status === 'ready') {
        setUploadStatus('success');
        setUploadProgress(100);
        setIsUploading(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        onUploadComplete?.(id);
      } else if (kit.status === 'error') {
        setUploadStatus('error');
        setErrorMessage(kit.errorMessage || 'Errore durante la generazione');
        setIsUploading(false);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
      // If still processing, continue polling
    } catch (error) {
      console.error('Failed to poll status', error);
    }
  };

  const handleUpload = async () => {
    if ((!file && !selectedDriveFile) || !title) {
      setErrorMessage('File e titolo sono richiesti');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(10);
    setErrorMessage('');

    try {
      let uploadFile: File;

      // If Google Drive file, download it first
      if (selectedDriveFile?.source === 'google-drive' && selectedDriveFile.driveFile) {
        setUploadProgress(20);
        const downloadResponse = await fetch(
          `/api/google-drive/files/${selectedDriveFile.driveFile.id}/download`
        );

        if (!downloadResponse.ok) {
          throw new Error('Impossibile scaricare il file da Google Drive');
        }

        const blob = await downloadResponse.blob();
        uploadFile = new File([blob], selectedDriveFile.name, {
          type: selectedDriveFile.mimeType,
        });
      } else if (file) {
        uploadFile = file;
      } else {
        throw new Error('Nessun file selezionato');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', title);
      if (subject) {
        formData.append('subject', subject);
      }

      // Upload
      setUploadProgress(40);
      const response = await fetch('/api/study-kit/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(50);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setStudyKitId(data.studyKitId);
      setUploadStatus('processing');
      setUploadProgress(60);

      // Start polling for status
      pollIntervalRef.current = setInterval(() => {
        pollStatus(data.studyKitId);
      }, 3000);
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload fallito');
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSelectedDriveFile(null);
    setTitle('');
    setSubject('');
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatus('idle');
    setErrorMessage('');
    setStudyKitId(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const hasFile = file !== null || selectedDriveFile !== null;

  return (
    <div className={cn('space-y-6', className)}>
      {uploadStatus === 'idle' && (
        <UnifiedFilePicker
          userId={getUserId()}
          onFileSelect={handleFileSelect}
          accept=".pdf"
          acceptedMimeTypes={['application/pdf']}
          maxSizeMB={10}
          label="Carica il tuo PDF"
          description="Seleziona un file PDF dal computer o da Google Drive per generare il tuo Study Kit"
          disabled={isUploading}
        />
      )}

      {hasFile && uploadStatus === 'idle' && (
        <UploadForm
          title={title}
          subject={subject}
          error={errorMessage}
          isLoading={isUploading}
          onTitleChange={setTitle}
          onSubjectChange={setSubject}
          onSubmit={handleUpload}
        />
      )}

      <UploadProgress
        status={uploadStatus}
        progress={uploadProgress}
        errorMessage={errorMessage}
        onReset={handleReset}
      />
    </div>
  );
}
