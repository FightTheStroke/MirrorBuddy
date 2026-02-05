"use client";

/**
 * MaestroSession - Unified conversation layout matching Coach/Buddy pattern
 *
 * Layout identical to CharacterChatView:
 * - Flex layout with chat on left, voice panel on right (side by side)
 * - Header with avatar, name, specialty, voice call button
 * - Messages area with inline tools
 * - Input area with tool buttons at bottom
 * - VoicePanel as sibling when voice active (NOT overlay)
 * - Evaluation inline in chat when session ends
 */

import { useRef, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "@/components/error-boundary";
import { useTTS } from "@/components/accessibility";
import { ToolResultDisplay } from "@/components/tools";
import { useUIStore } from "@/lib/stores";
import type { Maestro, ToolType } from "@/types";
import { useMaestroSessionLogic } from "./use-maestro-session-logic";
import { MaestroSessionMessages } from "./maestro-session-messages";
import { MaestroSessionInput } from "./maestro-session-input";
import { MaestroSessionWebcam } from "./maestro-session-webcam";
import { cn } from "@/lib/utils";
import {
  CharacterHeader,
  CharacterVoicePanel,
  maestroToUnified,
  type VoiceState,
  type HeaderActions,
} from "@/components/character";
import { ConversationSidebar } from "@/components/conversation/conversation-drawer";
import { SharedChatLayout } from "@/components/chat/shared-chat-layout";

interface MaestroSessionProps {
  maestro: Maestro;
  onClose: () => void;
  initialMode?: "voice" | "chat";
  requestedToolType?: ToolType;
}

export function MaestroSession({
  maestro,
  onClose,
  initialMode = "voice",
  requestedToolType,
}: MaestroSessionProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [fullscreenToolId, setFullscreenToolId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const sidebarStateBeforeFullscreen = useRef<boolean | null>(null);
  const { setSidebarOpen } = useUIStore();

  const { speak, stop: stopTTS, enabled: ttsEnabled } = useTTS();
  const unifiedCharacter = maestroToUnified(maestro);

  const {
    messages,
    input,
    setInput,
    isLoading,
    toolCalls,
    isVoiceActive,
    showWebcam,
    webcamRequest,
    configError,
    sessionEnded,
    previousMessageCount: previousMessageCountRef,
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    connectionState: _connectionState,
    voiceSessionId,
    toggleMute,
    handleVoiceCall,
    handleEndSession,
    handleSubmit,
    clearChat,
    handleWebcamCapture,
    requestTool,
    handleRequestPhoto,
    setShowWebcam,
    setWebcamRequest,
    loadConversation,
  } = useMaestroSessionLogic({ maestro, initialMode, requestedToolType });

  // Build unified voice state and actions
  const voiceState: VoiceState = {
    isActive: isVoiceActive,
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    connectionState: _connectionState,
    configError,
  };

  // Handle opening history - close voice first if active
  const handleOpenHistory = () => {
    if (isVoiceActive) {
      // Close voice call first, then open history
      handleVoiceCall(); // This toggles voice off
    }
    setIsHistoryOpen(!isHistoryOpen);
  };

  const headerActions: HeaderActions = {
    onVoiceCall: handleVoiceCall,
    onStopTTS: stopTTS,
    onClearChat: clearChat,
    onClose,
    onToggleMute: toggleMute,
    onOpenHistory: handleOpenHistory,
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    const currentCount = messages.length + toolCalls.length;
    if (currentCount > previousMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    previousMessageCountRef.current = currentCount;
  }, [messages.length, toolCalls.length, previousMessageCountRef]);

  // Focus input when not in voice mode
  useEffect(() => {
    if (!isVoiceActive) inputRef.current?.focus();
  }, [isVoiceActive]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleToggleToolFullscreen = (toolId: string) => {
    const newFullscreenId = fullscreenToolId === toolId ? null : toolId;

    if (newFullscreenId !== null) {
      // Entering fullscreen: save current sidebar state and compress it
      if (sidebarStateBeforeFullscreen.current === null) {
        sidebarStateBeforeFullscreen.current =
          useUIStore.getState().sidebarOpen;
      }
      setSidebarOpen(false);
    } else {
      // Exiting fullscreen: restore sidebar state
      if (sidebarStateBeforeFullscreen.current !== null) {
        setSidebarOpen(sidebarStateBeforeFullscreen.current);
        sidebarStateBeforeFullscreen.current = null;
      }
    }

    setFullscreenToolId(newFullscreenId);
  };

  const isToolFullscreen = fullscreenToolId !== null;
  const fullscreenTool = toolCalls.find((t) => t.id === fullscreenToolId);

  return (
    <ErrorBoundary>
      {/* Fullscreen tool overlay */}
      {isToolFullscreen && fullscreenTool && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950">
          <ToolResultDisplay
            toolCall={fullscreenTool}
            sessionId={voiceSessionId}
            isFullscreen={true}
            onToggleFullscreen={() =>
              handleToggleToolFullscreen(fullscreenTool.id)
            }
          />
        </div>
      )}

      {/* Normal chat view using SharedChatLayout */}
      <SharedChatLayout
        className={cn(isToolFullscreen && "opacity-0 pointer-events-none")}
        header={
          <CharacterHeader
            character={unifiedCharacter}
            voiceState={voiceState}
            ttsEnabled={ttsEnabled}
            actions={headerActions}
          />
        }
        toolPanel={
          showWebcam ? (
            <MaestroSessionWebcam
              showWebcam={showWebcam}
              webcamRequest={webcamRequest}
              onCapture={handleWebcamCapture}
              onClose={() => {
                setShowWebcam(false);
                setWebcamRequest(null);
              }}
            />
          ) : undefined
        }
        footer={
          <MaestroSessionInput
            maestro={maestro}
            input={input}
            isLoading={isLoading}
            sessionEnded={sessionEnded}
            isVoiceActive={isVoiceActive}
            showEndSession={!sessionEnded && messages.length > 1}
            inputRef={inputRef}
            onInputChange={setInput}
            onKeyDown={handleKeyDown}
            onSubmit={() => handleSubmit()}
            onRequestTool={requestTool}
            onRequestPhoto={handleRequestPhoto}
            onEndSession={handleEndSession}
          />
        }
        rightPanel={
          <AnimatePresence>
            {isVoiceActive ? (
              <CharacterVoicePanel
                character={unifiedCharacter}
                voiceState={voiceState}
                ttsEnabled={ttsEnabled}
                actions={headerActions}
              />
            ) : isHistoryOpen ? (
              <ConversationSidebar
                open={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
                characterId={maestro.id}
                characterType="maestro"
                characterColor={maestro.color}
                onSelectConversation={(conversationId) => {
                  loadConversation(conversationId);
                  setIsHistoryOpen(false);
                }}
                onNewConversation={() => {
                  clearChat();
                  setIsHistoryOpen(false);
                }}
              />
            ) : null}
          </AnimatePresence>
        }
        showRightPanel={isVoiceActive || isHistoryOpen}
      >
        {/* Messages area - scrollable */}
        <MaestroSessionMessages
          messages={messages}
          toolCalls={toolCalls}
          maestro={maestro}
          isLoading={isLoading}
          ttsEnabled={ttsEnabled}
          speak={speak}
          voiceSessionId={voiceSessionId}
          messagesEndRef={messagesEndRef}
          fullscreenToolId={fullscreenToolId}
          onToggleToolFullscreen={handleToggleToolFullscreen}
        />
      </SharedChatLayout>
    </ErrorBoundary>
  );
}
