import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth/csrf-client';
import type { Maestro, ChatMessage, ToolCall } from '@/types';

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
}: UseMaestroChatHandlersProps) {
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userContent = input.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    if (userContent.includes('?')) onQuestionAsked();

    try {
      const response = await csrfFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'system', content: maestro.systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userContent },
          ],
          maestroId: maestro.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content || data.message || '',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (data.toolCalls?.length > 0) {
        setToolCalls(prev => [...prev, ...data.toolCalls]);
      }
    } catch (error) {
      logger.error('Chat error', undefined, error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema. Puoi riprovare?',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, maestro.systemPrompt, maestro.id, setInput, setIsLoading, setMessages, setToolCalls, onQuestionAsked]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setToolCalls([]);
  }, [setMessages, setToolCalls]);

  const handleWebcamCapture = useCallback((imageData: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: `webcam-${Date.now()}`,
        role: 'user',
        content: '[Foto catturata]',
        timestamp: new Date(),
      },
      {
        id: `webcam-info-${Date.now()}`,
        role: 'assistant',
        content: 'Ho ricevuto la tua foto! Per ora non posso analizzarla automaticamente, ma puoi descrivermi cosa vedi o cosa vorresti che ti spiegassi.',
        timestamp: new Date(),
      },
    ]);
    logger.debug('Webcam captured', { imageDataLength: imageData.length });
  }, [setMessages]);

  const requestTool = useCallback((tool: 'mindmap' | 'quiz' | 'flashcards' | 'demo' | 'search' | 'summary' | 'diagram' | 'timeline') => {
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
  }, [setInput]);

  return {
    handleSubmit,
    clearChat,
    handleWebcamCapture,
    requestTool,
  };
}
