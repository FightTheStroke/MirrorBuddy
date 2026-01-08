import { useState, useRef, useEffect, useCallback } from 'react';
import { useProgressStore, useUIStore } from '@/lib/stores';
import toast from '@/components/ui/toast';
import { generateAutoEvaluation } from './maestro-session-utils';
import { MAESTRI_XP } from '@/lib/constants/xp-rewards';
import { useMaestroVoiceConnection } from './use-maestro-voice-connection';
import { useMaestroChatHandlers } from './use-maestro-chat-handlers';
import { logger } from '@/lib/logger';
import type { Maestro, ChatMessage, ToolCall } from '@/types';

interface UseMaestroSessionLogicProps {
  maestro: Maestro;
  initialMode: 'voice' | 'chat';
}

export function useMaestroSessionLogic({ maestro, initialMode }: UseMaestroSessionLogicProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamRequest, setWebcamRequest] = useState<{ purpose: string; instructions?: string; callId: string } | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  const sessionStartTimeRef = useRef<number | null>(null);
  if (sessionStartTimeRef.current === null) {
    // eslint-disable-next-line react-hooks/purity -- Intentional lazy initialization
    sessionStartTimeRef.current = Date.now();
  }
  const questionCount = useRef(0);
  const previousMessageCountRef = useRef(0);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processedToolsRef = useRef<Set<string>>(new Set());

  const { addXP, endSession } = useProgressStore();
  const { enterFocusMode } = useUIStore();

  const onQuestionAsked = useCallback(() => {
    questionCount.current += 1;
  }, []);

  const onVoiceTranscript = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const voiceConnection = useMaestroVoiceConnection({
    maestro,
    initialMode,
    onTranscript: onVoiceTranscript,
    onQuestionAsked,
  });

  const chatHandlers = useMaestroChatHandlers({
    maestro,
    input,
    setInput,
    isLoading,
    setIsLoading,
    messages,
    setMessages,
    setToolCalls,
    onQuestionAsked,
  });

  // Initialize pending tool request (greeting is now shown in header)
  useEffect(() => {
    setMessages([]);

    const pendingRequest = sessionStorage.getItem('pendingToolRequest');
    if (pendingRequest) {
      try {
        const { tool, maestroId } = JSON.parse(pendingRequest);
        if (maestroId === maestro.id) {
          const toolPrompts: Record<string, string> = {
            mindmap: `Crea una mappa mentale sull'argomento di cui stiamo parlando`,
            quiz: `Crea un quiz per verificare la mia comprensione`,
            flashcards: `Crea delle flashcard per aiutarmi a memorizzare`,
            demo: `Crea una demo interattiva per spiegarmi meglio il concetto`,
          };
          if (toolPrompts[tool]) setInput(toolPrompts[tool]);
          sessionStorage.removeItem('pendingToolRequest');
        }
      } catch {
        sessionStorage.removeItem('pendingToolRequest');
      }
    }

    const timeoutRef = closeTimeoutRef.current;
    return () => {
      if (timeoutRef) clearTimeout(timeoutRef);
    };
  }, [maestro.id]);

  // Auto-switch to focus mode for completed tools
  useEffect(() => {
    const completedTools = toolCalls.filter(
      (tc) => tc.status === 'completed' && !processedToolsRef.current.has(tc.id)
    );

    if (completedTools.length === 0) return;

    const toolCall = completedTools[0];
    processedToolsRef.current.add(toolCall.id);

    const toolTypeMap: Record<string, string> = {
      create_mindmap: 'mindmap',
      create_quiz: 'quiz',
      create_flashcards: 'flashcard',
      create_summary: 'summary',
      create_demo: 'demo',
      create_diagram: 'diagram',
      create_timeline: 'timeline',
      web_search: 'search',
    };
    const mappedToolType = (toolTypeMap[toolCall.type] || 'mindmap') as import('@/types/tools').ToolType;
    const toolContent = toolCall.result?.data || toolCall.result || toolCall.arguments;

    // Set focus mode with tool atomically to prevent race condition
    enterFocusMode({
      toolType: mappedToolType,
      maestroId: maestro.id,
      interactionMode: voiceConnection.isVoiceActive ? 'voice' : 'chat',
      initialTool: {
        id: toolCall.id,
        type: mappedToolType,
        status: 'completed',
        progress: 1,
        content: toolContent,
        createdAt: new Date(),
      },
    });

    logger.debug('[MaestroSession] C-17: Entered focus mode for tool', {
      toolId: toolCall.id,
      toolType: mappedToolType,
    });
  }, [toolCalls, enterFocusMode, maestro.id, voiceConnection.isVoiceActive]);

  const handleEndSession = useCallback(async () => {
    if (voiceConnection.isVoiceActive) {
      voiceConnection.disconnect();
      voiceConnection.setIsVoiceActive(false);
    }
    setSessionEnded(true);

    const sessionDuration = Math.round((Date.now() - (sessionStartTimeRef.current || Date.now())) / 60000);
    const xpEarned = Math.min(
      MAESTRI_XP.MAX_PER_SESSION,
      sessionDuration * MAESTRI_XP.PER_MINUTE + questionCount.current * MAESTRI_XP.PER_QUESTION
    );
    const evaluation = generateAutoEvaluation(questionCount.current, sessionDuration, xpEarned);

    try {
      const response = await fetch('/api/learnings/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: `maestro-${maestro.id}-${Date.now()}`,
          maestroId: maestro.id,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      evaluation.savedToDiary = response.ok;
    } catch (error) {
      logger.warn('Failed to save to diary (non-critical)', { error });
      evaluation.savedToDiary = false;
    }

    setMessages(prev => [...prev, {
      id: `eval-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      type: 'evaluation',
      evaluation,
    }]);

    addXP(xpEarned);
    endSession();

    toast.success(
      `+${xpEarned} XP guadagnati!`,
      `${sessionDuration} minuti di studio, ${questionCount.current} domande fatte. Ottimo lavoro!`,
      { duration: 6000 }
    );
  }, [voiceConnection, maestro.id, messages, addXP, endSession]);

  const clearChatWithReset = useCallback(() => {
    chatHandlers.clearChat();
    questionCount.current = 0;
    setSessionEnded(false);
  }, [chatHandlers]);

  const handleRequestPhoto = useCallback(() => {
    setWebcamRequest({ purpose: 'homework', instructions: 'Mostra il tuo compito', callId: `cam-${Date.now()}` });
    setShowWebcam(true);
  }, []);

  return {
    // State
    messages,
    input,
    setInput,
    isLoading,
    toolCalls,
    showWebcam,
    webcamRequest,
    sessionEnded,
    previousMessageCount: previousMessageCountRef,

    // Voice state (from voice connection hook)
    isVoiceActive: voiceConnection.isVoiceActive,
    configError: voiceConnection.configError,
    isConnected: voiceConnection.isConnected,
    isListening: voiceConnection.isListening,
    isSpeaking: voiceConnection.isSpeaking,
    isMuted: voiceConnection.isMuted,
    inputLevel: voiceConnection.inputLevel,
    outputLevel: voiceConnection.outputLevel,
    connectionState: voiceConnection.connectionState,
    voiceSessionId: voiceConnection.voiceSessionId,
    toggleMute: voiceConnection.toggleMute,

    // Handlers (from chat handlers hook)
    handleVoiceCall: voiceConnection.handleVoiceCall,
    handleEndSession,
    handleSubmit: chatHandlers.handleSubmit,
    clearChat: clearChatWithReset,
    handleWebcamCapture: chatHandlers.handleWebcamCapture,
    requestTool: chatHandlers.requestTool,
    handleRequestPhoto,
    setShowWebcam,
    setWebcamRequest,
  };
}
