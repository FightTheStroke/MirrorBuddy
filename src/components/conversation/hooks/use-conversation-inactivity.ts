/**
 * Conversation Inactivity Hook
 * Tracks inactivity and auto-generates summaries on timeout/browser close
 * Extracted from conversation-flow.tsx (Issue #98)
 */

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { inactivityMonitor } from '@/lib/conversation/inactivity-monitor';
import { getOrCreateUserId, endConversationWithSummary } from '../utils/conversation-helpers';
import type { ActiveCharacter } from '@/lib/stores/conversation-flow-store';

interface ConversationsByCharacter {
  [characterId: string]: {
    conversationId?: string;
    messages: unknown[];
  };
}

/**
 * Hook to manage conversation inactivity tracking
 * - Registers timeout callback
 * - Tracks activity on conversation changes
 * - Auto-generates summary on browser/tab close
 */
export function useConversationInactivity(
  isActive: boolean,
  activeCharacter: ActiveCharacter | null,
  conversationsByCharacter: ConversationsByCharacter
) {
  // Register inactivity timeout callback on mount
  useEffect(() => {
    inactivityMonitor.setTimeoutCallback(async (conversationId: string) => {
      logger.info('Conversation timed out due to inactivity', { conversationId });
      await endConversationWithSummary(conversationId);
    });

    return () => {
      inactivityMonitor.stopAll();
    };
  }, []);

  // Track activity when conversation starts or changes
  useEffect(() => {
    if (!isActive || !activeCharacter) return;

    const userId = getOrCreateUserId();
    if (!userId) return;

    const conversationId = conversationsByCharacter[activeCharacter.id]?.conversationId;
    if (!conversationId) return;

    // Start/reset inactivity timer
    inactivityMonitor.trackActivity(conversationId, userId, activeCharacter.id);
    logger.debug('Tracking conversation activity', { conversationId, characterId: activeCharacter.id });
  }, [isActive, activeCharacter, conversationsByCharacter]);

  // Auto-generate summary when user closes browser/tab
  useEffect(() => {
    if (!isActive || !activeCharacter) return;

    const userId = getOrCreateUserId();
    if (!userId) return;

    const conversationId = conversationsByCharacter[activeCharacter.id]?.conversationId;
    if (!conversationId) return;

    const handleBeforeUnload = () => {
      // Best-effort: sendBeacon may not complete before browser closes.
      // Inactivity timeout (INACTIVITY_TIMEOUT_MS) serves as fallback for summary generation.
      navigator.sendBeacon(
        `/api/conversations/${conversationId}/end`,
        new Blob(
          [JSON.stringify({ userId, reason: 'browser_close' })],
          { type: 'application/json' }
        )
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isActive, activeCharacter, conversationsByCharacter]);
}
