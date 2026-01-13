'use client';

/**
 * SelectedFileDisplay Component
 * Shows the currently selected file with source indicator
 */

import { Cloud, HardDrive, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SelectedFile } from './types';
import { formatFileSize } from './types';

interface SelectedFileDisplayProps {
  selectedFile: SelectedFile;
  onClear: () => void;
  disabled?: boolean;
}

export function SelectedFileDisplay({ selectedFile, onClear, disabled }: SelectedFileDisplayProps) {
  return (
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
              <span>-</span>
              <span>{formatFileSize(selectedFile.size)}</span>
            </>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onClear} disabled={disabled}>
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
