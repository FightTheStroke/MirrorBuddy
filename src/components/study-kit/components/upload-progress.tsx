'use client';

import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface UploadProgressProps {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  errorMessage: string;
  onReset: () => void;
}

export function UploadProgress({
  status,
  progress,
  errorMessage,
  onReset,
}: UploadProgressProps) {
  if (status === 'idle') {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {status === 'success' ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : status === 'error' ? (
          <AlertCircle className="w-5 h-5 text-red-600" />
        ) : (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        )}
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          {status === 'uploading' && 'Caricamento in corso...'}
          {status === 'processing' && 'Generazione materiali in corso...'}
          {status === 'success' && 'Study Kit generato con successo!'}
          {status === 'error' && 'Errore durante la generazione'}
        </p>
      </div>

      {status !== 'error' && (
        <Progress value={progress} className="h-2" />
      )}

      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}

      {status === 'processing' && (
        <p className="text-xs text-slate-500">
          Questo processo può richiedere alcuni minuti. Puoi chiudere questa finestra e
          tornare più tardi.
        </p>
      )}

      {(status === 'success' || status === 'error') && (
        <Button
          variant="outline"
          onClick={onReset}
          className="w-full"
        >
          Carica un altro PDF
        </Button>
      )}
    </div>
  );
}
