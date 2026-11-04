import { useCallback, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth';
import type { Maestro, ChatMessage, ToolCall } from '@/types';
import type { AttachmentDocument } from '@/lib/conversation/attachments/types';
import {
  attachmentErrorKey,
  buildAttachmentFields,
  chatTurnError,
} from './attachments/chat-attachment-fields';

interface TurnMetrics {
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
}

interface UseMaestroChatHandlersProps {
  maestro: Maestro;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setToolCalls: React.Dispatch<React.SetStateAction<ToolCall[]>>;
  onQuestionAsked: () => void;
  onTurnComplete?: (metrics: TurnMetrics) => void;
  readyDocs?: AttachmentDocument[];
  ensureConversation?: () => Promise<string | null>;
  persistMessage?: (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
  ) => Promise<void>;
}

export function useMaestroChatHandlers({
  maestro,
  input,
  setInput,
  isLoading,
  setIsLoading,
  messages,
  setMessages,
  setToolCalls,
  onQuestionAsked,
  onTurnComplete,
  readyDocs = [],
  ensureConversation,
  persistMessage,
}: UseMaestroChatHandlersProps) {
  const locale = useLocale();
  const t = useTranslations('chat');

  // Every request/persist step belongs to a generation; reset, account switch,
  // Maestro change and unmount invalidate it so late responses are dropped.
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const invalidate = useCallback(() => {
    generationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);
  const beginTurn = useCallback(() => {
    generationRef.current += 1;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return { generation: generationRef.current, signal: controller.signal };
  }, []);
  const isStale = useCallback((generation: number) => generation !== generationRef.current, []);

  useEffect(() => invalidate, [maestro.id, invalidate]);

  const persistTurn = useCallback(
    async (
      generation: number,
      conversationId: string | null,
      userContent: string,
      assistantContent: string,
    ) => {
      if (!conversationId || !persistMessage || isStale(generation)) return;
      await persistMessage(conversationId, 'user', userContent);
      if (isStale(generation)) return;
      await persistMessage(conversationId, 'assistant', assistantContent);
    },
    [persistMessage, isStale],
  );

  // Created on the first real interaction only; the same docs ride on every turn.
  const attachmentFields = useCallback(async () => {
    const conversationId = (await ensureConversation?.()) ?? null;
    return { conversationId, fields: buildAttachmentFields(readyDocs, conversationId) };
  }, [ensureConversation, readyDocs]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent, contentOverride?: string) => {
      e?.preventDefault();
      const userContent = (contentOverride || input).trim();
      if (!userContent || isLoading) return;
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userContent,
        timestamp: new Date(),
      };

      const { generation, signal } = beginTurn();
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      if (userContent.includes('?')) onQuestionAsked();

      try {
        const { conversationId, fields } = await attachmentFields();
        if (isStale(generation)) return;
        const startTime = Date.now();
        const response = await csrfFetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            messages: [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: 'user', content: userContent },
            ],
            systemPrompt: maestro.systemPrompt,
            maestroId: maestro.id,
            language: locale,
            ...fields,
          }),
          signal,
        });
        const latencyMs = Date.now() - startTime;

        if (!response.ok) throw await chatTurnError(response);
        const data = await response.json();
        if (isStale(generation)) return;

        if (onTurnComplete && data.usage) {
          onTurnComplete({
            latencyMs,
            tokensIn: data.usage.prompt_tokens || 0,
            tokensOut: data.usage.completion_tokens || 0,
          });
        }

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content || data.message || '',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        void persistTurn(generation, conversationId, userContent, assistantMessage.content);

        if (data.toolCalls?.length > 0) {
          setToolCalls((prev) => [...prev, ...data.toolCalls]);
        }
      } catch (error) {
        if (isStale(generation)) return;
        const errorKey = attachmentErrorKey(error);
        logger.error('Chat request failed', { error: String(error) });
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: errorKey
              ? t(`attachments.errors.${errorKey}`)
              : 'Mi dispiace, ho avuto un problema. Puoi riprovare?',
            timestamp: new Date(),
          },
        ]);
      } finally {
        if (!isStale(generation)) setIsLoading(false);
      }
    },
    [
      input,
      isLoading,
      messages,
      maestro.systemPrompt,
      maestro.id,
      locale,
      t,
      attachmentFields,
      persistTurn,
      beginTurn,
      isStale,
      setInput,
      setIsLoading,
      setMessages,
      setToolCalls,
      onQuestionAsked,
      onTurnComplete,
    ],
  );

  const clearChat = useCallback(() => {
    invalidate();
    setIsLoading(false);
    setMessages([]);
    setToolCalls([]);
  }, [invalidate, setIsLoading, setMessages, setToolCalls]);

  const handleWebcamCapture = useCallback(
    async (imageData: string) => {
      const userMessage: ChatMessage = {
        id: `webcam-${Date.now()}`,
        role: 'user',
        content: '[Foto catturata]',
        timestamp: new Date(),
      };
      const { generation, signal } = beginTurn();
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Step 1: Analyze image with Vision API
        const analyzeRes = await csrfFetch('/api/image/analyze', {
          method: 'POST',
          body: JSON.stringify({ imageBase64: imageData }),
          signal,
        });

        if (!analyzeRes.ok) {
          throw new Error('Image analysis failed');
        }

        const { text, description } = await analyzeRes.json();
        if (isStale(generation)) return;

        // Build context from analysis results
        const analysisContext = text
          ? `[Analisi foto] Testo estratto: ${text}\nDescrizione: ${description}`
          : `[Analisi foto] ${description}`;

        // Step 2: Send analysis to chat API for maestro response
        const { conversationId, fields } = await attachmentFields();
        if (isStale(generation)) return;
        const startTime = Date.now();
        const chatRes = await csrfFetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            messages: [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: 'user', content: analysisContext },
            ],
            systemPrompt: maestro.systemPrompt,
            maestroId: maestro.id,
            language: locale,
            ...fields,
          }),
          signal,
        });
        const latencyMs = Date.now() - startTime;

        if (!chatRes.ok) throw await chatTurnError(chatRes);
        const data = await chatRes.json();
        if (isStale(generation)) return;

        if (onTurnComplete && data.usage) {
          onTurnComplete({
            latencyMs,
            tokensIn: data.usage.prompt_tokens || 0,
            tokensOut: data.usage.completion_tokens || 0,
          });
        }

        const photoReply: string = data.content || data.message || '';
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant' as const,
            content: photoReply,
            timestamp: new Date(),
          },
        ]);
        void persistTurn(generation, conversationId, userMessage.content, photoReply);

        if (data.toolCalls?.length > 0) {
          setToolCalls((prev) => [...prev, ...data.toolCalls]);
        }
      } catch (error) {
        if (isStale(generation)) return;
        const errorKey = attachmentErrorKey(error);
        logger.error('Webcam analysis failed', { error: String(error) });
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant' as const,
            content: errorKey
              ? t(`attachments.errors.${errorKey}`)
              : 'Mi dispiace, non sono riuscito ad analizzare la foto. Puoi descrivermi cosa vedi?',
            timestamp: new Date(),
          },
        ]);
      } finally {
        if (!isStale(generation)) setIsLoading(false);
      }
    },
    [
      messages,
      maestro.systemPrompt,
      maestro.id,
      locale,
      t,
      attachmentFields,
      persistTurn,
      beginTurn,
      isStale,
      setMessages,
      setIsLoading,
      setToolCalls,
      onTurnComplete,
    ],
  );

  const requestTool = useCallback(
    (
      tool:
        | 'mindmap'
        | 'quiz'
        | 'flashcards'
        | 'demo'
        | 'search'
        | 'summary'
        | 'diagram'
        | 'timeline',
    ) => {
      const toolPrompts: Record<string, string> = {
        mindmap: `Crea una mappa mentale sull'argomento di cui stiamo parlando`,
        quiz: `Crea un quiz per verificare la mia comprensione`,
        flashcards: `Crea delle flashcard per aiutarmi a memorizzare`,
        demo: `Crea una demo interattiva per spiegarmi meglio il concetto`,
        search: `Cerca informazioni utili sull'argomento`,
        summary: `Fammi un riassunto strutturato dell'argomento`,
        diagram: `Crea un diagramma per visualizzare il concetto`,
        timeline: `Crea una linea temporale degli eventi`,
      };
      setInput(toolPrompts[tool]);
    },
    [setInput],
  );

  return {
    invalidate,
    handleSubmit,
    clearChat,
    handleWebcamCapture,
    requestTool,
  };
}
