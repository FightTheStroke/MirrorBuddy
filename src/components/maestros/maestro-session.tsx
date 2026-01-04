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

import { useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTTS } from '@/components/accessibility';
import { VoicePanel } from '@/components/voice';
import type { Maestro } from '@/types';
import { useMaestroSessionLogic } from './use-maestro-session-logic';
import { MaestroSessionHeader } from './maestro-session-header';
import { MaestroSessionMessages } from './maestro-session-messages';
import { MaestroSessionInput } from './maestro-session-input';
import { MaestroSessionWebcam } from './maestro-session-webcam';

interface MaestroSessionProps {
  maestro: Maestro;
  onClose: () => void;
  initialMode?: 'voice' | 'chat';
}

export function MaestroSession({ maestro, onClose, initialMode = 'voice' }: MaestroSessionProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
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

      {/* Voice Panel (Side by Side) */}
      <AnimatePresence>
        {isVoiceActive && (
          <VoicePanel
            character={{
              name: maestro.name,
              avatar: maestro.avatar,
              specialty: maestro.specialty,
              color: maestro.color,
            }}
            isConnected={isConnected}
            isListening={isListening}
            isSpeaking={isSpeaking}
            isMuted={isMuted}
            inputLevel={inputLevel}
            connectionState={connectionState}
            configError={configError}
            onToggleMute={toggleMute}
            onEndCall={handleVoiceCall}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
