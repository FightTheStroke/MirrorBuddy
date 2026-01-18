import { useCallback } from "react";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { getUserId } from "./helpers";
import type { WebcamRequest } from "./types";
import type { StudySession } from "@/lib/stores/progress-store";

interface HandlersProps {
  disconnect: () => void;
  sendText: (text: string) => void;
  sendWebcamResult: (callId: string, imageData: string | null) => void;
  onClose: () => void;
  onSwitchToChat?: () => void;
  conversationIdRef: React.MutableRefObject<string | null>;
  transcript: Array<{ role: string; content: string }>;
  currentSession: StudySession | null;
  sessionStartTime: React.MutableRefObject<Date>;
  questionCount: React.MutableRefObject<number>;
  endSession: () => void;
  setShowGrade: (show: boolean) => void;
  setFinalSessionDuration: (duration: number) => void;
  setFinalQuestionCount: (count: number) => void;
  setSessionSummary: (summary: string | null) => void;
  setShowWebcam: (show: boolean) => void;
  setWebcamRequest: (request: WebcamRequest | null) => void;
}

export function useSessionHandlers({
  disconnect,
  sendText,
  sendWebcamResult,
  onClose,
  onSwitchToChat,
  conversationIdRef,
  transcript,
  currentSession,
  sessionStartTime,
  questionCount,
  endSession,
  setShowGrade,
  setFinalSessionDuration,
  setFinalQuestionCount,
  setSessionSummary,
  setShowWebcam,
  setWebcamRequest,
}: HandlersProps) {
  // Handle webcam capture completion
  const handleWebcamCapture = useCallback(
    (webcamRequest: WebcamRequest | null, imageData: string) => {
      if (webcamRequest) {
        sendWebcamResult(webcamRequest.callId, imageData);
        setShowWebcam(false);
        setWebcamRequest(null);
      }
    },
    [sendWebcamResult, setShowWebcam, setWebcamRequest],
  );

  // Handle webcam close/cancel
  const handleWebcamClose = useCallback(
    (webcamRequest: WebcamRequest | null) => {
      if (webcamRequest) {
        sendWebcamResult(webcamRequest.callId, null);
      }
      setShowWebcam(false);
      setWebcamRequest(null);
    },
    [sendWebcamResult, setShowWebcam, setWebcamRequest],
  );

  // Handle close - show grade first
  const handleClose = useCallback(async () => {
    disconnect();

    // End conversation and generate summary
    if (conversationIdRef.current && transcript.length > 0) {
      const userId = getUserId();
      if (userId) {
        try {
          const response = await csrfFetch(
            `/api/conversations/${conversationIdRef.current}/end`,
            {
              method: "POST",
              body: JSON.stringify({ userId, reason: "explicit" }),
            },
          );
          if (response.ok) {
            const result = await response.json();
            setSessionSummary(result.summary || null);
            logger.info("[VoiceSession] Conversation ended", {
              conversationId: conversationIdRef.current,
              summaryLength: result.summary?.length || 0,
            });
          }
        } catch (error) {
          logger.error("[VoiceSession] Failed to end conversation", {
            error: String(error),
          });
        }
      }
    }

    // Show grade if session was active
    if (currentSession || transcript.length > 0) {
      const durationMinutes = Math.round(
        (Date.now() - sessionStartTime.current.getTime()) / 60000,
      );
      setFinalSessionDuration(durationMinutes);
      setFinalQuestionCount(questionCount.current);
      setShowGrade(true);
    } else {
      onClose();
    }
  }, [
    disconnect,
    onClose,
    currentSession,
    transcript,
    conversationIdRef,
    sessionStartTime,
    questionCount,
    setShowGrade,
    setFinalSessionDuration,
    setFinalQuestionCount,
    setSessionSummary,
  ]);

  // Handle grade close
  const handleGradeClose = useCallback(() => {
    endSession();
    setShowGrade(false);
    onClose();
  }, [endSession, onClose, setShowGrade]);

  // Handle switch to chat
  const handleSwitchToChat = useCallback(() => {
    disconnect();
    onSwitchToChat?.();
  }, [disconnect, onSwitchToChat]);

  // Manual tool trigger
  const triggerManualTool = useCallback(
    (
      toolName: string,
      setWebcamRequest: (req: WebcamRequest) => void,
      setShowWebcam: (show: boolean) => void,
    ) => {
      if (toolName === "capture_homework") {
        setWebcamRequest({
          purpose: "homework",
          instructions: "Mostra il tuo compito o libro",
          callId: `manual-${Date.now()}`,
        });
        setShowWebcam(true);
      } else {
        const toolPrompts: Record<string, string> = {
          mindmap:
            "Usa lo strumento create_mindmap per creare ORA una mappa mentale visiva sull'argomento che stiamo discutendo. Genera i nodi e mostrala.",
          quiz: "Usa lo strumento create_quiz per creare ORA un quiz interattivo con domande a scelta multipla sull'argomento. Genera le domande.",
          flashcard:
            "Usa lo strumento create_flashcards per creare ORA delle flashcard interattive sugli argomenti trattati. Genera le card.",
          search:
            "Usa lo strumento web_search per cercare ORA informazioni aggiornate sull'argomento.",
        };
        if (toolPrompts[toolName]) {
          sendText(toolPrompts[toolName]);
        }
      }
    },
    [sendText],
  );

  return {
    handleWebcamCapture,
    handleWebcamClose,
    handleClose,
    handleGradeClose,
    handleSwitchToChat,
    triggerManualTool,
  };
}
