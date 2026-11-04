import { useCallback, useRef, useState } from 'react';
import { csrfFetch, whenIdentitySettled } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { ConversationUnavailableError } from './chat-attachment-fields';

/**
 * Lazily binds a Maestro chat to a server conversation using the existing
 * lifecycle (POST /api/conversations, POST [id]/messages). Nothing is created
 * until the first message or attachment calls `ensureConversation`.
 * A 401 means a visitor: chat and files then stay ephemeral in this tab.
 */
export function useMaestroConversation(maestroId: string) {
  const idRef = useRef<string | null>(null);
  const visitorRef = useRef(false);
  const pendingRef = useRef<Promise<string | null> | null>(null);
  const generationRef = useRef(0);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const ensureConversation = useCallback((): Promise<string | null> => {
    if (idRef.current) return Promise.resolve(idRef.current);
    if (visitorRef.current) return Promise.resolve(null);
    if (pendingRef.current) return pendingRef.current;
    const generation = generationRef.current;
    const request = (async () => {
      try {
        const response = await csrfFetch('/api/conversations', {
          method: 'POST',
          body: JSON.stringify({ maestroId }),
        });
        if (generation !== generationRef.current) return null;
        if (response.status === 401) {
          // Only a real visitor may stay ephemeral; an expired account session is an error.
          const identity = await whenIdentitySettled();
          if (identity.status !== 'anonymous') throw new ConversationUnavailableError();
          visitorRef.current = true;
          return null;
        }
        if (!response.ok) throw new ConversationUnavailableError();
        const data = (await response.json()) as { id?: unknown };
        if (typeof data.id !== 'string') throw new ConversationUnavailableError();
        idRef.current = data.id;
        setConversationId(data.id);
        return data.id;
      } catch (error) {
        logger.warn('Conversation creation failed', { error: String(error) });
        throw error instanceof ConversationUnavailableError
          ? error
          : new ConversationUnavailableError();
      } finally {
        if (generation === generationRef.current) pendingRef.current = null;
      }
    })();
    pendingRef.current = request;
    return request;
  }, [maestroId]);

  const persistMessage = useCallback(
    async (id: string, role: 'user' | 'assistant', content: string) => {
      if (!content) return;
      try {
        await csrfFetch(`/api/conversations/${encodeURIComponent(id)}/messages`, {
          method: 'POST',
          body: JSON.stringify({ role, content }),
        });
      } catch (error) {
        logger.warn('Message persistence failed', { error: String(error) });
      }
    },
    [],
  );

  const adoptConversation = useCallback((id: string) => {
    generationRef.current += 1;
    pendingRef.current = null;
    idRef.current = id;
    setConversationId(id);
  }, []);

  const resetConversation = useCallback(() => {
    generationRef.current += 1;
    pendingRef.current = null;
    idRef.current = null;
    visitorRef.current = false;
    setConversationId(null);
  }, []);

  return {
    conversationId,
    getConversationId: () => idRef.current,
    ensureConversation,
    persistMessage,
    adoptConversation,
    resetConversation,
  };
}
