/**
 * Character Conversation Adapter (Coach/Buddy)
 *
 * Thin adapter wrapping coach/buddy chat with shared ConversationShell.
 * Enabled behind chat_unified_view feature flag.
 *
 * Wave: W4-ConversationUnification (T4-05)
 * Contract: UnifiedChatViewContract (src/types/unified-chat-view.ts)
 */

'use client';

import type { UnifiedChatViewContract } from '@/types/unified-chat-view';
import { ConversationShell } from '../shared/ConversationShell';
import { MessagesList } from '@/components/conversation/character-chat-view/components/messages-list';
import { ChatInput } from '@/components/conversation/character-chat-view/components/chat-input';
import { useCharacterChat } from '@/components/conversation/character-chat-view/hooks/use-character-chat';
import { getCharacterInfo } from '@/components/conversation/character-chat-view/utils/character-utils';
import { useSettingsStore } from '@/lib/stores';
import { useConversationFlowStore } from '@/lib/stores/conversation-flow-store';
import { useTTS } from '@/components/accessibility';
import type { SupportedLanguage } from '@/types';

interface CharacterConversationAdapterProps {
  characterId: string;
  characterType: 'coach' | 'buddy';
  config: UnifiedChatViewContract;
  onClose: () => void;
}

/**
 * Adapter that wraps existing coach/buddy chat logic with ConversationShell.
 *
 * This is NOT a rewrite - it reuses existing character chat hooks and components,
 * just wrapping them in the shared conversation shell for unified structure.
 */
export function CharacterConversationAdapter({
  characterId,
  characterType,
  config: _config,
  onClose: _onClose,
}: CharacterConversationAdapterProps) {
  const language = useSettingsStore((state) => state.appearance.language) as SupportedLanguage;
  const character = getCharacterInfo(characterId, characterType, language);

  // TTS support (config.voiceEnabled controls availability)
  useTTS();

  // Handoff support (always call hook, use config to determine if active)
  useConversationFlowStore();

  // Reuse existing character chat logic
  const { messages, input, setInput, isLoading, activeTool, handleSend, handleToolRequest } =
    useCharacterChat(characterId, character);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <ConversationShell
      isLoading={isLoading}
      inputSlot={
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
      }
    >
      <MessagesList messages={messages} character={character} isLoading={isLoading} />
    </ConversationShell>
  );
}
