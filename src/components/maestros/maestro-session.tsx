'use client';

import { useRef, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTTS } from '@/components/accessibility';
import { ToolResultDisplay } from '@/components/tools';
import { useUIStore } from '@/lib/stores';
import type { Maestro, ToolType } from '@/types';
import { useMaestroSessionLogic } from './use-maestro-session-logic';
import { MaestroSessionMessages } from './maestro-session-messages';
import { MaestroSessionInput } from './maestro-session-input';
import { MaestroSessionWebcam } from './maestro-session-webcam';
import { cn } from '@/lib/utils';
import {
  CharacterHeader,
  CharacterVoicePanel,
  maestroToUnified,
  type VoiceState,
  type HeaderActions,
} from '@/components/character';
import { ConversationSidebar } from '@/components/conversation/conversation-drawer';

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const sidebarStateBeforeFullscreen = useRef<boolean | null>(null);
  const { setSidebarOpen } = useUIStore();

  const { speak, stop: stopTTS, enabled: ttsEnabled } = useTTS();
  const unifiedCharacter = maestroToUnified(maestro);

  const {
    messages, input, setInput, isLoading, toolCalls, isVoiceActive, showWebcam, webcamRequest,
    configError, sessionEnded, previousMessageCount: previousMessageCountRef, isConnected,
    isListening, isSpeaking, isMuted, inputLevel, outputLevel, connectionState: _connectionState,
    voiceSessionId, toggleMute, handleVoiceCall, handleEndSession, handleSubmit, clearChat,
    handleWebcamCapture, requestTool, handleRequestPhoto, setShowWebcam, setWebcamRequest,
  } = useMaestroSessionLogic({ maestro, initialMode, requestedToolType });

  const voiceState: VoiceState = {
    isActive: isVoiceActive, isConnected, isListening, isSpeaking, isMuted,
    inputLevel, outputLevel, connectionState: _connectionState, configError,
  };

  const headerActions: HeaderActions = {
    onVoiceCall: handleVoiceCall, onStopTTS: stopTTS, onClearChat: clearChat,
    onClose, onToggleMute: toggleMute, onOpenHistory: () => setIsHistoryOpen(!isHistoryOpen),
  };

  useEffect(() => {
    const currentCount = messages.length + toolCalls.length;
    if (currentCount > previousMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    previousMessageCountRef.current = currentCount;
  }, [messages.length, toolCalls.length, previousMessageCountRef]);

  useEffect(() => { if (!isVoiceActive) inputRef.current?.focus(); }, [isVoiceActive]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
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

      <div className={cn(
        'flex gap-0 h-[calc(100vh-8rem)]',
        isToolFullscreen && 'opacity-0 pointer-events-none'
      )}>
        {/* History Sidebar - inline */}
        <ConversationSidebar
          open={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          characterId={maestro.id}
          characterType="maestro"
          characterColor={maestro.color}
          onSelectConversation={(_conversationId) => { setIsHistoryOpen(false); }}
          onNewConversation={() => { clearChat(); setIsHistoryOpen(false); }}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 w-full sm:w-auto">
          {!isVoiceActive && (
            <CharacterHeader
              character={unifiedCharacter}
              voiceState={voiceState}
              ttsEnabled={ttsEnabled}
              actions={headerActions}
            />
          )}

          <MaestroSessionWebcam
            showWebcam={showWebcam}
            webcamRequest={webcamRequest}
            onCapture={handleWebcamCapture}
            onClose={() => { setShowWebcam(false); setWebcamRequest(null); }}
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

        <AnimatePresence>
          {isVoiceActive && (
            <CharacterVoicePanel
              character={unifiedCharacter}
              voiceState={voiceState}
              ttsEnabled={ttsEnabled}
              actions={headerActions}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
