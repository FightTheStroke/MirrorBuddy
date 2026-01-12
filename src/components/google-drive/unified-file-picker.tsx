'use client';

/**
 * UnifiedFilePicker Component
 * ADR 0038 - Google Drive Integration
 * Combined file picker: local upload OR Google Drive selection
 */

import { useState, useCallback } from 'react';
import { Cloud } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { GoogleDrivePicker } from './google-drive-picker';
import { useGooglePicker, type GooglePickerDocument } from './use-google-picker';
import type { DriveFileUI } from '@/lib/google';
import { DropZone, SelectedFileDisplay } from './unified-file-picker/index';
import type { SelectedFile, UnifiedFilePickerProps } from './unified-file-picker/types';

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
  useNativePicker = true,
}: UnifiedFilePickerProps) {
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNativePickerSelect = useCallback((docs: GooglePickerDocument[]) => {
    if (docs.length === 0) return;
    const doc = docs[0];
    setError(null);
    const selected: SelectedFile = {
      source: 'google-drive',
      driveFile: {
        id: doc.id,
        name: doc.name,
        mimeType: doc.mimeType,
        size: doc.sizeBytes,
        modifiedAt: doc.lastEditedUtc ? new Date(doc.lastEditedUtc) : new Date(),
        isFolder: false,
      },
      name: doc.name,
      size: doc.sizeBytes,
      mimeType: doc.mimeType,
    };
    setSelectedFile(selected);
    onFileSelect(selected);
  }, [onFileSelect]);

  const { openPicker, isLoading: isPickerLoading, isReady: isPickerReady } = useGooglePicker({
    userId,
    onSelect: handleNativePickerSelect,
    mimeTypes: acceptedMimeTypes,
    multiSelect: false,
  });

  const handleLocalFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`Il file è troppo grande. Massimo ${maxSizeMB}MB.`);
      return;
    }
    setError(null);
    const selected: SelectedFile = { source: 'local', file, name: file.name, size: file.size, mimeType: file.type };
    setSelectedFile(selected);
    onFileSelect(selected);
  }, [maxSizeMB, onFileSelect]);

  const handleDriveFileSelect = useCallback((driveFile: DriveFileUI) => {
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
    if (!disabled) handleLocalFileSelect(e.dataTransfer.files);
  }, [disabled, handleLocalFileSelect]);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {label && (
        <div>
          <span className="text-sm font-medium">{label}</span>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}

      {selectedFile ? (
        <SelectedFileDisplay selectedFile={selectedFile} onClear={clearSelection} disabled={disabled} />
      ) : (
        <DropZone
          accept={accept}
          maxSizeMB={maxSizeMB}
          disabled={disabled}
          isDragging={isDragging}
          isPickerLoading={isPickerLoading}
          isPickerReady={isPickerReady}
          useNativePicker={useNativePicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onLocalFileSelect={handleLocalFileSelect}
          onOpenDrivePicker={openPicker}
          onOpenDriveModal={() => setIsDriveModalOpen(true)}
        />
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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

export type { SelectedFile, FileSource } from './unified-file-picker/types';
