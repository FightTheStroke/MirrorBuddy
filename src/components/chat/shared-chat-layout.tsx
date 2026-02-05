"use client";

import { cn } from "@/lib/utils";
import { MobileVoiceOverlay } from "./mobile-voice-overlay";

interface SharedChatLayoutProps {
  /** Character header/banner - fixed at top */
  header: React.ReactNode;
  /** Messages area content - scrollable */
  children: React.ReactNode;
  /** Footer with tools bar + chat input - fixed at bottom */
  footer: React.ReactNode;
  /** Right sidebar content (voice panel or history) - desktop only */
  rightPanel?: React.ReactNode;
  /** Whether right panel is visible */
  showRightPanel?: boolean;
  /** Callback when mobile overlay close is tapped */
  onCloseRightPanel?: () => void;
  /** Tool panel content - shows between header and messages on desktop */
  toolPanel?: React.ReactNode;
  /** Additional className for the outer container */
  className?: string;
}

/**
 * SharedChatLayout - ChatGPT-style fixed layout for all character types
 *
 * Layout structure:
 * ┌─────────────────────────────────────┬──────────────┐
 * │ [Header - character banner]         │              │
 * ├─────────────────────────────────────┤  Right Panel │
 * │                                     │  (voice/     │
 * │  [Messages - scrollable]            │   history)   │
 * │                                     │              │
 * ├─────────────────────────────────────┤              │
 * │ [Footer - tools + input]            │              │
 * └─────────────────────────────────────┴──────────────┘
 *
 * Features:
 * - Full viewport height (h-dvh with h-screen fallback)
 * - Fixed header and footer (flex-shrink-0)
 * - Scrollable messages area (flex-1 overflow-y-auto)
 * - Optional right sidebar (desktop only)
 * - No page-level scrolling
 * - WCAG 2.1 AA compliant
 */
export function SharedChatLayout({
  header,
  children,
  footer,
  rightPanel,
  showRightPanel = false,
  onCloseRightPanel,
  toolPanel,
  className,
}: SharedChatLayoutProps) {
  return (
    <>
      <div
        className={cn(
          // Full viewport height with fallback
          "h-screen h-dvh",
          // Flex column layout
          "flex flex-col",
          // No overflow on outer container
          "overflow-hidden",
          className,
        )}
      >
        {/* Inner flex container with right panel */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Main column */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Header - fixed at top */}
            <div className="flex-shrink-0">{header}</div>

            {/* Tool panel - optional */}
            {toolPanel && <div className="flex-shrink-0">{toolPanel}</div>}

            {/* Messages area - scrollable */}
            <main
              role="main"
              className={cn(
                "flex-1 overflow-y-auto overscroll-contain",
                // iOS momentum scrolling
                "[&]:[-webkit-overflow-scrolling:touch]",
              )}
              style={{
                WebkitOverflowScrolling: "touch",
              }}
            >
              {children}
            </main>

            {/* Footer - fixed at bottom */}
            <div className="flex-shrink-0">{footer}</div>
          </div>

          {/* Right panel - desktop only */}
          {showRightPanel && rightPanel && (
            <aside
              className={cn(
                // Hidden on mobile
                "hidden",
                // Visible on desktop (lg+)
                "lg:flex lg:flex-col",
                // Fixed width
                "lg:w-72 xl:w-80",
                // Prevent shrinking
                "flex-shrink-0",
                // Visual separation
                "border-l border-slate-200 dark:border-slate-800",
              )}
            >
              {rightPanel}
            </aside>
          )}
        </div>
      </div>

      {/* Mobile voice overlay - mobile only */}
      {showRightPanel && rightPanel && onCloseRightPanel && (
        <MobileVoiceOverlay
          isVisible={showRightPanel}
          onClose={onCloseRightPanel}
        >
          {rightPanel}
        </MobileVoiceOverlay>
      )}
    </>
  );
}
