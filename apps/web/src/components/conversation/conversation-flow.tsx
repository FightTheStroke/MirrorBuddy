/**
 * MirrorBuddy Conversation Flow Component
 *
 * The central conversation-first interface that:
 * 1. Shows character selection with photos and introductions
 * 2. Routes student messages to appropriate characters
 * 3. Supports seamless handoffs between characters
 * 4. Offers both text and voice modes for Coach and Buddy
 *
 * Part of I-01: Conversation-First Main Flow
 * Related: #24 MirrorBuddy Issue, #33 Conversation UX, ManifestoEdu.md
 */

'use client';

import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettingsStore, useUIStore } from '@/lib/stores';
import { useConversationFlowStore } from '@/lib/stores/conversation-flow-store';
import type { ExtendedStudentProfile, ToolType } from '@/types';
import type { ActiveCharacter as _ActiveCharacter } from '@/lib/stores/conversation-flow-store';
import { useToolSSE } from './hooks/use-tool-sse';
import { useConversationInactivity } from './hooks/use-conversation-inactivity';
import { useConversationEffects } from './hooks/use-conversation-effects';
import { useMessageSender } from './hooks/use-message-sender';
import { useMessageSending } from './hooks/use-message-sending';
import { useToolHandler } from './hooks/use-tool-handler';
import { useConversationHandlers } from './hooks/use-conversation-handlers';
import { ConversationContent } from './components/conversation-content';
import { useTranslations } from 'next-intl';

export { CharacterCard } from './components';

export function ConversationFlow() {
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isToolMinimized, setIsToolMinimized] = useState(false);
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('chat');

  const { studentProfile } = useSettingsStore();
  useUIStore(); // Keep store import for potential future use
  const {
    isActive,
    mode,
    activeCharacter,
    messages,
    pendingHandoff,
    characterHistory,
    sessionId,
    conversationsByCharacter,
    startConversation,
    addMessage,
    setMode,
    switchToCoach,
    switchToBuddy,
    goBack,
    acceptHandoff,
    dismissHandoff,
    routeMessage,
    suggestHandoff,
  } = useConversationFlowStore();

  const extendedProfile: ExtendedStudentProfile = useMemo(
    () => ({
      ...studentProfile,
      learningDifferences: studentProfile.learningDifferences || [],
      preferredCoach: studentProfile.preferredCoach,
      preferredBuddy: studentProfile.preferredBuddy,
    }),
    [studentProfile],
  );

  const [isLoading, setIsLoading] = useState(false);

  const {
    activeTool,
    setActiveTool,
    showMaestroDialog,
    setShowMaestroDialog,
    pendingToolType,
    setPendingToolType,
    handleMaestroSelected,
    handleToolRequest,
  } = useToolHandler({
    isLoading,
    setIsLoading,
    messages,
    addMessage,
  });

  useConversationEffects({
    isActive,
    mode,
    messages,
    startConversation,
    extendedProfile,
    inputRef,
    messagesEndRef,
  });

  useConversationInactivity(isActive, activeCharacter, conversationsByCharacter);
  useToolSSE(sessionId, setActiveTool);

  const { sendMessage } = useMessageSender({
    activeCharacter,
    messages,
    extendedProfile,
    conversationsByCharacter,
    pendingHandoff,
    routeMessage,
    addMessage,
    suggestHandoff,
  });

  const {
    inputValue,
    setInputValue,
    isLoading: messageLoading,
    setIsLoading: _setMessageLoading,
    handleSend,
    handleKeyPress,
  } = useMessageSending({
    activeCharacter,
    addMessage,
    sendMessage,
  });

  const finalIsLoading = isLoading || messageLoading;

  const handleVoiceToggle = () => {
    if (mode === 'voice') {
      setMode('text');
    } else {
      setMode('voice');
    }
  };

  const {
    handleVoiceCall,
    handleAcceptHandoff,
    handleSwitchToCoach,
    handleSwitchToBuddy,
    handleGoBack,
  } = useConversationHandlers({
    activeCharacter,
    conversationsByCharacter,
    isVoiceActive,
    setIsVoiceActive,
    setMode,
    acceptHandoff,
    switchToCoach,
    switchToBuddy,
    goBack,
    extendedProfile,
  });

  if (!isActive || !activeCharacter) {
    return (
      <div className="flex items-center justify-center h-full">
        <Button onClick={() => startConversation(extendedProfile)}>
          {t('conversationFlow.startConversation')}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative h-[calc(100vh-200px)] max-h-[700px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden',
        isVoiceActive ? 'flex flex-col lg:flex-row' : 'flex flex-col',
      )}
    >
      <ConversationContent
        activeCharacter={activeCharacter}
        characterHistory={characterHistory}
        isVoiceActive={isVoiceActive}
        pendingHandoff={pendingHandoff}
        activeTool={activeTool}
        messages={messages}
        isLoading={finalIsLoading}
        isToolMinimized={isToolMinimized}
        voiceSessionId={voiceSessionId}
        inputValue={inputValue}
        mode={mode as 'text' | 'voice'}
        isMuted={isMuted}
        inputRef={inputRef as React.RefObject<HTMLInputElement>}
        messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
        showMaestroDialog={showMaestroDialog}
        pendingToolType={pendingToolType}
        onInputChange={setInputValue}
        onSend={handleSend}
        onKeyPress={handleKeyPress}
        onVoiceToggle={handleVoiceToggle}
        onMuteToggle={() => setIsMuted(!isMuted)}
        onToolRequest={handleToolRequest}
        onVoiceCall={handleVoiceCall}
        onAcceptHandoff={handleAcceptHandoff}
        onDismissHandoff={dismissHandoff}
        onSwitchToCoach={handleSwitchToCoach}
        onSwitchToBuddy={handleSwitchToBuddy}
        onGoBack={handleGoBack}
        onMaestroSelected={handleMaestroSelected as (maestro: unknown, toolType: ToolType) => void}
        onCloseDialog={() => {
          setShowMaestroDialog(false);
          setPendingToolType(null);
        }}
        onSetActiveTool={setActiveTool}
        onToggleMinimize={() => setIsToolMinimized(!isToolMinimized)}
        onSetVoiceSessionId={setVoiceSessionId}
      />
    </div>
  );
}
