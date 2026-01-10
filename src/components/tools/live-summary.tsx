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
import { SummaryEditor } from './summary-editor';
import { SummaryConnectionStatus } from './components/summary-connection-status';
import { SummaryActionsBar } from './components/summary-actions-bar';
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
      <SummaryConnectionStatus
        sessionId={sessionId}
        listenForEvents={listenForEvents}
        isConnected={isConnected}
      />

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

      <SummaryActionsBar
        isFinalized={isFinalized}
        readOnly={readOnly}
        data={data}
        onSave={handleSave}
        onExportPdf={onExportPdf}
        onConvertToMindmap={onConvertToMindmap}
        onGenerateFlashcards={onGenerateFlashcards}
      />
    </div>
  );
}

// Re-export types for convenience
export type { SummaryData, SummarySection };
