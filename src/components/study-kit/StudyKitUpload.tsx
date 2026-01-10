'use client';

/**
 * StudyKitUpload Component
 * Upload PDF and track processing progress
 * Wave 2: Study Kit Generator
 */

import { useState, useRef } from 'react';
import { UploadArea } from './components/upload-area';
import { UploadForm } from './components/upload-form';
import { UploadProgress } from './components/upload-progress';
import { cn } from '@/lib/utils';

interface StudyKitUploadProps {
  onUploadComplete?: (studyKitId: string) => void;
  className?: string;
}

export function StudyKitUpload({ onUploadComplete, className }: StudyKitUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [_studyKitId, setStudyKitId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.includes('pdf')) {
        setErrorMessage('Solo file PDF sono supportati');
        return;
      }

      // Validate file size (max 10MB)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (selectedFile.size > MAX_SIZE) {
        setErrorMessage('Il file deve essere inferiore a 10MB');
        return;
      }

      setFile(selectedFile);
      setErrorMessage('');

      // Auto-fill title from filename
      if (!title) {
        const name = selectedFile.name.replace('.pdf', '');
        setTitle(name);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Create a synthetic event for handleFileSelect
      const syntheticEvent = {
        target: { files: [droppedFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(syntheticEvent);
    }
  };

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
    if (!file || !title) {
      setErrorMessage('File e titolo sono richiesti');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(10);
    setErrorMessage('');

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      if (subject) {
        formData.append('subject', subject);
      }

      // Upload
      setUploadProgress(30);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <UploadArea
        file={file}
        isDisabled={uploadStatus !== 'idle'}
        onFileSelect={handleFileSelect}
        onDrop={handleDrop}
        onRemove={handleReset}
      />

      {file && uploadStatus === 'idle' && (
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
