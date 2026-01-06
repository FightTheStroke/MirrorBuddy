'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { VoicePanel } from '@/components/voice';
import { ToolPanel } from '@/components/tools/tool-panel';
import { getCharacterInfo } from './character-chat-view/utils/character-utils';
import { useCharacterChat } from './character-chat-view/hooks/use-character-chat';
import { ChatHeader } from './character-chat-view/components/chat-header';
import { MessagesList } from './character-chat-view/components/messages-list';
import { ChatInput } from './character-chat-view/components/chat-input';
import { useVoiceSession } from '@/lib/hooks/use-voice-session';

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
  const character = getCharacterInfo(characterId, characterType);
  const [isToolMinimized, setIsToolMinimized] = useState(false);

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

  const hasActiveTool = activeTool && activeTool.status !== 'error';

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          character={character}
          isVoiceActive={isVoiceActive}
          isConnected={isConnected}
          configError={configError}
          onVoiceCall={handleVoiceCall}
        />

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

      <AnimatePresence>
        {isVoiceActive && (
          <VoicePanel
            character={{
              name: character.name,
              avatar: character.avatar,
              specialty: character.role,
              color: character.color,
            }}
            isConnected={isConnected}
            isListening={isListening}
            isSpeaking={isSpeaking}
            isMuted={isMuted}
            inputLevel={inputLevel}
            outputLevel={outputLevel}
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
