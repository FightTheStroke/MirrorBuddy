/**
 * ConversationShell - Shared conversation layout primitive
 *
 * Provides the common structure for all character chat flows:
 * - Scrollable message list with auto-scroll
 * - Input area slot
 * - Loading state overlay
 *
 * Wave: W4-ConversationUnification (T4-02)
 * Feature flag: chat_unified_view
 */

'use client';

import { useRef, useEffect, type ReactNode } from 'react';

export interface ConversationShellProps {
  /** Rendered message list */
  children: ReactNode;
  /** Input area component (rendered below messages) */
  inputSlot: ReactNode;
  /** Optional header component */
  headerSlot?: ReactNode;
  /** Whether the assistant is currently generating */
  isLoading?: boolean;
  /** Additional CSS classes for the outer container */
  className?: string;
  /** Whether to auto-scroll when new messages arrive */
  autoScroll?: boolean;
}

export function ConversationShell({
  children,
  inputSlot,
  headerSlot,
  isLoading = false,
  className = '',
  autoScroll = true,
}: ConversationShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when children change
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [children, autoScroll]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header slot */}
      {headerSlot}

      {/* Scrollable message area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-2"
        role="log"
        aria-live="polite"
        // eslint-disable-next-line local-rules/no-literal-strings-in-jsx -- behind chat_unified_view flag, will i18n when enabled
        aria-label="Conversation messages"
      >
        {children}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground" role="status">
            <span className="animate-pulse">...</span>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Input area */}
      <div className="border-t px-4 py-3">{inputSlot}</div>
    </div>
  );
}
