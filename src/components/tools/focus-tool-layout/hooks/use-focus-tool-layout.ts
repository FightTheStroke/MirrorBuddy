/**
 * @file use-focus-tool-layout.ts
 * @brief Custom hook for focus tool layout state management
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUIStore, useSettingsStore } from '@/lib/stores';
import { useVoiceSession, type ConnectionInfo } from '@/lib/hooks/use-voice-session';
import { logger } from '@/lib/logger';
import { getMaestroOrCoach, getCharacterProps, createMaestroForVoice } from '../utils/character-utils';
import { FUNCTION_NAME_TO_TOOL_TYPE, TOOL_NAMES_LOWERCASE } from '../constants';
import { TOOL_PROMPTS } from '@/components/conversation/constants/tool-constants';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useFocusToolLayout() {
  const uiStore = useUIStore();
  const {
    focusMode,
    focusToolType,
    focusMaestroId,
    focusInteractionMode,
    focusTool,
    exitFocusMode,
  } = uiStore;
  const { studentProfile } = useSettingsStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTranscriptIdRef = useRef<string | null>(null);
  const autoRequestSentRef = useRef(false);

  const character = getMaestroOrCoach(
    focusMaestroId,
    studentProfile?.preferredCoach
  );
  const characterProps = getCharacterProps(character);

  const {
    isConnected: voiceConnected,
    isSpeaking,
    isMuted,
    inputLevel,
    connectionState,
    connect: voiceConnect,
    disconnect: voiceDisconnect,
    toggleMute,
    sessionId: voiceSessionId,
  } = useVoiceSession({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Voice session error in focus mode', { message });
      setConfigError(message || 'Errore di connessione vocale');
    },
    onTranscript: (role, text) => {
      const transcriptId = `voice-${role}-${Date.now()}`;

      if (lastTranscriptIdRef.current === text.substring(0, 50)) {
        return;
      }
      lastTranscriptIdRef.current = text.substring(0, 50);

      setMessages((prev) => [
        ...prev,
        {
          id: transcriptId,
          role,
          content: text,
          timestamp: new Date(),
        },
      ]);
    },
  });

  useEffect(() => {
    async function fetchConnectionInfo() {
      try {
        const cached = sessionStorage.getItem('voice-connection-info');
        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (data.provider && data.proxyPort !== undefined) {
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
    if (focusMode) {
      fetchConnectionInfo();
    }
  }, [focusMode]);

  useEffect(() => {
    if (
      focusMode &&
      focusInteractionMode === 'voice' &&
      connectionInfo &&
      !isVoiceActive
    ) {
      setIsVoiceActive(true);
    }
  }, [focusMode, focusInteractionMode, connectionInfo, isVoiceActive]);

  useEffect(() => {
    if (
      !isVoiceActive ||
      !connectionInfo ||
      connectionState !== 'idle' ||
      !character
    )
      return;

    const startVoice = async () => {
      setConfigError(null);
      try {
        const maestroForVoice = createMaestroForVoice(character, characterProps);
        await voiceConnect(maestroForVoice, connectionInfo);
      } catch (error) {
        logger.error('Voice connection failed', { error: String(error) });
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setConfigError(
            'Microfono non autorizzato. Abilita il microfono nelle impostazioni del browser.'
          );
        } else {
          setConfigError('Errore di connessione vocale');
        }
        setIsVoiceActive(false);
      }
    };

    startVoice();
  }, [
    isVoiceActive,
    connectionInfo,
    connectionState,
    character,
    characterProps,
    voiceConnect,
  ]);

  const handleVoiceToggle = useCallback(() => {
    if (isVoiceActive) {
      voiceDisconnect();
      setIsVoiceActive(false);
    } else {
      setIsVoiceActive(true);
    }
  }, [isVoiceActive, voiceDisconnect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        exitFocusMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode, exitFocusMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (focusMode) {
      inputRef.current?.focus();
    }
  }, [focusMode]);

  // Reset auto request flag when exiting focus mode
  useEffect(() => {
    if (!focusMode) {
      autoRequestSentRef.current = false;
    }
  }, [focusMode]);

  // Auto-send tool creation request when entering focus mode without initialTool
  useEffect(() => {
    if (
      focusMode &&
      character &&
      characterProps &&
      !focusTool &&
      focusToolType &&
      messages.length === 0 &&
      !isLoading &&
      !autoRequestSentRef.current
    ) {
      autoRequestSentRef.current = true;
      const toolPrompt = TOOL_PROMPTS[focusToolType] || `Crea una ${TOOL_NAMES_LOWERCASE[focusToolType] || 'strumento'}`;
      
      setIsLoading(true);
      
      const sendAutoRequest = async () => {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [
                { role: 'user', content: toolPrompt },
              ],
              systemPrompt: characterProps.systemPrompt,
              maestroId: character.id,
              enableTools: true,
              requestedTool: focusToolType,
            }),
          });

          if (!response.ok) throw new Error('Failed to send message');

          const data = await response.json();

          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.content || '',
            timestamp: new Date(),
          };

          if (data.content) {
            setMessages([assistantMessage]);
          }

          if (data.toolCalls && data.toolCalls.length > 0) {
            const toolCall = data.toolCalls[0];
            const toolType =
              FUNCTION_NAME_TO_TOOL_TYPE[toolCall.type] ||
              focusToolType ||
              'mindmap';
            const toolContent =
              toolCall.result?.data || toolCall.result || toolCall.arguments;

            uiStore.setFocusTool({
              id: toolCall.id || `tool-${Date.now()}`,
              type: toolType,
              status: 'completed',
              progress: 1,
              content: toolContent,
              createdAt: new Date(),
            });
          } else if (!data.content) {
            // If no tool calls and no content, add a follow-up message
            setMessages([
              {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: 'Non ho capito bene. Puoi specificare meglio l\'argomento?',
                timestamp: new Date(),
              },
            ]);
          }
        } catch (error) {
          logger.error('Auto tool creation error in focus mode', { error });
          setMessages([
            {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: 'Mi dispiace, c\'è stato un errore. Riprova!',
              timestamp: new Date(),
            },
          ]);
        } finally {
          setIsLoading(false);
        }
      };

      sendAutoRequest();
    }
  }, [focusMode, character, characterProps, focusTool, focusToolType, messages.length, isLoading, uiStore]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || !character || !characterProps) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
          ],
          systemPrompt: characterProps.systemPrompt,
          maestroId: character.id,
          enableTools: true,
          requestedTool: focusToolType,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

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

      if (data.toolCalls && data.toolCalls.length > 0) {
        const toolCall = data.toolCalls[0];
        const toolType =
          FUNCTION_NAME_TO_TOOL_TYPE[toolCall.type] ||
          focusToolType ||
          'mindmap';
        const toolContent =
          toolCall.result?.data || toolCall.result || toolCall.arguments;

        uiStore.setFocusTool({
          id: toolCall.id || `tool-${Date.now()}`,
          type: toolType,
          status: 'completed',
          progress: 1,
          content: toolContent,
          createdAt: new Date(),
        });
      } else if (!data.content) {
        // If no tool calls and no content, add a follow-up message
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: 'Non ho capito bene. Puoi specificare meglio l\'argomento?',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      logger.error('Chat error in focus mode', { error });
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Mi dispiace, c\'è stato un errore. Riprova!',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    isLoading,
    character,
    characterProps,
    uiStore,
    messages,
    focusToolType,
  ]);

  return {
    focusMode,
    focusToolType,
    focusTool,
    setFocusTool: uiStore.setFocusTool,
    exitFocusMode,
    characterProps,
    messages,
    input,
    setInput,
    isLoading,
    isVoiceActive,
    voiceConnected,
    isSpeaking,
    isMuted,
    inputLevel,
    configError,
    sidebarExpanded,
    setSidebarExpanded,
    rightPanelCollapsed,
    setRightPanelCollapsed,
    handleSend,
    handleVoiceToggle,
    toggleMute,
    messagesEndRef,
    inputRef,
    voiceSessionId,
  };
}

