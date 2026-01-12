'use client';

/**
 * DropZone Component
 * Drag-and-drop zone with local/Drive file selection buttons
 */

import { useRef, useCallback } from 'react';
import { Upload, Cloud, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  accept: string;
  maxSizeMB: number;
  disabled: boolean;
  isDragging: boolean;
  isPickerLoading: boolean;
  isPickerReady: boolean;
  useNativePicker: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onLocalFileSelect: (files: FileList | null) => void;
  onOpenDrivePicker: () => void;
  onOpenDriveModal: () => void;
}

export function DropZone({
  accept,
  maxSizeMB,
  disabled,
  isDragging,
  isPickerLoading,
  isPickerReady,
  useNativePicker,
  onDragOver,
  onDragLeave,
  onDrop,
  onLocalFileSelect,
  onOpenDrivePicker,
  onOpenDriveModal,
}: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDriveClick = useCallback(() => {
    if (useNativePicker && isPickerReady) {
      onOpenDrivePicker();
    } else {
      onOpenDriveModal();
    }
  }, [useNativePicker, isPickerReady, onOpenDrivePicker, onOpenDriveModal]);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'relative border-2 border-dashed rounded-lg p-8 transition-colors',
        isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex flex-col items-center text-center">
        <Upload className="w-10 h-10 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-4">Trascina un file qui oppure</p>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
            <HardDrive className="w-4 h-4 mr-2" />
            Dal computer
          </Button>
          <Button
            variant="outline"
            onClick={handleDriveClick}
            disabled={disabled || (useNativePicker && isPickerLoading)}
          >
            <Cloud className="w-4 h-4 mr-2" />
            {isPickerLoading ? 'Caricamento...' : 'Da Google Drive'}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => onLocalFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        <p className="text-xs text-muted-foreground mt-4">Massimo {maxSizeMB}MB</p>
      </div>
    </div>
  );
}
