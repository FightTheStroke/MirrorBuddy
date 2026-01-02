'use client';

/**
 * StudyKitUpload Component
 * Upload PDF and track processing progress
 * Wave 2: Study Kit Generator
 */

import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        onUploadComplete?.(id);
      } else if (kit.status === 'error') {
        setUploadStatus('error');
        setErrorMessage(kit.errorMessage || 'Errore durante la generazione');
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
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          file ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-slate-300 dark:border-slate-600 hover:border-primary',
          uploadStatus !== 'idle' && 'pointer-events-none opacity-50'
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploadStatus !== 'idle'}
          aria-label="Carica file PDF"
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div className="text-left">
              <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
              <p className="text-sm text-slate-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {uploadStatus === 'idle' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                aria-label="Rimuovi file"
              >
                Rimuovi
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-12 h-12 mx-auto text-slate-400" />
            <div>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadStatus !== 'idle'}
              >
                Seleziona PDF
              </Button>
              <p className="mt-2 text-sm text-slate-500">
                oppure trascina qui il file (max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Form Fields */}
      {file && uploadStatus === 'idle' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Titolo *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es: Rivoluzione Francese"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Materia (opzionale)
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Es: Storia"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || !title || isUploading}
            className="w-full"
            size="lg"
          >
            <Upload className="w-4 h-4 mr-2" />
            Genera Study Kit
          </Button>
        </div>
      )}

      {/* Progress */}
      {uploadStatus !== 'idle' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {uploadStatus === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : uploadStatus === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            )}
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {uploadStatus === 'uploading' && 'Caricamento in corso...'}
              {uploadStatus === 'processing' && 'Generazione materiali in corso...'}
              {uploadStatus === 'success' && 'Study Kit generato con successo!'}
              {uploadStatus === 'error' && 'Errore durante la generazione'}
            </p>
          </div>

          {uploadStatus !== 'error' && (
            <Progress value={uploadProgress} className="h-2" />
          )}

          {errorMessage && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}

          {uploadStatus === 'processing' && (
            <p className="text-xs text-slate-500">
              Questo processo può richiedere alcuni minuti. Puoi chiudere questa finestra e
              tornare più tardi.
            </p>
          )}

          {(uploadStatus === 'success' || uploadStatus === 'error') && (
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full"
            >
              Carica un altro PDF
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
