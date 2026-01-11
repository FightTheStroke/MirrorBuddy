'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MaestroOverlay, type MaestroStatus } from '@/components/tools/maestro-overlay';
import { ChatDrawer } from './fullscreen-chat-drawer';
import { InputBar } from './fullscreen-input-bar';
import type { FlowMessage } from '@/lib/stores/conversation-flow-store';

// ============================================================================
// TYPES
// ============================================================================

export interface ActiveTool {
  type: 'mindmap' | 'quiz' | 'flashcard' | 'demo';
  id: string;
  data: unknown;
}

export interface MaestroInfo {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface FullscreenToolLayoutProps {
  tool: ActiveTool;
  maestro: MaestroInfo;
  maestroStatus: MaestroStatus;
  messages: FlowMessage[];
  lastMaestroMessage?: string;
  onSendMessage: (message: string) => void;
  onVoiceToggle?: () => void;
  isVoiceActive?: boolean;
  onClose?: () => void;
  children: React.ReactNode; // The tool component (mindmap, quiz, etc.)
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FullscreenToolLayout({
  tool: _tool,
  maestro,
  maestroStatus,
  messages,
  lastMaestroMessage,
  onSendMessage,
  onVoiceToggle,
  isVoiceActive,
  onClose,
  children,
  className,
}: FullscreenToolLayoutProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Keyboard shortcut to toggle chat (Ctrl/Cmd + /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsChatOpen((prev) => !prev);
      }
      // Escape to close chat
      if (e.key === 'Escape' && isChatOpen) {
        setIsChatOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatOpen]);

  return (
    <div className={cn('fixed inset-0 bg-white dark:bg-slate-950', className)}>
      {/* Tool Content Area - Full screen with bottom padding for input bar */}
      <div
        className="absolute inset-0 z-10 overflow-auto"
        style={{ paddingBottom: '60px' }}
      >
        {children}
      </div>

      {/* Maestro Overlay - Bottom right, draggable */}
      <MaestroOverlay
        maestro={maestro}
        status={maestroStatus}
        lastMessage={lastMaestroMessage}
        onClose={onClose}
        onExpand={() => setIsChatOpen(true)}
        className="z-20"
      />

      {/* Chat Drawer - Slide up panel */}
      <ChatDrawer
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        messages={messages}
        maestroColor={maestro.color}
      />

      {/* Input Bar - Fixed at bottom */}
      <InputBar
        onSendMessage={onSendMessage}
        onVoiceToggle={onVoiceToggle}
        isVoiceActive={isVoiceActive}
        maestroColor={maestro.color}
      />
    </div>
  );
}
