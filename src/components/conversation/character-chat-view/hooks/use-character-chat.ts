/**
 * @file use-character-chat.ts
 * @brief Custom hook for character chat state management
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useConversationStore } from '@/lib/stores';
import { useVoiceSession, type ConnectionInfo } from '@/lib/hooks/use-voice-session';
import type { ToolType, ToolState } from '@/types/tools';
import type { CharacterInfo } from '../utils/character-utils';
import { characterToMaestro } from '../utils/character-utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}


const FUNCTION_NAME_TO_TOOL_TYPE: Record<string, ToolType> = {
  create_mindmap: 'mindmap',
  create_quiz: 'quiz',
  create_demo: 'demo',
  web_search: 'search',
  create_flashcards: 'flashcard',
  create_diagram: 'diagram',
  create_timeline: 'timeline',
  create_summary: 'summary',
  open_student_summary: 'summary',
};

export function useCharacterChat(
  characterId: string,
  character: CharacterInfo
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [connectionInfo, setConnectionInfo] =
    useState<ConnectionInfo | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAttemptedConnection = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const hasLoadedMessages = useRef(false);
  const lastCharacterIdRef = useRef<string | null>(null);

  const { conversations, createConversation, addMessage: addMessageToStore } =
    useConversationStore();

  const voiceSession = useVoiceSession({
    onTranscript: (role, text) => {
      if (role === 'user') {
        setMessages((prev) => [
          ...prev,
          {
            id: `voice-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date(),
            isVoice: true,
          },
        ]);
      }
    },
  });

  const { isConnected, connectionState, connect, disconnect } = voiceSession;

  useEffect(() => {
    if (lastCharacterIdRef.current !== null && lastCharacterIdRef.current !== characterId) {
      hasLoadedMessages.current = false;
      setMessages([]);
      conversationIdRef.current = null;
    }
    lastCharacterIdRef.current = characterId;
  }, [characterId]);

  useEffect(() => {
    async function fetchConnectionInfo() {
      try {
        const cached = sessionStorage.getItem('voice-connection-info');
        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (data.provider) {
              setConnectionInfo(data as ConnectionInfo);
              return;
            }
          } catch {
            sessionStorage.removeItem('voice-connection-info');
          }
        }

        const response = await fetch('/api/realtime/token');
        const data = await response.json();

        if (response.status === 429) {
          logger.warn('Rate limit exceeded for voice token', {
            retryAfter: data.retryAfter,
          });
          setConfigError('Troppe richieste. Riprova tra qualche secondo.');
          return;
        }

        if (data.error) {
          logger.error('Voice API error', { error: data.error });
          setConfigError(data.message || 'Servizio vocale non configurato');
          return;
        }

        sessionStorage.setItem('voice-connection-info', JSON.stringify(data));
        setConnectionInfo(data as ConnectionInfo);
      } catch (error) {
        logger.error('Failed to get voice connection info', {
          error: String(error),
        });
        setConfigError('Impossibile connettersi al servizio vocale');
      }
    }
    fetchConnectionInfo();
  }, []);

  useEffect(() => {
    const startConnection = async () => {
      if (!isVoiceActive || hasAttemptedConnection.current) return;
      if (!connectionInfo || isConnected || connectionState !== 'idle') return;

      hasAttemptedConnection.current = true;
      setConfigError(null);

      try {
        const maestroLike = characterToMaestro(character, characterId);
        await connect(maestroLike, connectionInfo);
      } catch (error) {
        logger.error('Voice connection failed', { error: String(error) });
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setConfigError(
            'Microfono non autorizzato. Abilita il microfono nelle impostazioni del browser.'
          );
        } else {
          setConfigError('Errore di connessione vocale');
        }
      }
    };

    startConnection();
  }, [
    isVoiceActive,
    connectionInfo,
    isConnected,
    connectionState,
    character,
    characterId,
    connect,
  ]);

  useEffect(() => {
    if (!isVoiceActive) {
      hasAttemptedConnection.current = false;
    }
  }, [isVoiceActive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (hasLoadedMessages.current) return;
    hasLoadedMessages.current = true;

    async function initConversation() {
      const existingConv = conversations.find((c) => c.maestroId === characterId);

      if (existingConv) {
        conversationIdRef.current = existingConv.id;

        try {
          const response = await fetch(
            `/api/conversations/${existingConv.id}`
          );
          if (response.ok) {
            const convData = await response.json();
            if (convData.messages && convData.messages.length > 0) {
              setMessages(
                convData.messages.map(
                  (m: {
                    id: string;
                    role: string;
                    content: string;
                    createdAt: string;
                  }) => ({
                    id: m.id,
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                    timestamp: new Date(m.createdAt),
                  })
                )
              );
              logger.debug('Loaded messages from server', {
                characterId,
                messageCount: convData.messages.length,
              });
              return;
            }
          }
        } catch (error) {
          logger.warn('Failed to load messages from server', {
            error: String(error),
          });
        }

        if (existingConv.messages.length > 0) {
          setMessages(
            existingConv.messages.map((m) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: new Date(m.timestamp),
            }))
          );
          logger.debug('Loaded existing conversation from store', {
            characterId,
            messageCount: existingConv.messages.length,
          });
          return;
        }
      }

      const newConvId = await createConversation(characterId);
      conversationIdRef.current = newConvId;

      const greetingMessage: Message = {
        id: 'greeting',
        role: 'assistant',
        content: character.greeting,
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);

      await addMessageToStore(newConvId, {
        role: 'assistant',
        content: character.greeting,
      });
      logger.debug('Created new conversation', {
        characterId,
        convId: newConvId,
      });
    }

    initConversation();
  }, [
    characterId,
    character.greeting,
    conversations,
    createConversation,
    addMessageToStore,
  ]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (conversationIdRef.current) {
      addMessageToStore(conversationIdRef.current, {
        role: 'user',
        content: userMessage.content,
      });
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage.content },
          ],
          systemPrompt: character.systemPrompt,
          maestroId: characterId,
          enableTools: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      let responseContent = data.content || data.message;
      if (!responseContent || responseContent.trim() === '') {
        if (data.toolCalls && data.toolCalls.length > 0) {
          const toolNames = data.toolCalls.map(
            (tc: { type?: string }) => tc.type
          );
          if (toolNames.includes('create_mindmap')) {
            responseContent = 'Ti sto creando la mappa mentale...';
          } else if (toolNames.includes('create_quiz')) {
            responseContent = 'Ti sto preparando il quiz...';
          } else if (toolNames.includes('create_flashcards')) {
            responseContent = 'Ti sto creando le flashcard...';
          } else if (toolNames.includes('create_summary')) {
            responseContent = 'Ti sto preparando il riassunto...';
          } else {
            responseContent = 'Sto elaborando la tua richiesta...';
          }
        } else {
          responseContent = 'Mi dispiace, non ho capito. Puoi ripetere?';
        }
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (conversationIdRef.current) {
        addMessageToStore(conversationIdRef.current, {
          role: 'assistant',
          content: assistantMessage.content,
        });
      }

      if (data.toolCalls && data.toolCalls.length > 0) {
        const toolCall = data.toolCalls[0];
        const toolType =
          FUNCTION_NAME_TO_TOOL_TYPE[toolCall.type] ||
          (toolCall.type as ToolType);
        const toolContent =
          toolCall.result?.data || toolCall.result || toolCall.arguments;
        setActiveTool({
          id: toolCall.id,
          type: toolType,
          status: 'completed',
          progress: 1,
          content: toolContent,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      logger.error('Chat error', { error });
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Mi dispiace, c\'è stato un errore. Riprova tra poco!',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    isLoading,
    messages,
    character.systemPrompt,
    characterId,
    addMessageToStore,
  ]);

  const handleToolRequest = useCallback(
    async (toolType: ToolType) => {
      if (isLoading) return;

      setIsLoading(true);

      const newTool: ToolState = {
        id: `tool-${Date.now()}`,
        type: toolType,
        status: 'initializing',
        progress: 0,
        content: null,
        createdAt: new Date(),
      };
      setActiveTool(newTool);

      const toolPrompts: Partial<Record<ToolType, string>> = {
        mindmap: 'Crea una mappa mentale sull\'argomento che stiamo studiando',
        quiz: 'Fammi un quiz per verificare cosa ho capito',
        flashcard: 'Crea delle flashcard per aiutarmi a memorizzare',
        demo: 'Mostrami una demo interattiva',
        summary: 'Fammi un riassunto strutturato',
        diagram: 'Crea un diagramma',
        timeline: 'Crea una linea del tempo',
      };

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: toolPrompts[toolType] || `Usa lo strumento ${toolType}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: 'user', content: userMessage.content },
            ],
            systemPrompt: character.systemPrompt,
            maestroId: characterId,
            enableTools: true,
            requestedTool:
              toolType === 'flashcard' ? 'flashcard' : toolType,
          }),
        });

        if (!response.ok) throw new Error('Failed to request tool');

        const data = await response.json();

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content || '',
          timestamp: new Date(),
        };

        if (data.content) {
          setMessages((prev) => [...prev, assistantMessage]);
        }

        if (data.toolCalls?.length > 0) {
          const toolCall = data.toolCalls[0];
          const mappedToolType =
            FUNCTION_NAME_TO_TOOL_TYPE[toolCall.type] || toolType;
          const toolContent =
            toolCall.result?.data || toolCall.result || toolCall.arguments;
          setActiveTool({
            ...newTool,
            type: mappedToolType,
            status: 'completed',
            progress: 1,
            content: toolContent,
          });
        } else {
          setActiveTool(null);
        }
      } catch (error) {
        logger.error('Tool request error', { error });
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Mi dispiace, non sono riuscito a creare lo strumento. Riprova?',
            timestamp: new Date(),
          },
        ]);
        setActiveTool({
          ...newTool,
          status: 'error',
          error: 'Errore nella creazione dello strumento',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, character.systemPrompt, characterId]
  );

  const handleVoiceCall = useCallback(() => {
    if (isVoiceActive) {
      disconnect();
    }
    setIsVoiceActive((prev) => !prev);
  }, [isVoiceActive, disconnect]);

  return {
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
  };
}

