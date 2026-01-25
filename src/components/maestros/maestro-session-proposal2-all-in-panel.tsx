"use client";

/**
 * PROPOSTA 2: Tutto nella barra della chiamata vocale
 *
 * Tutti i controlli audio sono nel VoicePanel laterale quando la chiamata è attiva.
 * Mantiene il layout side-by-side con tutti i controlli nel pannello laterale.
 */

import { useRef, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useTTS } from "@/components/accessibility";
import { VoicePanelProposal2 } from "@/components/voice/voice-panel-proposal2-all-in-panel";
import { ToolResultDisplay } from "@/components/tools";
import { useUIStore } from "@/lib/stores";
import type { Maestro } from "@/types";
import { useMaestroSessionLogic } from "./use-maestro-session-logic";
import { MaestroSessionHeaderProposal2 } from "./maestro-session-header-proposal2-minimal";
import { MaestroSessionMessages } from "./maestro-session-messages";
import { MaestroSessionInput } from "./maestro-session-input";
import { MaestroSessionWebcam } from "./maestro-session-webcam";
import { cn } from "@/lib/utils";

interface MaestroSessionProposal2Props {
  maestro: Maestro;
  onClose: () => void;
  initialMode?: "voice" | "chat";
}

export function MaestroSessionProposal2({
  maestro,
  onClose,
  initialMode = "voice",
}: MaestroSessionProposal2Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [fullscreenToolId, setFullscreenToolId] = useState<string | null>(null);
  const sidebarStateBeforeFullscreen = useRef<boolean | null>(null);
  const { setSidebarOpen } = useUIStore();

  const { speak, stop: stopTTS, enabled: ttsEnabled } = useTTS();

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
    connectionState,
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
  } = useMaestroSessionLogic({ maestro, initialMode });

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
      if (sidebarStateBeforeFullscreen.current === null) {
        sidebarStateBeforeFullscreen.current =
          useUIStore.getState().sidebarOpen;
      }
      setSidebarOpen(false);
    } else {
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
    <>
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

      {/* Side-by-side layout with voice panel */}
      <div
        className={cn(
          "flex flex-col sm:flex-row gap-2 sm:gap-4 h-[calc(100vh-8rem)]",
          isToolFullscreen && "opacity-0 pointer-events-none",
        )}
      >
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 w-full sm:w-auto">
          {/* Header only shown when NOT in voice call - when in call, everything is in the panel */}
          {!isVoiceActive && (
            <MaestroSessionHeaderProposal2
              maestro={maestro}
              isVoiceActive={isVoiceActive}
              isConnected={isConnected}
              configError={configError}
              onVoiceCall={handleVoiceCall}
              onClose={onClose}
            />
          )}

          <MaestroSessionWebcam
            showWebcam={showWebcam}
            webcamRequest={webcamRequest}
            onCapture={handleWebcamCapture}
            onClose={() => {
              setShowWebcam(false);
              setWebcamRequest(null);
            }}
          />

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
        </div>

        {/* Voice Panel with all controls */}
        <AnimatePresence>
          {isVoiceActive && (
            <div className="w-full sm:w-auto sm:flex-shrink-0">
              <VoicePanelProposal2
                character={{
                  name: maestro.displayName,
                  avatar: maestro.avatar,
                  specialty: maestro.specialty,
                  color: maestro.color,
                }}
                isConnected={isConnected}
                isListening={isListening}
                isSpeaking={isSpeaking}
                isMuted={isMuted}
                inputLevel={inputLevel}
                outputLevel={outputLevel}
                connectionState={connectionState}
                configError={configError}
                ttsEnabled={ttsEnabled}
                onToggleMute={toggleMute}
                onEndCall={handleVoiceCall}
                onStopTTS={stopTTS}
                onClearChat={clearChat}
                onClose={onClose}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
