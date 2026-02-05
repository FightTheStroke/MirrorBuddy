"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ErrorBoundary } from "@/components/error-boundary";
import { Card } from "@/components/ui/card";
import { useVoiceSession } from "@/lib/hooks/use-voice-session";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useProgressStore } from "@/lib/stores";
import { logger } from "@/lib/logger";
import {
  PermissionErrorView,
  ConfigErrorView,
  SessionHeader,
  SessionVisualization,
  SessionTranscript,
  SessionTools,
  SessionControls,
  SessionOverlays,
  useSessionEffects,
  useConnection,
  useSessionHandlers,
  calculateXpProgress,
  getStateText,
  calculateSessionXP,
} from "./voice-session/";
import type { VoiceSessionProps, WebcamRequest } from "./voice-session/";

export function VoiceSession({
  maestro,
  onClose,
  onSwitchToChat,
}: VoiceSessionProps) {
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamRequest, setWebcamRequest] = useState<WebcamRequest | null>(
    null,
  );
  const [showGrade, setShowGrade] = useState(false);
  const [finalSessionDuration, setFinalSessionDuration] = useState(0);
  const [finalQuestionCount, setFinalQuestionCount] = useState(0);
  const [, setSessionSummary] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const {
    permissions,
    requestMicrophone,
    isLoading: permissionsLoading,
  } = usePermissions();
  const { currentSession, endSession, xp, level } = useProgressStore();

  const {
    isConnected,
    isListening,
    isSpeaking,
    isMuted,
    transcript,
    toolCalls,
    inputLevel,
    outputLevel,
    connectionState,
    inputAnalyser,
    connect,
    disconnect,
    toggleMute,
    sendText,
    cancelResponse,
    clearToolCalls,
    sendWebcamResult,
    sessionId: voiceSessionId,
    videoEnabled,
    toggleVideo,
    videoStream,
    videoFramesSent,
    videoElapsedSeconds,
    videoMaxSeconds,
    videoLimitReached,
  } = useVoiceSession({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Voice error", { message });
    },
    onTranscript: (role, text) => {
      logger.debug("Transcript", { role, text: text.substring(0, 100) });
    },
    onWebcamRequest: (request) => {
      logger.debug("Webcam requested", { purpose: request.purpose });
      setWebcamRequest(request);
      setShowWebcam(true);
    },
  });

  const { sessionStartTime, questionCount, conversationIdRef } =
    useSessionEffects({
      maestro,
      isConnected,
      transcript,
      toolCalls,
      onSetElapsedSeconds: setElapsedSeconds,
    });

  const { configError } = useConnection({
    maestro,
    connect,
    isConnected,
    connectionState,
    permissionsMicrophone: permissions.microphone,
    permissionsLoading,
    onPermissionError: setPermissionError,
  });

  const {
    handleWebcamCapture,
    handleWebcamClose,
    handleClose,
    handleGradeClose,
    handleSwitchToChat,
    triggerManualTool,
  } = useSessionHandlers({
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
  });

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [handleClose]);

  const stateText = getStateText(
    configError,
    permissionsLoading,
    connectionState,
    isListening,
    isSpeaking,
    isConnected,
    maestro.displayName,
  );

  if (permissionError) {
    return (
      <PermissionErrorView
        error={permissionError}
        onRetry={async () => {
          const granted = await requestMicrophone();
          if (granted) setPermissionError(null);
        }}
        onSwitchToChat={onSwitchToChat}
        onClose={onClose}
      />
    );
  }

  if (configError) {
    return (
      <ConfigErrorView
        error={configError}
        onSwitchToChat={onSwitchToChat}
        onClose={onClose}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl mx-4"
        >
          <Card className="bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700 text-white overflow-hidden">
            <SessionHeader
              maestro={maestro}
              isConnected={isConnected}
              elapsedSeconds={elapsedSeconds}
              level={level}
              xp={xp}
              xpProgress={calculateXpProgress(xp, level)}
              onClose={handleClose}
            />

            <SessionVisualization
              maestro={maestro}
              isListening={isListening}
              isSpeaking={isSpeaking}
              inputLevel={inputLevel}
              outputLevel={outputLevel}
              inputAnalyser={inputAnalyser}
              stateText={stateText}
              connectionState={connectionState}
            />

            <SessionTranscript maestro={maestro} transcript={transcript} />

            <SessionTools
              toolCalls={toolCalls}
              sessionId={voiceSessionId}
              onClearToolCalls={clearToolCalls}
              onTriggerTool={(name: string) =>
                triggerManualTool(name, setWebcamRequest, setShowWebcam)
              }
            />

            <SessionControls
              isMuted={isMuted}
              isSpeaking={isSpeaking}
              videoEnabled={videoEnabled}
              videoLimitReached={videoLimitReached}
              onToggleMute={toggleMute}
              onToggleVideo={toggleVideo}
              onCancelResponse={cancelResponse}
              onSendText={sendText}
              onSwitchToChat={handleSwitchToChat}
              onClose={handleClose}
            />
          </Card>
        </motion.div>

        <SessionOverlays
          videoEnabled={videoEnabled}
          videoStream={videoStream}
          videoElapsedSeconds={videoElapsedSeconds}
          videoFramesSent={videoFramesSent}
          videoMaxSeconds={videoMaxSeconds}
          onVideoStop={toggleVideo}
          showWebcam={showWebcam}
          webcamRequest={webcamRequest}
          onWebcamCapture={handleWebcamCapture}
          onWebcamClose={handleWebcamClose}
          showGrade={showGrade}
          maestro={maestro}
          sessionDuration={finalSessionDuration}
          questionsAsked={finalQuestionCount}
          xpEarned={calculateSessionXP(currentSession, transcript.length)}
          onGradeClose={handleGradeClose}
        />
      </div>
    </ErrorBoundary>
  );
}
