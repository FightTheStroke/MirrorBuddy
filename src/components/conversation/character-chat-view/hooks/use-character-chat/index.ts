/**
 * Use-character-chat hook - main implementation
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useConversationStore } from '@/lib/stores';
import { useVoiceSession, type ConnectionInfo } from '@/lib/hooks/use-voice-session';
import type { ToolType, ToolState } from '@/types/tools';
import type { CharacterInfo } from '../../utils/character-utils';
import { characterToMaestro } from '../../utils/character-utils';
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
import {
  fetchVoiceConnectionInfo,
  handleMicrophoneError,
} from './voice-handler';

export function useCharacterChat(characterId: string, character: CharacterInfo) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolState | null>(null);

  // Streaming state
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

  // Reset messages when character changes
  useEffect(() => {
    if (lastCharacterIdRef.current !== null && lastCharacterIdRef.current !== characterId) {
      hasLoadedMessages.current = false;
      setMessages([]);
      conversationIdRef.current = null;
    }
    lastCharacterIdRef.current = characterId;
  }, [characterId]);

  // Fetch voice connection info
  useEffect(() => {
    fetchVoiceConnectionInfo().then(({ connectionInfo: info, error }) => {
      if (error) setConfigError(error);
      else if (info) setConnectionInfo(info);
    });
  }, []);

  // Check streaming availability
  useEffect(() => {
    isStreamingAvailable().then((available) => {
      setStreamingEnabled(available);
      if (available) logger.debug('[CharacterChat] Streaming enabled');
    });
  }, []);

  // Handle voice activation
  useEffect(() => {
    const startConnection = async () => {
      if (!isVoiceActive || hasAttemptedConnection.current) return;
      if (!connectionInfo || isConnected || connectionState !== 'idle') return;

      hasAttemptedConnection.current = true;
      setConfigError(null);

      try {
        // Convert messages to format needed for voice context
        const initialMessages = messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        const maestroLike = characterToMaestro(character, characterId);
        await connect(maestroLike, { ...connectionInfo, initialMessages });
      } catch (error) {
        logger.error('Voice connection failed', { error: String(error) });
        setConfigError(handleMicrophoneError(error));
      }
    };

    startConnection();
  }, [isVoiceActive, connectionInfo, isConnected, connectionState, character, characterId, connect, messages]);

  // Reset connection attempt when voice deactivates
  useEffect(() => {
    if (!isVoiceActive) hasAttemptedConnection.current = false;
  }, [isVoiceActive]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize conversation
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

      // Greeting is shown in header, not in chat messages
      setMessages([]);
    }

    initConversation();
  }, [characterId, conversations, createConversation]);

  // Handle send message
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

  // Handle tool request
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
        logger.error('Tool request error', undefined, error);
        setMessages((prev) => [...prev, createErrorMessage()]);
        setActiveTool(createErrorToolState(toolType, 'Tool request failed'));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, character, characterId]
  );

  // Handle voice call toggle
  const handleVoiceCall = useCallback(() => {
    if (isVoiceActive) disconnect();
    setIsVoiceActive((prev) => !prev);
  }, [isVoiceActive, disconnect]);

  // Cancel stream handler
  const cancelStream = useCallback(() => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, []);

  // Load a specific conversation by ID
  const loadConversation = useCallback(async (conversationId: string) => {
    conversationIdRef.current = conversationId;
    const serverMessages = await loadMessagesFromServer(conversationId);
    if (serverMessages) {
      setMessages(serverMessages);
    }
  }, []);

  // Clear chat and start a new conversation
  const clearChat = useCallback(async () => {
    setMessages([]);
    const newConvId = await createConversation(characterId);
    conversationIdRef.current = newConvId;
  }, [characterId, createConversation]);

  return {
    messages, input, setInput, isLoading, isVoiceActive, isConnected, connectionState,
    configError, activeTool, setActiveTool, messagesEndRef, handleSend, handleToolRequest,
    handleVoiceCall, isStreaming, streamingEnabled, streamedContent, cancelStream,
    loadConversation, clearChat,
  };
}
