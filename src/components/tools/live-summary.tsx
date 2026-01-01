'use client';

/**
 * LiveSummary Component
 *
 * Combines SummaryEditor with SSE event listening for real-time
 * voice command modifications. This is the primary summary component
 * for conversation-first tool building.
 *
 * Part of Issue #70: Real-time summary tool
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Save, Download, Brain, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SummaryEditor } from './summary-editor';
import {
  useSummaryModifications,
  type SummaryModificationCallbacks,
} from '@/lib/hooks/use-summary-modifications';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import type { SummaryData, SummarySection } from '@/types/tools';

// ============================================================================
// TYPES
// ============================================================================

export interface LiveSummaryProps {
  /** Initial summary data */
  initialData?: SummaryData;
  /** Session ID for SSE subscription */
  sessionId: string | null;
  /** Whether to listen for SSE events (default: true when sessionId provided) */
  listenForEvents?: boolean;
  /** Callback when summary changes */
  onDataChange?: (data: SummaryData) => void;
  /** Callback when summary is finalized (saved) */
  onFinalize?: (data: SummaryData) => void;
  /** Callback for PDF export */
  onExportPdf?: (data: SummaryData) => void;
  /** Callback for converting to mindmap */
  onConvertToMindmap?: (data: SummaryData) => void;
  /** Callback for generating flashcards */
  onGenerateFlashcards?: (data: SummaryData) => void;
  /** Whether editing is allowed */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LiveSummary({
  initialData,
  sessionId,
  listenForEvents = true,
  onDataChange,
  onFinalize,
  onExportPdf,
  onConvertToMindmap,
  onGenerateFlashcards,
  readOnly = false,
  className,
}: LiveSummaryProps) {
  const [data, setData] = useState<SummaryData>(
    initialData || {
      topic: 'Nuovo Riassunto',
      sections: [],
    }
  );
  const [isFinalized, setIsFinalized] = useState(false);
  const dataRef = useRef(data);

  // Keep dataRef in sync (use useEffect to avoid updating during render)
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Update data helper
  const updateData = useCallback(
    (updater: (prev: SummaryData) => SummaryData) => {
      setData((prev) => {
        const next = updater(prev);
        onDataChange?.(next);
        return next;
      });
    },
    [onDataChange]
  );

  // Define modification callbacks
  const callbacks: SummaryModificationCallbacks = {
    onSetTitle: useCallback(
      (title: string) => {
        logger.info('[LiveSummary] Setting title', { title });
        updateData((prev) => ({ ...prev, topic: title }));
      },
      [updateData]
    ),

    onAddSection: useCallback(
      (title: string, content?: string, keyPoints?: string[]) => {
        logger.info('[LiveSummary] Adding section', { title, content, keyPoints });
        updateData((prev) => ({
          ...prev,
          sections: [
            ...prev.sections,
            { title, content: content || '', keyPoints: keyPoints || [] },
          ],
        }));
      },
      [updateData]
    ),

    onUpdateSection: useCallback(
      (sectionIndex: number, updates: { title?: string; content?: string; keyPoints?: string[] }) => {
        logger.info('[LiveSummary] Updating section', { sectionIndex, updates });
        updateData((prev) => ({
          ...prev,
          sections: prev.sections.map((s, i) =>
            i === sectionIndex
              ? {
                  ...s,
                  ...(updates.title !== undefined && { title: updates.title }),
                  ...(updates.content !== undefined && { content: updates.content }),
                  ...(updates.keyPoints !== undefined && { keyPoints: updates.keyPoints }),
                }
              : s
          ),
        }));
      },
      [updateData]
    ),

    onDeleteSection: useCallback(
      (sectionIndex: number) => {
        logger.info('[LiveSummary] Deleting section', { sectionIndex });
        updateData((prev) => ({
          ...prev,
          sections: prev.sections.filter((_, i) => i !== sectionIndex),
        }));
      },
      [updateData]
    ),

    onAddPoint: useCallback(
      (sectionIndex: number, point: string) => {
        logger.info('[LiveSummary] Adding point', { sectionIndex, point });
        updateData((prev) => ({
          ...prev,
          sections: prev.sections.map((s, i) =>
            i === sectionIndex
              ? { ...s, keyPoints: [...(s.keyPoints || []), point] }
              : s
          ),
        }));
      },
      [updateData]
    ),

    onDeletePoint: useCallback(
      (sectionIndex: number, pointIndex: number) => {
        logger.info('[LiveSummary] Deleting point', { sectionIndex, pointIndex });
        updateData((prev) => ({
          ...prev,
          sections: prev.sections.map((s, i) =>
            i === sectionIndex
              ? {
                  ...s,
                  keyPoints: (s.keyPoints || []).filter((_, pi) => pi !== pointIndex),
                }
              : s
          ),
        }));
      },
      [updateData]
    ),

    onFinalize: useCallback(() => {
      logger.info('[LiveSummary] Finalizing summary');
      setIsFinalized(true);
      onFinalize?.(dataRef.current);
    }, [onFinalize]),
  };

  // Subscribe to SSE modifications
  const { isConnected } = useSummaryModifications({
    sessionId,
    enabled: listenForEvents && !!sessionId,
    callbacks,
  });

  // Handle title change from editor
  const handleTitleChange = useCallback(
    (title: string) => {
      updateData((prev) => ({ ...prev, topic: title }));
    },
    [updateData]
  );

  // Handle sections change from editor
  const handleSectionsChange = useCallback(
    (sections: SummarySection[]) => {
      updateData((prev) => ({ ...prev, sections }));
    },
    [updateData]
  );

  // Handle manual save
  const handleSave = useCallback(() => {
    setIsFinalized(true);
    onFinalize?.(data);
  }, [data, onFinalize]);

  logger.debug('[LiveSummary] Render', {
    sessionId,
    listenForEvents,
    isConnected,
    sectionsCount: data.sections.length,
  });

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Connection Status */}
      {sessionId && listenForEvents && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 dark:text-green-400">
                Connesso - modifica vocale attiva
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Connessione in corso...
              </span>
            </>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-auto p-4">
        <SummaryEditor
          title={data.topic}
          sections={data.sections}
          onTitleChange={handleTitleChange}
          onSectionsChange={handleSectionsChange}
          readOnly={readOnly || isFinalized}
        />
      </div>

      {/* Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left Actions */}
          <div className="flex items-center gap-2">
            {!isFinalized && !readOnly && (
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Salva
              </Button>
            )}
            {isFinalized && (
              <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <Save className="w-4 h-4" />
                Salvato
              </span>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {onExportPdf && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExportPdf(data)}
                className="gap-2"
                title="Esporta come PDF"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            )}

            {onConvertToMindmap && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConvertToMindmap(data)}
                className="gap-2"
                title="Converti in mappa mentale"
              >
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">Mappa</span>
              </Button>
            )}

            {onGenerateFlashcards && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGenerateFlashcards(data)}
                className="gap-2"
                title="Genera flashcard dai punti chiave"
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Flashcard</span>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Re-export types for convenience
export type { SummaryData, SummarySection };
