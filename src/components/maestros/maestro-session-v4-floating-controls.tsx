'use client';

/**
 * PROPOSTA 4: Header compatto + floating controls
 * 
 * Layout ottimizzato: header sempre compatto, controlli audio come floating bar sopra la chat.
 * I controlli fluttuano sopra il contenuto per massimizzare lo spazio.
 */

import { useRef, useEffect, useState } from 'react';
import { useTTS } from '@/components/accessibility';
import { ToolResultDisplay } from '@/components/tools';
import { useUIStore } from '@/lib/stores';
import type { Maestro } from '@/types';
import { useMaestroSessionLogic } from './use-maestro-session-logic';
import { MaestroSessionHeaderV4 } from './maestro-session-header-v4-floating-controls';
import { MaestroSessionMessages } from './maestro-session-messages';
import { MaestroSessionInput } from './maestro-session-input';
import { MaestroSessionWebcam } from './maestro-session-webcam';
import { cn } from '@/lib/utils';

interface MaestroSessionV4Props {
  maestro: Maestro;
  onClose: () => void;
  initialMode?: 'voice' | 'chat';
}

export function MaestroSessionV4({ maestro, onClose, initialMode = 'voice' }: MaestroSessionV4Props) {
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
  } = useMaestroSessionLogic({ maestro, initialMode });

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
      if (sidebarStateBeforeFullscreen.current === null) {
        sidebarStateBeforeFullscreen.current = useUIStore.getState().sidebarOpen;
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

      {/* Optimized layout: full width chat, no side panel */}
      <div className={cn(
        'flex flex-col h-[calc(100vh-8rem)]',
        isToolFullscreen && 'opacity-0 pointer-events-none'
      )}>
        {/* Main Chat Area - Full width */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 w-full relative">
          <MaestroSessionHeaderV4
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
      </div>
    </>
  );
}
