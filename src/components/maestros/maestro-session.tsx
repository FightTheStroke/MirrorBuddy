'use client';

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

import { useRef, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTTS } from '@/components/accessibility';
import { HeaderVariantF } from './header-variants/variant-f-vertical-panel';
import { ToolResultDisplay } from '@/components/tools';
import { useUIStore } from '@/lib/stores';
import type { Maestro, ToolType } from '@/types';
import { useMaestroSessionLogic } from './use-maestro-session-logic';
import { MaestroSessionHeader } from './maestro-session-header';
import { MaestroSessionMessages } from './maestro-session-messages';
import { MaestroSessionInput } from './maestro-session-input';
import { MaestroSessionWebcam } from './maestro-session-webcam';
import { cn } from '@/lib/utils';

interface MaestroSessionProps {
  maestro: Maestro;
  onClose: () => void;
  initialMode?: 'voice' | 'chat';
  requestedToolType?: ToolType;
}

export function MaestroSession({ maestro, onClose, initialMode = 'voice', requestedToolType }: MaestroSessionProps) {
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
  } = useMaestroSessionLogic({ maestro, initialMode, requestedToolType });

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    const currentCount = messages.length + toolCalls.length;
    if (currentCount > previousMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    previousMessageCountRef.current = currentCount;
  }, [messages.length, toolCalls.length, previousMessageCountRef]);

  // Focus input when not in voice mode
  useEffect(() => {
    if (!isVoiceActive) inputRef.current?.focus();
  }, [isVoiceActive]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleToggleToolFullscreen = (toolId: string) => {
    const newFullscreenId = fullscreenToolId === toolId ? null : toolId;
    
    if (newFullscreenId !== null) {
      // Entering fullscreen: save current sidebar state and compress it
      if (sidebarStateBeforeFullscreen.current === null) {
        sidebarStateBeforeFullscreen.current = useUIStore.getState().sidebarOpen;
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
  const fullscreenTool = toolCalls.find(t => t.id === fullscreenToolId);

  return (
    <>
      {/* Fullscreen tool overlay */}
      {isToolFullscreen && fullscreenTool && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950">
          <ToolResultDisplay 
            toolCall={fullscreenTool} 
            sessionId={voiceSessionId}
            isFullscreen={true}
            onToggleFullscreen={() => handleToggleToolFullscreen(fullscreenTool.id)}
          />
        </div>
      )}

      {/* Normal chat view */}
      <div className={cn(
        'flex flex-col sm:flex-row gap-2 sm:gap-4 h-[calc(100vh-8rem)]',
        isToolFullscreen && 'opacity-0 pointer-events-none'
      )}>
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 w-full sm:w-auto">
          {/* Header only shown when NOT in voice call - when in call, everything is in Variant F panel */}
          {!isVoiceActive && (
            <MaestroSessionHeader
              maestro={maestro}
              isVoiceActive={isVoiceActive}
              isConnected={isConnected}
              configError={configError}
              ttsEnabled={ttsEnabled}
              onVoiceCall={handleVoiceCall}
              onStopTTS={stopTTS}
              onClearChat={clearChat}
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

        {/* Voice Panel - Variant F (Side by Side on desktop, full width on mobile) */}
        <AnimatePresence>
          {isVoiceActive && (
            <div className="w-full sm:w-auto sm:flex-shrink-0">
              <HeaderVariantF
                maestro={maestro}
                isVoiceActive={isVoiceActive}
                isConnected={isConnected}
                isListening={isListening}
                isSpeaking={isSpeaking}
                isMuted={isMuted}
                inputLevel={inputLevel}
                outputLevel={outputLevel}
                configError={configError}
                ttsEnabled={ttsEnabled}
                onVoiceCall={handleVoiceCall}
                onToggleMute={toggleMute}
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
