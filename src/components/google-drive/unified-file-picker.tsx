'use client';

/**
 * UnifiedFilePicker Component
 * ADR 0038 - Google Drive Integration
 *
 * Combined file picker: local upload OR Google Drive selection.
 * Cross-tool component used by Study Kit, Homework Help, etc.
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, Cloud, HardDrive, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { GoogleDrivePicker } from './google-drive-picker';
import type { DriveFileUI } from '@/lib/google';

type FileSource = 'local' | 'google-drive';

interface SelectedFile {
  source: FileSource;
  file?: File; // For local files
  driveFile?: DriveFileUI; // For Drive files
  name: string;
  size?: number;
  mimeType: string;
}

interface UnifiedFilePickerProps {
  userId: string;
  onFileSelect: (file: SelectedFile) => void;
  onFileDownload?: (fileId: string) => Promise<Blob>; // For downloading Drive files
  accept?: string; // File input accept attribute (e.g., ".pdf,image/*")
  acceptedMimeTypes?: string[]; // MIME types for Drive filter
  maxSizeMB?: number;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

export function UnifiedFilePicker({
  userId,
  onFileSelect,
  accept = '*/*',
  acceptedMimeTypes,
  maxSizeMB = 10,
  label = 'Seleziona un file',
  description,
  className,
  disabled = false,
}: UnifiedFilePickerProps) {
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local file selection
  const handleLocalFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`Il file è troppo grande. Massimo ${maxSizeMB}MB.`);
      return;
    }

    setError(null);
    const selected: SelectedFile = {
      source: 'local',
      file,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    };
    setSelectedFile(selected);
    onFileSelect(selected);
  }, [maxSizeMB, onFileSelect]);

  // Handle Drive file selection
  const handleDriveFileSelect = useCallback(async (driveFile: DriveFileUI) => {
    setError(null);
    const selected: SelectedFile = {
      source: 'google-drive',
      driveFile,
      name: driveFile.name,
      size: driveFile.size,
      mimeType: driveFile.mimeType,
    };
    setSelectedFile(selected);
    setIsDriveModalOpen(false);
    onFileSelect(selected);
  }, [onFileSelect]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      handleLocalFileSelect(e.dataTransfer.files);
    }
  }, [disabled, handleLocalFileSelect]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Label */}
      {label && (
        <div>
          <span className="text-sm font-medium">{label}</span>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}

      {/* Selected file display */}
      {selectedFile ? (
        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex-shrink-0">
            {selectedFile.source === 'google-drive' ? (
              <Cloud className="w-8 h-8 text-blue-500" />
            ) : (
              <HardDrive className="w-8 h-8 text-slate-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{selectedFile.name}</div>
            <div className="text-sm text-muted-foreground flex gap-2">
              <span>
                {selectedFile.source === 'google-drive' ? 'Google Drive' : 'File locale'}
              </span>
              {selectedFile.size && (
                <>
                  <span>•</span>
                  <span>{formatSize(selectedFile.size)}</span>
                </>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <>
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative border-2 border-dashed rounded-lg p-8 transition-colors',
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                : 'border-slate-200 dark:border-slate-700',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex flex-col items-center text-center">
              <Upload className="w-10 h-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Trascina un file qui oppure
              </p>

              {/* Source buttons */}
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                >
                  <HardDrive className="w-4 h-4 mr-2" />
                  Dal computer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDriveModalOpen(true)}
                  disabled={disabled}
                >
                  <Cloud className="w-4 h-4 mr-2" />
                  Da Google Drive
                </Button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={(e) => handleLocalFileSelect(e.target.files)}
                className="hidden"
                disabled={disabled}
              />

              <p className="text-xs text-muted-foreground mt-4">
                Massimo {maxSizeMB}MB
              </p>
            </div>
          </div>
        </>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Google Drive Modal */}
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
              acceptedTypes={acceptedMimeTypes}
              className="h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export type for consumers
export type { SelectedFile, FileSource };
