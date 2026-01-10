'use client';

import { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UploadAreaProps {
  file: File | null;
  isDisabled: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onRemove: () => void;
}

export function UploadArea({
  file,
  isDisabled,
  onFileSelect,
  onDrop,
  onRemove,
}: UploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        file ? 'border-primary bg-primary/5' : 'border-slate-300 dark:border-slate-600 hover:border-primary',
        isDisabled && 'pointer-events-none opacity-50'
      )}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={onFileSelect}
        className="hidden"
        disabled={isDisabled}
        aria-label="Carica file PDF"
      />

      {file ? (
        <div className="flex items-center justify-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <div className="text-left">
            <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
            <p className="text-sm text-slate-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          {!isDisabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
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
              disabled={isDisabled}
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
  );
}
