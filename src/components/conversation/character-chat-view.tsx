'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { ToolPanel } from '@/components/tools/tool-panel';
import { ConversationDrawer } from './conversation-drawer';
import { getCharacterInfo } from './character-chat-view/utils/character-utils';
import { useCharacterChat } from './character-chat-view/hooks/use-character-chat';
import { MessagesList } from './character-chat-view/components/messages-list';
import { ChatInput } from './character-chat-view/components/chat-input';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';
import { useTTS } from '@/components/accessibility';
import {
  CharacterHeader,
  CharacterVoicePanel,
  characterInfoToUnified,
  type VoiceState,
  type HeaderActions,
} from '@/components/character';

interface CharacterChatViewProps {
  characterId:
    | 'melissa'
    | 'roberto'
    | 'chiara'
    | 'andrea'
    | 'favij'
    | 'mario'
    | 'noemi'
    | 'enea'
    | 'bruno'
    | 'sofia';
  characterType: 'coach' | 'buddy';
}

export function CharacterChatView({
  characterId,
  characterType,
}: CharacterChatViewProps) {
  const router = useRouter();
  const character = getCharacterInfo(characterId, characterType);
  const unifiedCharacter = characterInfoToUnified(character, characterId, characterType);
  const [isToolMinimized, setIsToolMinimized] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { speak: _speak, stop: stopTTS, enabled: ttsEnabled } = useTTS();

  const {
    messages,
    input,
    setInput,
    isLoading,
    isVoiceActive,
    isConnected,
    connectionState,
    configError,
    activeTool,
    setActiveTool,
    messagesEndRef,
    handleSend,
    handleToolRequest,
    handleVoiceCall,
  } = useCharacterChat(characterId, character);

  const voiceSession = useVoiceSession({
    onTranscript: () => {},
  });

  const {
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    toggleMute,
    sessionId: voiceSessionId,
  } = voiceSession;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Build unified voice state and actions
  const voiceState: VoiceState = {
    isActive: isVoiceActive,
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    inputLevel,
    outputLevel,
    connectionState,
    configError,
  };

  const headerActions: HeaderActions = {
    onVoiceCall: handleVoiceCall,
    onStopTTS: stopTTS,
    onClearChat: () => {}, // TODO: Add clearChat to hook
    onClose: () => router.back(),
    onToggleMute: toggleMute,
    onOpenHistory: () => setIsHistoryOpen(true),
  };

  const hasActiveTool = activeTool && activeTool.status !== 'error';

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header only when NOT in voice call */}
        {!isVoiceActive && (
          <CharacterHeader
            character={unifiedCharacter}
            voiceState={voiceState}
            ttsEnabled={ttsEnabled}
            actions={headerActions}
          />
        )}

        <MessagesList
          messages={messages}
          character={character}
          isLoading={isLoading}
        />
        <div ref={messagesEndRef} />

        <ChatInput
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          isLoading={isLoading}
          character={character}
          characterType={characterType}
          onToolRequest={handleToolRequest}
          activeTool={activeTool}
        />
      </div>

      {hasActiveTool && (
        <div className="w-[400px] h-full flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <ToolPanel
            tool={activeTool}
            maestro={{
              name: character.name,
              avatar: character.avatar || '/avatars/default.jpg',
              color: character.themeColor,
            }}
            onClose={() => setActiveTool(null)}
            isMinimized={isToolMinimized}
            onToggleMinimize={() => setIsToolMinimized(!isToolMinimized)}
            embedded={true}
            sessionId={voiceSessionId}
          />
        </div>
      )}

      <ConversationDrawer
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        characterId={characterId}
        characterType={characterType}
        onSelectConversation={(id) => {
          // TODO: Load selected conversation
          setIsHistoryOpen(false);
        }}
        onNewConversation={() => {
          // TODO: Implement clearChat from hook
          setIsHistoryOpen(false);
        }}
      />

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
  );
}
