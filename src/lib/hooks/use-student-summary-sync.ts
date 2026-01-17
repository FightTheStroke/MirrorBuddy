/**
 * useStudentSummarySync Hook
 *
 * SSE hook for real-time sync between student editor and Maestro.
 * Part of Issue #70: Collaborative summary writing with maieutic method
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import type { StudentSummaryData, InlineComment, StudentSummarySection } from '@/types/tools';

export type StudentSummaryCommand =
  | 'student_summary_add_comment'
  | 'student_summary_remove_comment'
  | 'student_summary_update_content'
  | 'student_summary_request_content'
  | 'student_summary_save'
  | 'student_summary_complete';

export interface StudentSummaryEvent {
  id: string;
  type: 'student_summary:modify';
  sessionId: string;
  maestroId?: string;
  timestamp: number;
  data: {
    command: StudentSummaryCommand;
    args: StudentSummaryArgs;
  };
}

export type StudentSummaryArgs =
  | AddCommentArgs
  | RemoveCommentArgs
  | UpdateContentArgs
  | Record<string, never>;

export interface AddCommentArgs {
  sectionId: string;
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface RemoveCommentArgs {
  sectionId: string;
  commentId: string;
}

export interface UpdateContentArgs {
  sectionId: string;
  content: string;
}

export interface StudentSummaryCallbacks {
  onAddComment?: (sectionId: string, comment: Omit<InlineComment, 'id' | 'createdAt'>) => void;
  onRemoveComment?: (sectionId: string, commentId: string) => void;
  onContentUpdate?: (sectionId: string, content: string) => void;
  onContentRequested?: () => StudentSummaryData | null;
  onSave?: () => void;
  onComplete?: () => void;
}

export interface UseStudentSummarySyncOptions {
  sessionId: string | null;
  summaryId?: string;
  enabled?: boolean;
  callbacks: StudentSummaryCallbacks;
}

export interface UseStudentSummarySyncResult {
  isConnected: boolean;
  lastEvent: StudentSummaryEvent | null;
  reconnect: () => void;
  broadcastContentChange: (sectionId: string, content: string) => void;
  broadcastSave: () => void;
}

export function useStudentSummarySync({
  sessionId,
  summaryId,
  enabled = true,
  callbacks,
}: UseStudentSummarySyncOptions): UseStudentSummarySyncResult {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<StudentSummaryEvent | null>(null);

  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const handleEvent = useCallback((event: MessageEvent) => {
    try {
      if (event.data.startsWith(':')) return;
      const data = JSON.parse(event.data);
      if (data.type !== 'student_summary:modify') return;

      const modifyEvent = data as StudentSummaryEvent;
      setLastEvent(modifyEvent);
      const { command, args } = modifyEvent.data;

      logger.info('[StudentSummarySync] Received', { command });

      switch (command) {
        case 'student_summary_add_comment': {
          const { sectionId, startOffset, endOffset, text } = args as AddCommentArgs;
          callbacksRef.current.onAddComment?.(sectionId, {
            startOffset, endOffset, text,
            maestroId: modifyEvent.maestroId || 'unknown',
          });
          break;
        }
        case 'student_summary_remove_comment': {
          const { sectionId, commentId } = args as RemoveCommentArgs;
          callbacksRef.current.onRemoveComment?.(sectionId, commentId);
          break;
        }
        case 'student_summary_update_content': {
          const { sectionId, content } = args as UpdateContentArgs;
          callbacksRef.current.onContentUpdate?.(sectionId, content);
          break;
        }
        case 'student_summary_request_content':
          callbacksRef.current.onContentRequested?.();
          break;
        case 'student_summary_save':
          callbacksRef.current.onSave?.();
          break;
        case 'student_summary_complete':
          callbacksRef.current.onComplete?.();
          break;
      }
    } catch (error) {
      logger.error('[StudentSummarySync] Parse error', { error: String(error) });
    }
  }, []);

  const connect = useCallback(() => {
    if (!sessionId || !enabled) return;
    eventSourceRef.current?.close();

    const params = new URLSearchParams({ sessionId, toolType: 'student_summary' });
    if (summaryId) params.set('summaryId', summaryId);

    const eventSource = new EventSource(`/api/tools/sse?${params}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      logger.info('[StudentSummarySync] Connected');
      setIsConnected(true);
    };
    eventSource.onmessage = handleEvent;
    eventSource.onerror = () => {
      setIsConnected(false);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connectRef.current, 3000);
    };
  }, [sessionId, summaryId, enabled, handleEvent]);

  useEffect(() => { connectRef.current = connect; }, [connect]);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    connect();
  }, [connect]);

  const broadcastContentChange = useCallback(async (sectionId: string, content: string) => {
    if (!sessionId) return;
    try {
      await fetch('/api/tools/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'student_summary:modify',
          sessionId,
          data: { command: 'student_summary_update_content', args: { sectionId, content } },
        }),
      });
    } catch (error) {
      logger.error('[StudentSummarySync] Broadcast failed', undefined, error);
    }
  }, [sessionId]);

  const broadcastSave = useCallback(async () => {
    if (!sessionId) return;
    try {
      await fetch('/api/tools/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'student_summary:modify',
          sessionId,
          data: { command: 'student_summary_save', args: {} },
        }),
      });
    } catch (error) {
      logger.error('[StudentSummarySync] Broadcast save failed', undefined, error);
    }
  }, [sessionId]);

  useEffect(() => {
    if (enabled && sessionId) connect();
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      setIsConnected(false);
    };
  }, [sessionId, enabled, connect]);

  return { isConnected, lastEvent, reconnect, broadcastContentChange, broadcastSave };
}

export function countWords(content: string): number {
  if (!content) return 0;
  return content.replace(/[#*_`~\[\]()]/g, '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
}

export function calculateTotalWordCount(sections: StudentSummarySection[]): number {
  return sections.reduce((t, s) => t + countWords(s.content), 0);
}
