// ============================================================================
// INACTIVITY MONITOR
// Tracks conversation activity and triggers summary after 5 min timeout
// Part of Session Summary & Unified Archive feature
// Updated for Phase 3: 5-minute context keep-alive
// ============================================================================

import { logger } from '@/lib/logger';

export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const WARNING_BEFORE_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute warning

type TimeoutCallback = (conversationId: string) => void | Promise<void>;
type WarningCallback = (conversationId: string, timeRemainingMs: number) => void;
type TimerPauseCallback = () => void;
type TimerResumeCallback = () => void;

interface ActiveConversation {
  conversationId: string;
  userId: string;
  characterId: string;
  lastActivity: number;
  timeoutId: ReturnType<typeof setTimeout>;
  warningId?: ReturnType<typeof setTimeout>;
}

class InactivityMonitor {
  private conversations: Map<string, ActiveConversation> = new Map();
  private onTimeoutCallback: TimeoutCallback | null = null;
  private onWarningCallback: WarningCallback | null = null;
  private onTimerPauseCallback: TimerPauseCallback | null = null;
  private onTimerResumeCallback: TimerResumeCallback | null = null;

  /**
   * Set callback to be called when a conversation times out
   */
  setTimeoutCallback(callback: TimeoutCallback): void {
    this.onTimeoutCallback = callback;
  }

  /**
   * Set callback to be called when timeout warning should be shown
   */
  setWarningCallback(callback: WarningCallback): void {
    this.onWarningCallback = callback;
  }

  /**
   * Set callback to be called when timer should pause
   */
  setTimerPauseCallback(callback: TimerPauseCallback): void {
    this.onTimerPauseCallback = callback;
  }

  /**
   * Set callback to be called when timer should resume
   */
  setTimerResumeCallback(callback: TimerResumeCallback): void {
    this.onTimerResumeCallback = callback;
  }

  /**
   * Trigger timer pause (called externally when inactivity detected)
   */
  triggerTimerPause(): void {
    if (this.onTimerPauseCallback) {
      this.onTimerPauseCallback();
    }
  }

  /**
   * Trigger timer resume (called externally when activity resumes)
   */
  triggerTimerResume(): void {
    if (this.onTimerResumeCallback) {
      this.onTimerResumeCallback();
    }
  }

  /**
   * Start or reset timer for a conversation
   */
  trackActivity(conversationId: string, userId: string, characterId: string): void {
    // Clear existing timers if any
    const existing = this.conversations.get(conversationId);
    if (existing) {
      clearTimeout(existing.timeoutId);
      if (existing.warningId) {
        clearTimeout(existing.warningId);
      }
    }

    // Set warning timer (1 minute before timeout)
    const warningId = setTimeout(() => {
      this.handleWarning(conversationId);
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS);

    // Set timeout timer
    const timeoutId = setTimeout(() => {
      this.handleTimeout(conversationId);
    }, INACTIVITY_TIMEOUT_MS);

    this.conversations.set(conversationId, {
      conversationId,
      userId,
      characterId,
      lastActivity: Date.now(),
      timeoutId,
      warningId,
    });

    logger.debug('Inactivity timer reset', {
      conversationId,
      timeoutMinutes: INACTIVITY_TIMEOUT_MS / 60000,
    });
  }

  /**
   * Stop tracking a conversation (e.g., when explicitly closed)
   */
  stopTracking(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      clearTimeout(conversation.timeoutId);
      if (conversation.warningId) {
        clearTimeout(conversation.warningId);
      }
      this.conversations.delete(conversationId);
      logger.debug('Stopped tracking conversation', { conversationId });
    }
  }

  /**
   * Check if a conversation is being tracked
   */
  isTracking(conversationId: string): boolean {
    return this.conversations.has(conversationId);
  }

  /**
   * Get time remaining before timeout (in ms)
   */
  getTimeRemaining(conversationId: string): number | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    const elapsed = Date.now() - conversation.lastActivity;
    return Math.max(0, INACTIVITY_TIMEOUT_MS - elapsed);
  }

  /**
   * Get all active conversations
   */
  getActiveConversations(): Array<{
    conversationId: string;
    userId: string;
    characterId: string;
    timeRemainingMs: number;
  }> {
    return Array.from(this.conversations.values()).map((conv) => ({
      conversationId: conv.conversationId,
      userId: conv.userId,
      characterId: conv.characterId,
      timeRemainingMs: Math.max(0, INACTIVITY_TIMEOUT_MS - (Date.now() - conv.lastActivity)),
    }));
  }

  /**
   * Stop all tracking (for cleanup)
   */
  stopAll(): void {
    for (const [id, conv] of this.conversations) {
      clearTimeout(conv.timeoutId);
      if (conv.warningId) {
        clearTimeout(conv.warningId);
      }
      logger.debug('Stopped tracking (cleanup)', { conversationId: id });
    }
    this.conversations.clear();
  }

  private handleWarning(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    logger.info('Conversation approaching timeout', {
      conversationId,
      timeRemainingMs: WARNING_BEFORE_TIMEOUT_MS,
    });

    // Call the warning callback if set
    if (this.onWarningCallback) {
      this.onWarningCallback(conversationId, WARNING_BEFORE_TIMEOUT_MS);
    }
  }

  private async handleTimeout(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    logger.info('Conversation timed out due to inactivity', {
      conversationId,
      userId: conversation.userId,
      characterId: conversation.characterId,
      inactivityMinutes: INACTIVITY_TIMEOUT_MS / 60000,
    });

    // Remove from tracking
    this.conversations.delete(conversationId);

    // Call the callback if set
    if (this.onTimeoutCallback) {
      try {
        await this.onTimeoutCallback(conversationId);
      } catch (error) {
        logger.error('Error in inactivity timeout callback', {
          conversationId,
          error: String(error),
        });
      }
    }
  }
}

// Singleton instance
export const inactivityMonitor = new InactivityMonitor();

// Export class for testing
export { InactivityMonitor };
