import { useState, useRef, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useConversationStore } from '@/lib/stores';
import { useVoiceSession, type ConnectionInfo } from '@/lib/hooks/use-voice-session';
import type { ToolType, ToolState } from '@/types/tools';
import type { CharacterInfo } from '../../utils/character-utils';
import type { Message } from './types';
import {
  loadMessagesFromServer,
  convertStoreMessages,
} from './conversation-loader';
import { createUserMessage, createErrorMessage } from './message-handler';
import { isStreamingAvailable } from './streaming-handler';
import { handleSendMessage } from './send-handler';
import {
  requestTool,
  createInitialToolState,
  createErrorToolState,
} from './tool-handler';
import { useVoiceEffects } from './voice-effects';

export function useCharacterChat(characterId: string, character: CharacterInfo) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolState | null>(null);
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const streamAbortRef = useRef<AbortController | null>(null);

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
          { id: `voice-${Date.now()}`, role: 'user', content: text, timestamp: new Date(), isVoice: true },
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
    isStreamingAvailable().then((available) => {
      setStreamingEnabled(available);
      if (available) logger.debug('[CharacterChat] Streaming enabled');
    });
  }, []);

  useVoiceEffects({
    isVoiceActive,
    connectionInfo,
    isConnected,
    connectionState,
    character,
    characterId,
    hasAttemptedConnectionRef: hasAttemptedConnection,
    setConnectionInfo,
    setConfigError,
    connect,
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (hasLoadedMessages.current) return;
    hasLoadedMessages.current = true;

    async function initConversation() {
      const existingConv = conversations.find((c) => c.maestroId === characterId);

      if (existingConv) {
        conversationIdRef.current = existingConv.id;
        const serverMessages = await loadMessagesFromServer(existingConv.id);
        if (serverMessages) { setMessages(serverMessages); return; }
        if (existingConv.messages.length > 0) { setMessages(convertStoreMessages(existingConv.messages)); return; }
      }

      const newConvId = await createConversation(characterId);
      conversationIdRef.current = newConvId;
      setMessages([]);
    }

    initConversation();
  }, [characterId, conversations, createConversation]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = createUserMessage(input);
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamedContent('');

    if (conversationIdRef.current) {
      addMessageToStore(conversationIdRef.current, { role: 'user', content: userMessage.content });
    }

    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    await handleSendMessage({
      content: userMessage.content,
      messages,
      character,
      characterId,
      streamingEnabled,
      signal: abortController.signal,
      callbacks: {
        onStreamingStart: (id) => {
          setIsStreaming(true);
          setMessages((prev) => [...prev, { id, role: 'assistant', content: '', timestamp: new Date() }]);
        },
        onStreamingChunk: (id, accumulated) => {
          setStreamedContent(accumulated);
          setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: accumulated } : m)));
        },
        onStreamingComplete: (id, fullResponse) => {
          setIsStreaming(false);
          streamAbortRef.current = null;
          setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, id: `assistant-${Date.now()}`, content: fullResponse } : m)));
          if (conversationIdRef.current) addMessageToStore(conversationIdRef.current, { role: 'assistant', content: fullResponse });
          setIsLoading(false);
        },
        onStreamingError: (id) => {
          setIsStreaming(false);
          streamAbortRef.current = null;
          setMessages((prev) => [...prev.filter((m) => m.id !== id), createErrorMessage()]);
          setIsLoading(false);
        },
        onStreamingFallback: (id) => {
          setIsStreaming(false);
          setMessages((prev) => prev.filter((m) => m.id !== id));
        },
        onNonStreamingComplete: (assistantMessage, toolState) => {
          setMessages((prev) => [...prev, assistantMessage]);
          if (conversationIdRef.current) addMessageToStore(conversationIdRef.current, { role: 'assistant', content: assistantMessage.content });
          if (toolState) setActiveTool(toolState);
          setIsLoading(false);
        },
        onError: () => {
          setMessages((prev) => [...prev, createErrorMessage()]);
          setIsLoading(false);
        },
      },
    });
  }, [input, isLoading, messages, character, characterId, addMessageToStore, streamingEnabled]);

  const handleToolRequest = useCallback(
    async (toolType: ToolType) => {
      if (isLoading) return;

      setIsLoading(true);
      setActiveTool(createInitialToolState(toolType));

      const userMessage = createUserMessage(`Usa lo strumento ${toolType}`);
      setMessages((prev) => [...prev, userMessage]);

      try {
        const { assistantMessage, toolState } = await requestTool(toolType, messages, character, characterId);
        if (assistantMessage) setMessages((prev) => [...prev, assistantMessage]);
        setActiveTool(toolState);
      } catch (error) {
        logger.error('Tool request error', { error });
        setMessages((prev) => [...prev, createErrorMessage()]);
        setActiveTool(createErrorToolState(toolType, 'Tool request failed'));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, character, characterId]
  );

  const handleVoiceCall = useCallback(() => {
    if (isVoiceActive) disconnect();
    setIsVoiceActive((prev) => !prev);
  }, [isVoiceActive, disconnect]);

  const cancelStream = useCallback(() => {
    if (!streamAbortRef.current) return;
    streamAbortRef.current.abort();
    streamAbortRef.current = null;
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    try {
      const serverMessages = await loadMessagesFromServer(conversationId);
      if (serverMessages) {
        conversationIdRef.current = conversationId;
        setMessages(serverMessages);
      }
    } catch (error) {
      logger.error('Failed to load conversation', { error: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(async () => {
    setMessages([]);
    setInput('');
    setActiveTool(null);
    const newConvId = await createConversation(characterId);
    conversationIdRef.current = newConvId;
  }, [characterId, createConversation]);

  return {
    messages, input, setInput, isLoading, isVoiceActive, isConnected, connectionState,
    configError, activeTool, setActiveTool, messagesEndRef, handleSend, handleToolRequest,
    handleVoiceCall, isStreaming, streamingEnabled, streamedContent, cancelStream,
    loadConversation, clearChat, currentConversationId: conversationIdRef.current,
  };
}
