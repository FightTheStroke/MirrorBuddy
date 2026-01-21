import { useState, useRef, useEffect, useCallback } from "react";
import { useProgressStore } from "@/lib/stores";
import toast from "@/components/ui/toast";
import { generateAutoEvaluation } from "./maestro-session-utils";
import { MAESTRI_XP } from "@/lib/constants/xp-rewards";
import { useMaestroVoiceConnection } from "./use-maestro-voice-connection";
import { useMaestroChatHandlers } from "./use-maestro-chat-handlers";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import type { Maestro, ChatMessage, ToolCall, ToolType } from "@/types";

interface UseMaestroSessionLogicProps {
  maestro: Maestro;
  initialMode: "voice" | "chat";
  requestedToolType?: ToolType;
}

export function useMaestroSessionLogic({
  maestro,
  initialMode,
  requestedToolType,
}: UseMaestroSessionLogicProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamRequest, setWebcamRequest] = useState<{
    purpose: string;
    instructions?: string;
    callId: string;
  } | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  const sessionStartTimeRef = useRef<number | null>(null);
  if (sessionStartTimeRef.current === null) {
    // eslint-disable-next-line react-hooks/purity -- Intentional lazy initialization
    sessionStartTimeRef.current = Date.now();
  }
  const questionCount = useRef(0);
  const previousMessageCountRef = useRef(0);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { addXP, endSession } = useProgressStore();

  const onQuestionAsked = useCallback(() => {
    questionCount.current += 1;
  }, []);

  const onVoiceTranscript = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const voiceConnection = useMaestroVoiceConnection({
    maestro,
    initialMode,
    onTranscript: onVoiceTranscript,
    onQuestionAsked,
    currentMessages: messages,
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

  // Initialize session with contextual greeting based on requested tool
  useEffect(() => {
    const initialMessages: ChatMessage[] = [];

    // Add contextual initial message if a tool was requested from the astuccio
    if (requestedToolType) {
      const contextualGreetings: Record<ToolType, string> = {
        mindmap: `Ciao! Vedo che vuoi creare una mappa mentale. Su quale argomento vorresti lavorare?`,
        quiz: `Ciao! Vuoi creare un quiz per verificare le tue conoscenze. Di quale materia o argomento?`,
        flashcard: `Ciao! Creiamo insieme delle flashcard! Quale argomento vuoi memorizzare?`,
        summary: `Ciao! Vuoi un riassunto. Di quale testo o argomento?`,
        demo: `Ciao! Creiamo una demo interattiva! Quale concetto STEM vuoi esplorare?`,
        search: `Ciao! Cosa vorresti cercare?`,
        pdf: `Ciao! Sono pronto ad aiutarti. Cosa vuoi caricare?`,
        webcam: `Ciao! Sono pronto ad aiutarti. Cosa vuoi fotografare?`,
        homework: `Ciao! Sono pronto ad aiutarti con i compiti. Cosa vuoi caricare?`,
        diagram: `Ciao! Creiamo un diagramma insieme. Quale concetto vuoi visualizzare?`,
        timeline: `Ciao! Creiamo una linea temporale. Quale periodo storico o sequenza di eventi vuoi organizzare?`,
        formula: `Ciao! Vuoi lavorare con le formule. Quale formula matematica o scientifica vuoi esplorare?`,
        calculator: `Ciao! Vuoi fare dei calcoli? Dimmi l'espressione matematica da calcolare!`,
        chart: `Ciao! Creiamo un grafico insieme. Quali dati vuoi visualizzare?`,
        typing: `Ciao! Vuoi imparare a digitare? Ti aiuterò a migliorare la tua velocità e precisione con la tastiera!`,
        "study-kit": `Ciao! Creiamo materiali di studio completi. Carica un PDF per iniziare!`,
      };

      const greeting = contextualGreetings[requestedToolType];
      if (greeting) {
        initialMessages.push({
          id: `initial-${Date.now()}`,
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        });
      }
    }

    setMessages(initialMessages);

    // Handle legacy pendingToolRequest from sessionStorage (backward compatibility)
    const pendingRequest = sessionStorage.getItem("pendingToolRequest");
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
          sessionStorage.removeItem("pendingToolRequest");
        }
      } catch {
        sessionStorage.removeItem("pendingToolRequest");
      }
    }

    const timeoutRef = closeTimeoutRef.current;
    return () => {
      if (timeoutRef) clearTimeout(timeoutRef);
    };
  }, [maestro.id, requestedToolType]);

  // Tools are now displayed inline in the chat instead of opening in fullscreen
  // Removed auto-switch to focus mode - tools remain integrated in the chat interface

  const handleEndSession = useCallback(async () => {
    if (voiceConnection.isVoiceActive) {
      voiceConnection.disconnect();
      voiceConnection.setIsVoiceActive(false);
    }
    setSessionEnded(true);

    const sessionDuration = Math.round(
      (Date.now() - (sessionStartTimeRef.current || Date.now())) / 60000,
    );
    const xpEarned = Math.min(
      MAESTRI_XP.MAX_PER_SESSION,
      sessionDuration * MAESTRI_XP.PER_MINUTE +
        questionCount.current * MAESTRI_XP.PER_QUESTION,
    );
    const evaluation = generateAutoEvaluation(
      questionCount.current,
      sessionDuration,
      xpEarned,
    );

    try {
      const response = await csrfFetch("/api/learnings/extract", {
        method: "POST",
        body: JSON.stringify({
          conversationId: `maestro-${maestro.id}-${Date.now()}`,
          maestroId: maestro.id,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      evaluation.savedToDiary = response.ok;
    } catch (error) {
      logger.warn("Failed to save to diary (non-critical)", { error });
      evaluation.savedToDiary = false;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `eval-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        type: "evaluation",
        evaluation,
      },
    ]);

    addXP(xpEarned);
    endSession();

    toast.success(
      `+${xpEarned} XP guadagnati!`,
      `${sessionDuration} minuti di studio, ${questionCount.current} domande fatte. Ottimo lavoro!`,
      { duration: 6000 },
    );
  }, [voiceConnection, maestro.id, messages, addXP, endSession]);

  const clearChatWithReset = useCallback(() => {
    chatHandlers.clearChat();
    questionCount.current = 0;
    setSessionEnded(false);
  }, [chatHandlers]);

  const handleRequestPhoto = useCallback(() => {
    setWebcamRequest({
      purpose: "homework",
      instructions: "Mostra il tuo compito",
      callId: `cam-${Date.now()}`,
    });
    setShowWebcam(true);
  }, []);

  // Load a specific conversation by ID from the server
  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const loadedMessages: ChatMessage[] = data.map(
          (m: {
            id: string;
            role: string;
            content: string;
            createdAt: string;
          }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.createdAt),
          }),
        );
        setMessages(loadedMessages);
        setSessionEnded(false);
      }
    } catch (error) {
      logger.error("Failed to load conversation", { conversationId }, error);
    }
  }, []);

  // Wrap webcam capture to also close the modal after processing
  const handleWebcamCaptureWithClose = useCallback(
    (imageData: string) => {
      chatHandlers.handleWebcamCapture(imageData);
      setShowWebcam(false);
      setWebcamRequest(null);
    },
    [chatHandlers],
  );

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
    handleWebcamCapture: handleWebcamCaptureWithClose,
    requestTool: chatHandlers.requestTool,
    handleRequestPhoto,
    setShowWebcam,
    setWebcamRequest,
    loadConversation,
  };
}
