/**
 * Maestro Conversation Adapter
 *
 * Thin adapter wrapping maestro chat with shared ConversationShell.
 * Enabled behind chat_unified_view feature flag.
 *
 * Wave: W4-ConversationUnification (T4-04)
 * Contract: UnifiedChatViewContract (src/types/unified-chat-view.ts)
 */

'use client';

import { useRef } from 'react';
import type { Maestro } from '@/types';
import type { UnifiedChatViewContract } from '@/types/unified-chat-view';
import { ConversationShell } from '../shared/ConversationShell';
import { MaestroSessionMessages } from '@/components/maestros/maestro-session-messages';
import { MaestroSessionInput } from '@/components/maestros/maestro-session-input';
import { useMaestroSessionLogic } from '@/components/maestros/use-maestro-session-logic';

interface MaestroConversationAdapterProps {
  maestro: Maestro;
  config: UnifiedChatViewContract;
  onClose: () => void;
}

/**
 * Adapter that wraps existing maestro session logic with ConversationShell.
 *
 * This is NOT a rewrite - it reuses existing maestro hooks and components,
 * just wrapping them in the shared conversation shell for unified structure.
 */
export function MaestroConversationAdapter({
  maestro,
  config: _config,
  onClose: _onClose,
}: MaestroConversationAdapterProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reuse existing maestro session logic
  const session = useMaestroSessionLogic({
    maestro,
    initialMode: 'chat',
  });

  return (
    <ConversationShell
      isLoading={session.isLoading}
      inputSlot={
        <MaestroSessionInput
          maestro={maestro}
          input={session.input}
          isLoading={session.isLoading}
          sessionEnded={session.sessionEnded}
          isVoiceActive={session.isVoiceActive}
          showEndSession={false}
          inputRef={inputRef}
          onInputChange={session.setInput}
          onKeyDown={() => {}}
          onSubmit={() => session.handleSubmit()}
          onRequestTool={session.requestTool}
          onRequestPhoto={session.handleRequestPhoto}
          onEndSession={session.handleEndSession}
        />
      }
    >
      <MaestroSessionMessages
        messages={session.messages}
        maestro={maestro}
        isLoading={session.isLoading}
        toolCalls={session.toolCalls}
        ttsEnabled={false}
        speak={() => {}}
        messagesEndRef={messagesEndRef}
      />
    </ConversationShell>
  );
}
