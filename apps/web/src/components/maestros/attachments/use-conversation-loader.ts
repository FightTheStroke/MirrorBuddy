import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import type { ChatMessage } from '@/types';

interface StoredMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Options {
  maestroId: string;
  setMessages: (messages: ChatMessage[]) => void;
  setSessionEnded: (ended: boolean) => void;
  stopVoice: () => void;
  invalidateTurn: () => void;
  resetAttachments: () => void;
  adoptConversation: (id: string) => void;
  restoreAttachments: (id: string) => Promise<void>;
  onFailure: () => void;
  onLoadingChange: (loading: boolean) => void;
}

/**
 * Loads an owned conversation of this Maestro (history selection and URL refresh share it).
 * Starting a load stops voice and invalidates the pending chat turn; a newer load,
 * `cancel()` (new chat / account change), a Maestro change or unmount drops older responses.
 */
export function useConversationLoader(options: Options) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    generationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    optionsRef.current.onLoadingChange(false);
  }, []);

  const load = useCallback(
    async (conversationId: string): Promise<boolean> => {
      cancel();
      const generation = generationRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      const o = optionsRef.current;
      o.onLoadingChange(true);
      o.stopVoice();
      o.invalidateTurn();
      o.resetAttachments();
      const stale = () => generation !== generationRef.current;
      try {
        const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, {
          signal: controller.signal,
        });
        const data = res.ok ? await res.json() : null;
        if (stale()) return false;
        if (!data || data.maestroId !== o.maestroId || !Array.isArray(data.messages)) {
          o.onFailure();
          return false;
        }
        o.setMessages(
          (data.messages as StoredMessage[])
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: new Date(m.createdAt),
            })),
        );
        o.setSessionEnded(false);
        o.adoptConversation(conversationId);
        await o.restoreAttachments(conversationId);
        return !stale();
      } catch (error) {
        if (stale()) return false;
        logger.warn('Conversation load failed', { error: String(error) });
        o.onFailure();
        return false;
      } finally {
        if (!stale()) o.onLoadingChange(false);
      }
    },
    [cancel],
  );

  useEffect(() => cancel, [options.maestroId, cancel]);

  return { load, cancel };
}
