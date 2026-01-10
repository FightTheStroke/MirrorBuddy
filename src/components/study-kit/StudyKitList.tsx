'use client';

/**
 * StudyKitList Component
 * List all study kits with filtering and status
 * Wave 2: Study Kit Generator
 */

import { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2, AlertCircle, Clock, CheckCircle2, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getStatusIcon, getStatusText, formatDate } from './study-kit-utils';
import type { StudyKit } from '@/types/study-kit';

interface StudyKitListProps {
  onSelect?: (studyKit: StudyKit) => void;
  className?: string;
}

export function StudyKitList({ onSelect, className }: StudyKitListProps) {
  const [studyKits, setStudyKits] = useState<StudyKit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'ready' | 'error'>('all');

  const loadStudyKits = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const url = new URL('/api/study-kit', window.location.origin);
      if (statusFilter !== 'all') {
        url.searchParams.set('status', statusFilter);
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load study kits');
      }

      const data = await response.json();
      setStudyKits(data.studyKits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      console.error('Failed to load study kits', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadStudyKits();
  }, [loadStudyKits]);

  const handleDelete = async (kitId: string, kitTitle: string) => {
    if (!confirm(`Sei sicuro di voler eliminare "${kitTitle}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/study-kit/${kitId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete study kit');
      }

      // Remove from local state
      setStudyKits(prev => prev.filter(kit => kit.id !== kitId));
    } catch (err) {
      console.error('Failed to delete study kit', err);
      alert('Errore durante l\'eliminazione. Riprova.');
    }
  };

  const getStatusIconElement = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'ready':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <Button
          variant="outline"
          onClick={loadStudyKits}
          className="mt-4"
        >
          Riprova
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">Stato:</span>
        <div className="flex gap-2">
          {(['all', 'processing', 'ready', 'error'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' && 'Tutti'}
              {status === 'processing' && 'In corso'}
              {status === 'ready' && 'Pronti'}
              {status === 'error' && 'Errori'}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {studyKits.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400">
            Nessuno Study Kit trovato
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Carica un PDF per iniziare
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {studyKits.map((kit) => (
            <div
              key={kit.id}
              className={cn(
                'bg-white dark:bg-slate-800 border rounded-2xl p-4 transition-all shadow-sm',
                'hover:shadow-lg hover:border-primary',
                kit.status === 'ready'
                  ? 'border-slate-200 dark:border-slate-700'
                  : kit.status === 'processing'
                  ? 'border-blue-200 dark:border-blue-800'
                  : 'border-red-200 dark:border-red-800'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {kit.title}
                    </h3>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                      {getStatusIconElement(kit.status)}
                      <span className="text-slate-700 dark:text-slate-300">
                        {getStatusText(kit.status)}
                      </span>
                    </div>
                  </div>

                  {kit.subject && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {kit.subject}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>{formatDate(kit.createdAt)}</span>
                    {kit.pageCount && <span>{kit.pageCount} pagine</span>}
                    {kit.status === 'ready' && (
                      <span className="text-green-600 dark:text-green-400">
                        {[kit.summary, kit.mindmap, kit.demo, kit.quiz].filter(Boolean).length} materiali
                      </span>
                    )}
                  </div>

                  {kit.status === 'processing' && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0 animate-spin" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                            Generazione in corso...
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                            Questo processo può richiedere alcuni minuti
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {kit.status === 'error' && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-red-800 dark:text-red-300">
                            Generazione fallita
                          </p>
                          {kit.errorMessage && (
                            <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                              {kit.errorMessage}
                            </p>
                          )}
                          <p className="text-xs text-red-600 dark:text-red-500 mt-2">
                            Puoi eliminare questo Study Kit e riprovare con un altro file.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-4 flex items-center gap-2">
                  {kit.status === 'ready' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelect?.(kit)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Apri
                    </Button>
                  )}
                  {kit.status === 'error' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(kit.id, kit.title)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Elimina
                    </Button>
                  )}
                  {kit.status === 'processing' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(kit.id, kit.title)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Annulla
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
